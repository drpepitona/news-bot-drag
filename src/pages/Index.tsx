import { useState } from "react";
import { NewsPanel } from "@/components/NewsPanel";
import { NewsSearchBar } from "@/components/NewsSearchBar";
import { ChatInterface } from "@/components/ChatInterface";
import { NewsItem } from "@/components/NewsCard";
import { useToast } from "@/components/ui/use-toast";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";


const Index = () => {
  const [draggedNews, setDraggedNews] = useState<NewsItem | null>(null);
  const [droppedNews, setDroppedNews] = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
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
    <div className="h-screen flex w-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        {/* Panel del Chat - Redimensionable */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={60}>
          <div className="h-full border-r border-gold-dark/20">
            <ChatInterface
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              droppedNews={droppedNews}
            />
          </div>
        </ResizablePanel>

        {/* Handle para redimensionar */}
        <ResizableHandle withHandle className="w-1 bg-gold-dark/20 hover:bg-gold-dark/40 transition-colors" />

        {/* Panel de Noticias */}
        <ResizablePanel defaultSize={70} minSize={40}>
          <main className="flex flex-col h-full">
            {/* Header con barra de búsqueda */}
            <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
              <div className="flex items-center gap-4 p-4">
                <NewsSearchBar 
                  value={searchQuery} 
                  onChange={setSearchQuery} 
                />
              </div>
            </header>

            {/* Panel de noticias - área principal */}
            <div className="flex-1 overflow-hidden">
              <NewsPanel 
                onDragStart={handleDragStart}
                searchQuery={searchQuery}
                region={region}
                category={category}
                onRegionChange={setRegion}
                onCategoryChange={setCategory}
              />
            </div>
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
