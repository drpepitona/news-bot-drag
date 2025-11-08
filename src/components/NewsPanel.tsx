import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { NewsCard, NewsItem } from "./NewsCard";
import { Newspaper, RefreshCw, Globe2, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format, subMonths } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface NewsPanelProps {
  onDragStart: (e: React.DragEvent, news: NewsItem) => void;
}

export const NewsPanel = ({ onDragStart }: NewsPanelProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>(subMonths(new Date(), 1));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const { toast } = useToast();

  const fetchNews = async (selectedRegion: string, from: Date, to: Date) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-news', {
        body: { 
          region: selectedRegion,
          from: format(from, 'yyyy-MM-dd'),
          to: format(to, 'yyyy-MM-dd')
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
      toast({
        title: "Error",
        description: "No se pudieron cargar las noticias. Mostrando datos de ejemplo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(region, dateFrom, dateTo);
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchNews(region, dateFrom, dateTo);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [region, dateFrom, dateTo]);

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
            onClick={() => fetchNews(region, dateFrom, dateTo)}
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

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Rango de fechas</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal bg-black-elevated border-border text-xs",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  {dateFrom ? format(dateFrom, "dd/MM/yy") : "Desde"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(date) => date && setDateFrom(date)}
                  disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal bg-black-elevated border-border text-xs",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  {dateTo ? format(dateTo, "dd/MM/yy") : "Hasta"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(date) => date && setDateTo(date)}
                  disabled={(date) => date > new Date() || date < dateFrom}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        {loading && news.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-8 w-8 text-gold-light animate-spin" />
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
