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

    // Map regions to NewsData.io country codes
    const countryMap: Record<string, string> = {
      'us': 'us',
      'china': 'cn',
      'asia': 'jp,kr,sg,in',
      'europe': 'gb,de,fr,es,it',
      'all': ''
    };

    const country = countryMap[region] || '';

    // Build the NewsData.io URL with parameters
    const params = new URLSearchParams({
      apikey: NEWS_API_KEY,
      language: 'en,es',
      category: 'business',
      size: '10',
    });

    if (country) params.append('country', country);
    if (from) params.append('from_date', from);
    if (to) params.append('to_date', to);

    // Fetch news from NewsData.io
    const response = await fetch(
      `https://newsdata.io/api/1/news?${params.toString()}`
    );

    if (!response.ok) {
      console.error(`NewsData.io error: ${response.statusText}`);
      // Return mock data if API fails
      return new Response(
        JSON.stringify({ articles: getMockNews(region) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.log('No results from NewsData.io');
      return new Response(
        JSON.stringify({ articles: getMockNews(region) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    
    // Filter out cryptocurrency news
    const filteredArticles = data.results.filter((article: any) => {
      const text = (article.title + ' ' + (article.description || '')).toLowerCase();
      const cryptoKeywords = ['bitcoin', 'crypto', 'blockchain', 'ethereum', 'btc', 'eth', 'cryptocurrency'];
      return !cryptoKeywords.some(keyword => text.includes(keyword));
    });
    
    const articles: NewsArticle[] = filteredArticles.map((article: any) => ({
      title: article.title,
      category: categorizeTopic(article.title, article.description),
      sentiment: analyzeSentiment(article.title, article.description),
      time: formatTimeAgo(article.pubDate),
      source: article.source_id || 'Unknown',
      imageUrl: article.image_url,
      url: article.link,
      region: region
    }));

    return new Response(
      JSON.stringify({ articles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching news:', error);
    return new Response(
      JSON.stringify({ articles: getMockNews('all') }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      title: "El petróleo alcanza $85 por barril ante tensiones en Medio Oriente",
      category: "Energía",
      sentiment: "positive",
      time: "Hace 30 min",
      source: "Reuters",
      imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
      url: "https://www.reuters.com",
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
