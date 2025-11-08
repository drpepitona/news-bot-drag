import { useState } from "react";
import { NewsPanel } from "@/components/NewsPanel";
import { ChatInterface } from "@/components/ChatInterface";
import { NewsItem } from "@/components/NewsCard";
import { useToast } from "@/components/ui/use-toast";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

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
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <NewsPanel onDragStart={handleDragStart} />
        </ResizablePanel>
        
        <ResizableHandle className="w-1 bg-gold-dark/20 hover:bg-gradient-gold transition-all" />
        
        <ResizablePanel defaultSize={70} minSize={50}>
          <ChatInterface
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            droppedNews={droppedNews}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
