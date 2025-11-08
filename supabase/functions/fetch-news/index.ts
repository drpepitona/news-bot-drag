import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsArticle {
  title: string;
  category: string;
  sentiment: "positive" | "negative" | "neutral";
  time: string;
  source: string;
  imageUrl?: string;
  url?: string;
  region: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { region, from, to } = await req.json();
    console.log('Fetching news for region:', region, 'from:', from, 'to:', to);

    const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY');
    
    if (!NEWS_API_KEY) {
      console.error('NEWS_API_KEY not configured');
      // Return mock data if no API key
      return new Response(
        JSON.stringify({ articles: getMockNews(region) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map regions to NewsAPI country codes
    const countryMap: Record<string, string> = {
      'us': 'us',
      'china': 'cn',
      'asia': 'jp,kr,in',
      'europe': 'gb,de,fr',
      'all': 'us,cn,gb,de,fr,jp'
    };

    const country = countryMap[region] || 'us';

    // Build the NewsAPI URL with date parameters
    const params = new URLSearchParams({
      country: country,
      category: 'business',
      pageSize: '100',
      apiKey: NEWS_API_KEY,
    });

    if (from) params.append('from', from);
    if (to) params.append('to', to);

    // Fetch real news from NewsAPI
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    const data = await response.json();
    
    const articles: NewsArticle[] = data.articles.map((article: any) => ({
      title: article.title,
      category: categorizeTopic(article.title, article.description),
      sentiment: analyzeSentiment(article.title, article.description),
      time: formatTimeAgo(article.publishedAt),
      source: article.source.name,
      imageUrl: article.urlToImage,
      url: article.url,
      region: region
    }));

    return new Response(
      JSON.stringify({ articles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching news:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch news',
        articles: getMockNews('all')
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function categorizeTopic(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.match(/bitcoin|crypto|blockchain|ethereum/)) return 'Criptomonedas';
  if (text.match(/stock|equity|shares|dow|nasdaq/)) return 'Acciones';
  if (text.match(/forex|currency|exchange rate|dollar|euro/)) return 'Forex';
  if (text.match(/gold|silver|commodity|oil|copper/)) return 'Materias Primas';
  if (text.match(/bond|treasury|yield/)) return 'Bonos';
  if (text.match(/energy|petroleum|gas/)) return 'Energía';
  
  return 'Mercados';
}

function analyzeSentiment(title: string, description: string): "positive" | "negative" | "neutral" {
  const text = (title + ' ' + description).toLowerCase();
  
  const positiveWords = ['surge', 'gain', 'rise', 'jump', 'rally', 'boost', 'soar', 'record high'];
  const negativeWords = ['fall', 'drop', 'plunge', 'decline', 'crash', 'slump', 'loss', 'tumble'];
  
  const hasPositive = positiveWords.some(word => text.includes(word));
  const hasNegative = negativeWords.some(word => text.includes(word));
  
  if (hasPositive && !hasNegative) return 'positive';
  if (hasNegative && !hasPositive) return 'negative';
  return 'neutral';
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} horas`;
  return `Hace ${Math.floor(diffMins / 1440)} días`;
}

function getMockNews(region: string): NewsArticle[] {
  const mockData: NewsArticle[] = [
    {
      title: "El oro alcanza máximos históricos en medio de tensiones geopolíticas",
      category: "Materias Primas",
      sentiment: "positive",
      time: "Hace 15 min",
      source: "Bloomberg",
      imageUrl: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400",
      url: "https://www.bloomberg.com",
      region: "all"
    },
    {
      title: "Bitcoin supera los $65,000 impulsado por demanda institucional",
      category: "Criptomonedas",
      sentiment: "positive",
      time: "Hace 30 min",
      source: "CoinDesk",
      imageUrl: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400",
      url: "https://www.coindesk.com",
      region: "all"
    },
    {
      title: "Mercados asiáticos cierran en rojo por datos económicos de China",
      category: "Acciones",
      sentiment: "negative",
      time: "Hace 1 hora",
      source: "Financial Times",
      imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
      url: "https://www.ft.com",
      region: "asia"
    },
    {
      title: "El EUR/USD se mantiene estable cerca de 1.09 antes de datos de inflación",
      category: "Forex",
      sentiment: "neutral",
      time: "Hace 2 horas",
      source: "Reuters",
      imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
      url: "https://www.reuters.com",
      region: "europe"
    },
    {
      title: "Wall Street se prepara para reportes de ganancias tecnológicas",
      category: "Acciones",
      sentiment: "positive",
      time: "Hace 3 horas",
      source: "CNBC",
      imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
      url: "https://www.cnbc.com",
      region: "us"
    }
  ];

  if (region === 'all') return mockData;
  return mockData.filter(item => item.region === region || item.region === 'all');
}
