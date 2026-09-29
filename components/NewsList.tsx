import { Newspaper } from "lucide-react";
import NewsImage from "@/components/NewsImage";

const formatDate = (unixSeconds: number) =>
    new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

// Publishers often reuse their logo as the "image" for every article
// instead of a real photo. A URL that repeats across multiple articles in
// the same batch is almost certainly one of those generic logos, so we
// treat it as "no real image".
const countImageOccurrences = (news: MarketNewsArticle[]) => {
    const counts = new Map<string, number>();
    for (const article of news) {
        if (article.image) counts.set(article.image, (counts.get(article.image) ?? 0) + 1);
    }
    return counts;
};

const NewsList = ({
    news = [],
    emptyMessage = 'No market news available right now. Please check back later.',
    compact = false,
}: WatchlistNewsProps & { compact?: boolean }) => {
    if (news.length === 0) {
        return <p className="text-base text-gray-500">{emptyMessage}</p>;
    }

    const imageCounts = countImageOccurrences(news);

    return (
        <div className={compact ? 'flex flex-col divide-y divide-gray-700' : 'watchlist-news'}>
            {news.map((article) => {
                const isGenericImage = !!article.image && (imageCounts.get(article.image) ?? 0) > 1;
                const hasImage = !!article.image && !isGenericImage;

                return (
                    <a
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={compact ? 'group flex flex-col gap-1.5 py-3 first:pt-0' : 'news-item flex flex-col gap-3'}
                    >
                        {!compact && <NewsImage src={article.image} alt={article.headline} showFallback={isGenericImage} />}

                        {article.related && !compact && <span className="news-tag">{article.related}</span>}

                        <div className={compact ? 'flex items-center gap-1.5 text-xs text-gray-500' : 'news-meta flex items-center gap-1.5'}>
                            {!hasImage && !compact && <Newspaper className="size-3.5 shrink-0 text-gray-600" />}
                            {article.source} · {formatDate(article.datetime)}
                        </div>
                        <h3 className={compact ? 'text-sm font-medium leading-snug text-gray-100 group-hover:text-yellow-500' : 'news-title'}>{article.headline}</h3>
                        {!compact && <span className="news-cta">Read full article &rarr;</span>}
                    </a>
                );
            })}
        </div>
    );
};

export default NewsList;
