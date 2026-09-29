import { Building2, Globe, MapPin, Users } from 'lucide-react';

const CompanyProfile = ({ overview }: { overview: CompanyOverview | null }) => {
    const p = overview?.profile;
    if (!p || (!p.summary && !p.sector)) {
        return <p className="text-sm text-gray-500">Company profile isn&apos;t available for this symbol.</p>;
    }

    const website = p.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const facts = [
        { icon: Building2, label: 'Sector', value: [p.sector, p.industry].filter(Boolean).join(' · ') },
        { icon: Users, label: 'Employees', value: p.employees?.toLocaleString('en-IN') },
        { icon: MapPin, label: 'Headquarters', value: [p.city, p.country].filter(Boolean).join(', ') },
    ].filter((f) => f.value);

    return (
        <div className="flex flex-col gap-4">
            <dl className="grid gap-3 text-sm">
                {facts.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-2">
                        <Icon className="mt-0.5 size-4 shrink-0 text-gray-500" aria-hidden />
                        <dt className="sr-only">{label}</dt>
                        <dd className="text-gray-300">{value}</dd>
                    </div>
                ))}
                {website && p.website && (
                    <div className="flex items-start gap-2">
                        <Globe className="mt-0.5 size-4 shrink-0 text-gray-500" aria-hidden />
                        <dt className="sr-only">Website</dt>
                        <dd>
                            <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline">
                                {website}
                            </a>
                        </dd>
                    </div>
                )}
            </dl>

            {p.summary && (
                <details className="group text-sm leading-relaxed text-gray-400">
                    <summary className="cursor-pointer list-none">
                        <span className="line-clamp-4 group-open:line-clamp-none">{p.summary}</span>
                        <span className="mt-1 inline-block text-xs text-yellow-500 group-open:hidden">Read more</span>
                    </summary>
                </details>
            )}
        </div>
    );
};

export default CompanyProfile;
