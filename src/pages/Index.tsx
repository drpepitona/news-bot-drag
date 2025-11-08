import { useState } from "react";
import { NewsPanel } from "@/components/NewsPanel";
import { ChatInterface } from "@/components/ChatInterface";
import { NewsItem } from "@/components/NewsCard";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [draggedNews, setDraggedNews] = useState<NewsItem | null>(null);
  const [droppedNews, setDroppedNews] = useState<NewsItem[]>([]);
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent, news: NewsItem) => {
    setDraggedNews(news);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedNews) {
      setDroppedNews([...droppedNews, draggedNews]);
      toast({
        title: "Noticia añadida",
        description: "La noticia ha sido añadida al chat para análisis.",
      });
      setDraggedNews(null);
    }
  };

  return (
    <div className="h-screen w-full bg-background overflow-hidden">
      <div className="h-full grid grid-cols-1 lg:grid-cols-[400px,1fr]">
        <NewsPanel onDragStart={handleDragStart} />
        <ChatInterface
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          droppedNews={droppedNews}
        />
      </div>
    </div>
  );
};

export default Index;
