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
    const { region } = await req.json();
    console.log('Fetching news for region:', region);

    const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY');
    const THENEWSAPI_KEY = Deno.env.get('THENEWSAPI_KEY');
    
    if (!NEWS_API_KEY || !THENEWSAPI_KEY) {
      throw new Error('API keys not configured');
    }

    // Map regions to country codes
    const countryMap: Record<string, string> = {
      'us': 'us',
      'china': 'cn',
      'asia': 'jp,kr,sg,in',
      'europe': 'gb,de,fr,es,it',
      'all': ''
    };

    const country = countryMap[region] || '';

    // Fetch from both APIs in parallel
    const [newsDataResponse, theNewsApiResponse] = await Promise.allSettled([
      // NewsData.io
      fetch(`https://newsdata.io/api/1/news?${new URLSearchParams({
        apikey: NEWS_API_KEY,
        language: 'en,es',
        category: 'business',
        ...(country && { country })
      }).toString()}`),
      
      // TheNewsAPI.com
      fetch(`https://api.thenewsapi.com/v1/news/all?${new URLSearchParams({
        api_token: THENEWSAPI_KEY,
        language: 'en,es',
        categories: 'business,finance',
        limit: '20',
        ...(region !== 'all' && { search: region })
      }).toString()}`)
    ]);

    const allArticles: NewsArticle[] = [];

    // Process NewsData.io results
    if (newsDataResponse.status === 'fulfilled' && newsDataResponse.value.ok) {
      const data = await newsDataResponse.value.json();
      if (data.results && data.results.length > 0) {
        const filtered = data.results.filter((article: any) => {
          const text = (article.title + ' ' + (article.description || '')).toLowerCase();
          const cryptoKeywords = ['bitcoin', 'crypto', 'blockchain', 'ethereum', 'btc', 'eth', 'cryptocurrency'];
          return !cryptoKeywords.some(keyword => text.includes(keyword));
        });
        
        allArticles.push(...filtered.map((article: any) => ({
          title: article.title,
          category: categorizeTopic(article.title, article.description),
          sentiment: analyzeSentiment(article.title, article.description),
          time: formatTimeAgo(article.pubDate),
          source: article.source_id || 'NewsData.io',
          imageUrl: article.image_url,
          url: article.link,
          region: region
        })));
      }
    } else {
      console.error('NewsData.io failed:', newsDataResponse.status === 'rejected' ? newsDataResponse.reason : 'Response not ok');
    }

    // Process TheNewsAPI results
    if (theNewsApiResponse.status === 'fulfilled' && theNewsApiResponse.value.ok) {
      const data = await theNewsApiResponse.value.json();
      if (data.data && data.data.length > 0) {
        const filtered = data.data.filter((article: any) => {
          const text = (article.title + ' ' + (article.description || '')).toLowerCase();
          const cryptoKeywords = ['bitcoin', 'crypto', 'blockchain', 'ethereum', 'btc', 'eth', 'cryptocurrency'];
          return !cryptoKeywords.some(keyword => text.includes(keyword));
        });
        
        allArticles.push(...filtered.map((article: any) => ({
          title: article.title,
          category: categorizeTopic(article.title, article.description),
          sentiment: analyzeSentiment(article.title, article.description),
          time: formatTimeAgo(article.published_at),
          source: article.source || 'TheNewsAPI',
          imageUrl: article.image_url,
          url: article.url,
          region: region
        })));
      }
    } else {
      console.error('TheNewsAPI failed:', theNewsApiResponse.status === 'rejected' ? theNewsApiResponse.reason : 'Response not ok');
    }

    // Sort by most recent first
    allArticles.sort((a, b) => {
      const timeA = parseInt(a.time.match(/\d+/)?.[0] || '999');
      const timeB = parseInt(b.time.match(/\d+/)?.[0] || '999');
      return timeA - timeB;
    });

    return new Response(
      JSON.stringify({ articles: allArticles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching news:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch news';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        articles: []
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
