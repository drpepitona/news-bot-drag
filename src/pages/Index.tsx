import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { NewsPanel } from "@/components/NewsPanel";
import { NewsSearchBar } from "@/components/NewsSearchBar";
import { ChatInterface } from "@/components/ChatInterface";
import { NewsItem } from "@/components/NewsCard";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, UserPlus, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [session, setSession] = useState<Session | null>(null);
  const [draggedNews, setDraggedNews] = useState<NewsItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mobileView, setMobileView] = useState<"news" | "chat">("news");
  const { toast } = useToast();

  // Verificar autenticación (sin redireccionar automáticamente)
  useEffect(() => {
    // Configurar listener de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

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

  const handleDrop = (draggedNewsItem: NewsItem | null) => {
    setDraggedNews(draggedNewsItem);
  };

  const handleAnalyzeNews = (news: NewsItem) => {
    setDraggedNews(news);
    if (isMobile) {
      setMobileView("chat");
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
      {isMobile ? (
        /* Vista móvil - Una sola vista a la vez */
        <div className="flex flex-col h-full w-full">
          {/* Header con navegación móvil */}
          <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 p-4">
              {mobileView === "news" ? (
                <>
                  <NewsSearchBar value={searchQuery} onChange={setSearchQuery} />
                  <Button
                    onClick={() => setMobileView("chat")}
                    className="bg-gradient-gold hover:opacity-90 transition-opacity shadow-elegant text-black h-10 w-10 p-0 rounded-lg flex-shrink-0"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setMobileView("news")}
                    variant="outline"
                    className="h-10 w-10 p-0 flex-shrink-0"
                  >
                    <Newspaper className="h-5 w-5" />
                  </Button>
                  <h2 className="text-lg font-semibold">Chat</h2>
                  <Button onClick={handleAuthAction} variant="outline" className="ml-auto" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {session ? "Salir" : "Registrarte"}
                  </Button>
                </>
              )}
            </div>
          </header>

          {/* Contenido móvil */}
          <div className="flex-1 overflow-hidden">
            {mobileView === "news" ? (
              <NewsPanel
                onDragStart={handleDragStart}
                searchQuery={searchQuery}
                region={region}
                category={category}
                onRegionChange={setRegion}
                onCategoryChange={setCategory}
                onAnalyzeNews={handleAnalyzeNews}
              />
            ) : (
              <ChatInterface
                onDragOver={handleDragOver}
                draggedNews={draggedNews}
                onDrop={handleDrop}
                onAuthRequired={() => navigate("/auth")}
              />
            )}
          </div>
        </div>
      ) : (
        /* Vista desktop - Panel redimensionable */
        <ResizablePanelGroup direction="horizontal" className="w-full">
          {/* Panel del Chat - Redimensionable */}
          {(isChatVisible || isAnimating) && (
            <>
              <ResizablePanel defaultSize={30} minSize={20} maxSize={60} className="transition-all duration-300 ease-out">
                <div
                  className={`h-full border-r border-gold-dark/20 ${
                    isAnimating && !isChatVisible
                      ? "animate-slide-out-left"
                      : isChatVisible
                        ? "animate-slide-in-left"
                        : ""
                  }`}
                >
                  <ChatInterface
                    onDragOver={handleDragOver}
                    draggedNews={draggedNews}
                    onDrop={handleDrop}
                    onAuthRequired={() => navigate("/auth")}
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
                  <NewsSearchBar value={searchQuery} onChange={setSearchQuery} />
                  <Button onClick={handleAuthAction} variant="outline" className="ml-auto" size="sm">
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
                  onAnalyzeNews={handleAnalyzeNews}
                />
              </div>
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
};

export default Index;
