import { createAdapterFactory, type CleanedWhere } from "better-auth/adapters";
import { Timestamp, type DocumentData, type Query } from "firebase-admin/firestore";
import { getDb } from "@/DATABASE/firebase";

// better-auth adapter backed by Cloud Firestore. Each better-auth model
// (user, session, account, verification) is a collection keyed by the
// record's id. Plain AND-ed equality filters run in Firestore (no composite
// indexes needed); anything else — OR, ranges, case-insensitive matches,
// sorting, paging — is applied in memory to that already-narrowed result,
// which is small for every query better-auth makes.

type Row = Record<string, unknown>;

const fromFirestore = (data: DocumentData): Row =>
    Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v instanceof Timestamp ? v.toDate() : v]));

const lower = (v: unknown) => (typeof v === "string" ? v.toLowerCase() : v);

const matches = (row: Row, clause: CleanedWhere) => {
    const insensitive = clause.mode === "insensitive";
    const norm = (v: unknown) => (insensitive ? lower(v) : v);
    const field = norm(row[clause.field]);
    const value = Array.isArray(clause.value) ? clause.value.map(norm) : norm(clause.value);
    const cmp = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() - b.getTime() : a === b ? 0 : (a as number) < (b as number) ? -1 : 1);

    switch (clause.operator) {
        case "in": return Array.isArray(value) && value.includes(field);
        case "not_in": return Array.isArray(value) && !value.includes(field);
        case "contains": return typeof field === "string" && field.includes(String(value));
        case "starts_with": return typeof field === "string" && field.startsWith(String(value));
        case "ends_with": return typeof field === "string" && field.endsWith(String(value));
        case "ne": return field !== value;
        case "gt": return value != null && field != null && cmp(field, value) > 0;
        case "gte": return value != null && field != null && cmp(field, value) >= 0;
        case "lt": return value != null && field != null && cmp(field, value) < 0;
        case "lte": return value != null && field != null && cmp(field, value) <= 0;
        default:
            if (value === null) return field == null;
            return field instanceof Date && value instanceof Date ? field.getTime() === value.getTime() : field === value;
    }
};

const matchesAll = (row: Row, where: CleanedWhere[]) => {
    if (where.length === 0) return true;
    let result = matches(row, where[0]);
    for (const clause of where.slice(1)) {
        result = clause.connector === "OR" ? result || matches(row, clause) : result && matches(row, clause);
    }
    return result;
};

// Returns every row matching `where`, with Firestore doc refs.
const query = async (model: string, where: CleanedWhere[] = []) => {
    const collection = getDb().collection(model);
    const allAnd = where.every((c, i) => i === 0 || c.connector !== "OR");

    // Fast path: lookup by id.
    const idClause = allAnd && where.find((c) => c.field === "id" && c.operator === "eq" && typeof c.value === "string");
    if (idClause) {
        const snap = await collection.doc(idClause.value as string).get();
        if (!snap.exists) return [];
        const row = fromFirestore(snap.data()!);
        return matchesAll(row, where) ? [{ ref: snap.ref, row }] : [];
    }

    let q: Query = collection;
    if (allAnd) {
        for (const c of where) {
            const pushable = c.operator === "eq" && c.mode !== "insensitive" && c.value !== null && !Array.isArray(c.value);
            if (pushable) q = q.where(c.field, "==", c.value);
        }
    }

    const snap = await q.get();
    return snap.docs
        .map((doc) => ({ ref: doc.ref, row: fromFirestore(doc.data()) }))
        .filter(({ row }) => matchesAll(row, where));
};

const sortRows = (rows: Row[], sortBy?: { field: string; direction: "asc" | "desc" }) => {
    if (!sortBy) return rows;
    const dir = sortBy.direction === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
        const x = a[sortBy.field];
        const y = b[sortBy.field];
        if (x == null && y == null) return 0;
        if (x == null) return -dir;
        if (y == null) return dir;
        const xv = x instanceof Date ? x.getTime() : (x as number | string);
        const yv = y instanceof Date ? y.getTime() : (y as number | string);
        return xv < yv ? -dir : xv > yv ? dir : 0;
    });
};

const pick = (row: Row, select?: string[]) =>
    select?.length ? Object.fromEntries(Object.entries(row).filter(([k]) => select.includes(k))) : row;

// Firestore batches are capped at 500 writes.
const inBatches = async <T>(items: T[], apply: (batch: FirebaseFirestore.WriteBatch, item: T) => void) => {
    for (let i = 0; i < items.length; i += 450) {
        const batch = getDb().batch();
        items.slice(i, i + 450).forEach((item) => apply(batch, item));
        await batch.commit();
    }
};

export const firestoreAdapter = () =>
    createAdapterFactory({
        config: {
            adapterId: "firestore",
            adapterName: "Firestore Adapter",
            supportsDates: true,
            supportsBooleans: true,
            supportsJSON: false,
            supportsArrays: true,
            supportsNumericIds: false,
            transaction: false,
        },
        adapter: () => ({
            create: async ({ model, data }) => {
                const row = data as Row;
                await getDb().collection(model).doc(String(row.id)).set(row);
                return data;
            },
            findOne: async ({ model, where, select }) => {
                const [hit] = await query(model, where);
                return hit ? (pick(hit.row, select) as never) : null;
            },
            findMany: async ({ model, where, limit, offset, sortBy, select }) => {
                const rows = sortRows((await query(model, where)).map((h) => h.row), sortBy);
                const start = offset ?? 0;
                return rows.slice(start, limit ? start + limit : undefined).map((r) => pick(r, select)) as never[];
            },
            count: async ({ model, where }) => (await query(model, where)).length,
            update: async ({ model, where, update }) => {
                const [hit] = await query(model, where);
                if (!hit) return null;
                await hit.ref.update(update as Row);
                return { ...hit.row, ...(update as Row) } as never;
            },
            updateMany: async ({ model, where, update }) => {
                const hits = await query(model, where);
                await inBatches(hits, (batch, hit) => batch.update(hit.ref, update));
                return hits.length;
            },
            delete: async ({ model, where }) => {
                const [hit] = await query(model, where);
                if (hit) await hit.ref.delete();
            },
            deleteMany: async ({ model, where }) => {
                const hits = await query(model, where);
                await inBatches(hits, (batch, hit) => batch.delete(hit.ref));
                return hits.length;
            },
            // Atomically read-and-delete (used for single-use verification
            // tokens), so the same token can't be consumed twice.
            consumeOne: async ({ model, where }) => {
                const [hit] = await query(model, where);
                if (!hit) return null;
                return getDb().runTransaction(async (tx) => {
                    const snap = await tx.get(hit.ref);
                    if (!snap.exists) return null;
                    tx.delete(hit.ref);
                    return fromFirestore(snap.data()!) as never;
                });
            },
        }),
    });
