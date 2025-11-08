import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { NewsCard, NewsItem } from "./NewsCard";
import { RefreshCw, Globe2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewsPanelProps {
  onDragStart: (e: React.DragEvent, news: NewsItem) => void;
  searchQuery: string;
  region: string;
  category: string;
  onRegionChange: (region: string) => void;
  onCategoryChange: (category: string) => void;
}

export const NewsPanel = ({ 
  onDragStart, 
  searchQuery, 
  region, 
  category,
  onRegionChange,
  onCategoryChange 
}: NewsPanelProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchNews = async (selectedRegion: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-news', {
        body: { 
          region: selectedRegion
        }
      });

      if (error) throw error;

      const articles = data.articles.map((article: any, index: number) => ({
        id: `${selectedRegion}-${index}-${Date.now()}`,
        ...article
      }));

      setNews(articles);
      setFilteredNews(articles);
      
      toast({
        title: "Noticias actualizadas",
        description: `Se cargaron ${articles.length} noticias de ${getRegionName(selectedRegion)}`,
      });
    } catch (error) {
      console.error('Error fetching news:', error);
      setNews([]);
      toast({
        title: "Error al cargar noticias",
        description: "No se pudieron obtener las noticias de NewsData.io",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = news;
    
    // Filter by category
    if (category !== "all") {
      filtered = filtered.filter(item => item.category === category);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.source.toLowerCase().includes(query)
      );
    }
    
    setFilteredNews(filtered);
  }, [category, news, searchQuery]);


  useEffect(() => {
    fetchNews(region);
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchNews(region);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [region]);

  const getRegionName = (reg: string) => {
    const names: Record<string, string> = {
      'all': 'Todo el mundo',
      'us': 'Estados Unidos',
      'china': 'China',
      'asia': 'Asia',
      'europe': 'Europa'
    };
    return names[reg] || reg;
  };
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border space-y-3 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fetchNews(region)}
            disabled={loading}
            className="hover:bg-gold-dark/10"
          >
            <RefreshCw className={`h-5 w-5 text-gold-light ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <div className="flex-1 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-muted-foreground" />
            <Select value={region} onValueChange={onRegionChange}>
              <SelectTrigger className="flex-1 bg-black-elevated border-border h-9">
                <SelectValue placeholder="Región" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">🌍 Todas</SelectItem>
                <SelectItem value="us">🇺🇸 EE.UU.</SelectItem>
                <SelectItem value="china">🇨🇳 China</SelectItem>
                <SelectItem value="asia">🌏 Asia</SelectItem>
                <SelectItem value="europe">🇪🇺 Europa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="flex-1 bg-black-elevated border-border h-9">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">📊 Todas</SelectItem>
                <SelectItem value="Acciones">📈 Acciones</SelectItem>
                <SelectItem value="Forex">💱 Forex</SelectItem>
                <SelectItem value="Materias Primas">🥇 Materias</SelectItem>
                <SelectItem value="Energía">⚡ Energía</SelectItem>
                <SelectItem value="Bonos">📄 Bonos</SelectItem>
                <SelectItem value="Mercados">💼 Mercados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {loading && filteredNews.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-8 w-8 text-gold-light animate-spin" />
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-muted-foreground text-sm">No hay noticias disponibles</p>
            <p className="text-muted-foreground text-xs mt-2">
              {searchQuery ? "Intenta con otros términos de búsqueda" : 
               category !== "all" ? "Intenta cambiar el filtro de categoría" : "Intenta cambiar la región"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredNews.map((item) => (
              <NewsCard key={item.id} news={item} onDragStart={onDragStart} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
