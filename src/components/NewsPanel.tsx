import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { NewsCard, NewsItem } from "./NewsCard";
import { Newspaper, RefreshCw, Globe2 } from "lucide-react";
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
}

export const NewsPanel = ({ onDragStart }: NewsPanelProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState<string>("all");
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
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="p-6 border-b border-border space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-black-elevated border border-gold-dark/30 flex items-center justify-center">
            <Newspaper className="h-5 w-5 text-gold-light" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Noticias del Mercado</h2>
            <p className="text-xs text-muted-foreground">Arrastra al chat para analizar</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fetchNews(region)}
            disabled={loading}
            className="hover:bg-gold-dark/10"
          >
            <RefreshCw className={`h-4 w-4 text-gold-light ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-muted-foreground" />
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="flex-1 bg-black-elevated border-border">
              <SelectValue placeholder="Seleccionar región" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">🌍 Todo el mundo</SelectItem>
              <SelectItem value="us">🇺🇸 Estados Unidos</SelectItem>
              <SelectItem value="china">🇨🇳 China</SelectItem>
              <SelectItem value="asia">🌏 Asia</SelectItem>
              <SelectItem value="europe">🇪🇺 Europa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        {loading && news.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-8 w-8 text-gold-light animate-spin" />
          </div>
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-muted-foreground text-sm">No hay noticias disponibles</p>
            <p className="text-muted-foreground text-xs mt-2">Intenta cambiar la región o el rango de fechas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {news.map((item) => (
              <NewsCard key={item.id} news={item} onDragStart={onDragStart} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
