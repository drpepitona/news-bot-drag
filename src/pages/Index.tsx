import { useState } from "react";
import { NewsPanel } from "@/components/NewsPanel";
import { NewsSearchBar } from "@/components/NewsSearchBar";
import { ChatInterface } from "@/components/ChatInterface";
import { NewsItem } from "@/components/NewsCard";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const ChatSidebar = ({ 
  onDrop, 
  onDragOver, 
  droppedNews 
}: { 
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  droppedNews: NewsItem[];
}) => {
  const { open } = useSidebar();
  
  return (
    <>
      {/* Lengueta dorada que se mueve con el sidebar */}
      <SidebarTrigger 
        className={`
          fixed top-1/2 -translate-y-1/2 z-20 
          bg-gradient-gold hover:opacity-90 transition-all duration-300
          rounded-l-lg shadow-elegant px-3 py-6 
          border-l-2 border-t-2 border-b-2 border-gold-dark/30
          ${open ? 'right-[var(--sidebar-width)]' : 'right-0'}
        `}
      >
        <MessageSquare className="h-5 w-5 text-black" />
      </SidebarTrigger>
      
      <Sidebar side="right" className="border-l border-gold-dark/20">
        <SidebarContent className="h-full">
          <ChatInterface
            onDrop={onDrop}
            onDragOver={onDragOver}
            droppedNews={droppedNews}
          />
        </SidebarContent>
      </Sidebar>
    </>
  );
};

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
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <ChatSidebar
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          droppedNews={droppedNews}
        />
        
        <main className="flex-1 flex flex-col">
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
      </div>
    </SidebarProvider>
  );
};

export default Index;
