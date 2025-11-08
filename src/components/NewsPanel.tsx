import { ScrollArea } from "@/components/ui/scroll-area";
import { NewsCard, NewsItem } from "./NewsCard";
import { Newspaper } from "lucide-react";

interface NewsPanelProps {
  onDragStart: (e: React.DragEvent, news: NewsItem) => void;
}

// Mock data - se puede reemplazar con datos reales de la API
const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "El oro alcanza máximos históricos en medio de tensiones geopolíticas",
    category: "Materias Primas",
    sentiment: "positive",
    time: "Hace 15 min",
    source: "Investing.com",
  },
  {
    id: "2",
    title: "El EUR/USD cae por debajo de 1.08 tras datos de inflación de EE.UU.",
    category: "Forex",
    sentiment: "negative",
    time: "Hace 30 min",
    source: "Investing.com",
  },
  {
    id: "3",
    title: "Las acciones tecnológicas lideran las ganancias en Wall Street",
    category: "Acciones",
    sentiment: "positive",
    time: "Hace 1 hora",
    source: "Investing.com",
  },
  {
    id: "4",
    title: "Bitcoin supera los $65,000 con optimismo institucional",
    category: "Criptomonedas",
    sentiment: "positive",
    time: "Hace 2 horas",
    source: "Investing.com",
  },
  {
    id: "5",
    title: "El petróleo Brent se estabiliza cerca de $85 por barril",
    category: "Energía",
    sentiment: "neutral",
    time: "Hace 3 horas",
    source: "Investing.com",
  },
  {
    id: "6",
    title: "Los bonos del Tesoro de EE.UU. suben ante expectativas de recorte de tasas",
    category: "Bonos",
    sentiment: "positive",
    time: "Hace 4 horas",
    source: "Investing.com",
  },
];

export const NewsPanel = ({ onDragStart }: NewsPanelProps) => {
  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-black-elevated border border-gold-dark/30 flex items-center justify-center">
            <Newspaper className="h-5 w-5 text-gold-light" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Noticias del Mercado</h2>
            <p className="text-xs text-muted-foreground">Arrastra al chat para analizar</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-3">
          {mockNews.map((news) => (
            <NewsCard key={news.id} news={news} onDragStart={onDragStart} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
