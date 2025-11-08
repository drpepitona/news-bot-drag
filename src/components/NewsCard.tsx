import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  sentiment: "positive" | "negative" | "neutral";
  time: string;
  source: string;
  imageUrl?: string;
  url?: string;
  region: string;
}

interface NewsCardProps {
  news: NewsItem;
  onDragStart: (e: React.DragEvent, news: NewsItem) => void;
}

export const NewsCard = ({ news, onDragStart }: NewsCardProps) => {
  const handleClick = (e: React.MouseEvent) => {
    // Only open link if not dragging
    if (news.url && e.button === 0) {
      window.open(news.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, news)}
      onClick={handleClick}
      className="p-6 cursor-pointer active:cursor-grabbing hover:shadow-gold-glow transition-all duration-300 border-border bg-card hover:bg-black-elevated group overflow-hidden"
    >
      <div className="flex flex-col gap-4">
        {news.imageUrl && (
          <div className="w-full h-48 rounded-lg overflow-hidden border border-gold-dark/30">
            <img 
              src={news.imageUrl} 
              alt={news.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-black-elevated border-gold-dark/30 text-gold-light">
              {news.category}
            </Badge>
            {news.sentiment === "positive" && (
              <TrendingUp className="h-4 w-4 text-green-400" />
            )}
            {news.sentiment === "negative" && (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground line-clamp-3 group-hover:text-gold-light transition-colors leading-relaxed">
            {news.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{news.time}</span>
            <span>•</span>
            <span className="truncate">{news.source}</span>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Card>
  );
};
