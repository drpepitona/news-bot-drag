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
}

interface NewsCardProps {
  news: NewsItem;
  onDragStart: (e: React.DragEvent, news: NewsItem) => void;
}

export const NewsCard = ({ news, onDragStart }: NewsCardProps) => {
  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, news)}
      className="p-4 cursor-grab active:cursor-grabbing hover:shadow-gold-glow transition-all duration-300 border-border bg-card hover:bg-black-elevated group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
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
          <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-2">
            {news.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{news.time}</span>
            <span>•</span>
            <span>{news.source}</span>
          </div>
        </div>
        <div className="h-8 w-1 bg-gradient-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Card>
  );
};
