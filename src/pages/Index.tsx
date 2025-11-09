import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { NewsPanel } from "@/components/NewsPanel";
import { NewsSearchBar } from "@/components/NewsSearchBar";
import { ChatInterface } from "@/components/ChatInterface";
import { NewsItem } from "@/components/NewsCard";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";


const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [draggedNews, setDraggedNews] = useState<NewsItem | null>(null);
  const [droppedNews, setDroppedNews] = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();

  // Verificar autenticación (sin redireccionar automáticamente)
  useEffect(() => {
    // Configurar listener de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleChat = () => {
    if (isChatVisible) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsChatVisible(false);
        setIsAnimating(false);
      }, 300);
    } else {
      setIsChatVisible(true);
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }
  };

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

  const handleAuthAction = () => {
    if (session) {
      // Si está logueado, cerrar sesión
      supabase.auth.signOut();
    } else {
      // Si no está logueado, ir a página de auth
      navigate("/auth");
    }
  };

  return (
    <div className="h-screen flex w-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        {/* Panel del Chat - Redimensionable */}
        {(isChatVisible || isAnimating) && (
          <>
            <ResizablePanel 
              defaultSize={30} 
              minSize={20} 
              maxSize={60}
              className="transition-all duration-300 ease-out"
            >
              <div className={`h-full border-r border-gold-dark/20 ${
                isAnimating && !isChatVisible 
                  ? "animate-slide-out-left" 
                  : isChatVisible 
                    ? "animate-slide-in-left" 
                    : ""
              }`}>
                <ChatInterface
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  droppedNews={droppedNews}
                />
              </div>
            </ResizablePanel>

            {/* Handle para redimensionar */}
            <ResizableHandle withHandle className="w-1 bg-gold-dark/20 hover:bg-gold-dark/40 transition-colors" />
          </>
        )}

        {/* Panel de Noticias */}
        <ResizablePanel defaultSize={isChatVisible ? 70 : 100} minSize={40}>
          <main className="flex flex-col h-full">
            {/* Header con barra de búsqueda */}
            <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
              <div className="flex items-center gap-4 p-4">
                <Button
                  onClick={toggleChat}
                  className="bg-gradient-gold hover:opacity-90 transition-opacity shadow-elegant text-black h-10 w-10 p-0 rounded-lg"
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
                <NewsSearchBar 
                  value={searchQuery} 
                  onChange={setSearchQuery} 
                />
                <Button
                  onClick={handleAuthAction}
                  variant="outline"
                  className="ml-auto"
                  size="sm"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {session ? "Salir" : "Registrarte"}
                </Button>
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
