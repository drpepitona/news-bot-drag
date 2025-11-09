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
    const GNEWS_API_KEY = Deno.env.get('GNEWS_API_KEY');
    const STOCKNEWS_API_KEY = Deno.env.get('STOCKNEWS_API_KEY');
    
    if (!NEWS_API_KEY && !THENEWSAPI_KEY && !GNEWS_API_KEY && !STOCKNEWS_API_KEY) {
      throw new Error('No API keys configured');
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

    // Fetch from all three APIs in parallel
    const apiCalls = [];
    
    if (NEWS_API_KEY) {
      apiCalls.push(
        fetch(`https://newsdata.io/api/1/news?${new URLSearchParams({
          apikey: NEWS_API_KEY,
          language: 'en,es',
          category: 'business',
          ...(country && { country })
        }).toString()}`)
      );
    }
    
    if (THENEWSAPI_KEY) {
      apiCalls.push(
        fetch(`https://api.thenewsapi.com/v1/news/all?${new URLSearchParams({
          api_token: THENEWSAPI_KEY,
          language: 'en,es',
          categories: 'business,finance',
          limit: '20',
          ...(region !== 'all' && { search: region })
        }).toString()}`)
      );
    }
    
    if (GNEWS_API_KEY) {
      // GNews API
      const gnewsCountry = country ? country.split(',')[0] : 'us';
      apiCalls.push(
        fetch(`https://gnews.io/api/v4/top-headlines?${new URLSearchParams({
          token: GNEWS_API_KEY,
          lang: 'en',
          topic: 'business',
          max: '20',
          ...(region !== 'all' && { country: gnewsCountry })
        }).toString()}`)
      );
    }
    
    if (STOCKNEWS_API_KEY) {
      // StockNews API
      apiCalls.push(
        fetch(`https://stocknewsapi.com/api/v1?${new URLSearchParams({
          tickers: '',
          items: '50',
          token: STOCKNEWS_API_KEY
        }).toString()}`)
      );
    }

    const responses = await Promise.allSettled(apiCalls);

    const allArticles: NewsArticle[] = [];
    let apiIndex = 0;

    // Process NewsData.io results
    if (NEWS_API_KEY && responses[apiIndex]) {
      const newsDataResponse = responses[apiIndex];
      if (newsDataResponse.status === 'fulfilled' && newsDataResponse.value.ok) {
        const data = await newsDataResponse.value.json();
        console.log('NewsData.io response:', JSON.stringify(data).substring(0, 200));
        if (data.results && data.results.length > 0) {
          const filtered = data.results.filter((article: any) => {
            const text = (article.title + ' ' + (article.description || '')).toLowerCase();
            const cryptoKeywords = ['bitcoin', 'crypto', 'blockchain', 'ethereum', 'btc', 'eth', 'cryptocurrency'];
            const hasCrypto = cryptoKeywords.some(keyword => text.includes(keyword));
            const hasValidUrl = isValidNewsUrl(article.link);
            return !hasCrypto && hasValidUrl;
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
        if (newsDataResponse.status === 'fulfilled') {
          const errorData = await newsDataResponse.value.text();
          console.error('NewsData.io failed with status:', newsDataResponse.value.status, 'Response:', errorData);
        } else {
          console.error('NewsData.io failed:', newsDataResponse.reason);
        }
      }
      apiIndex++;
    }

    // Process TheNewsAPI results
    if (THENEWSAPI_KEY && responses[apiIndex]) {
      const theNewsApiResponse = responses[apiIndex];
      if (theNewsApiResponse.status === 'fulfilled' && theNewsApiResponse.value.ok) {
        const data = await theNewsApiResponse.value.json();
        console.log('TheNewsAPI response:', JSON.stringify(data).substring(0, 200));
        if (data.data && data.data.length > 0) {
          const filtered = data.data.filter((article: any) => {
            const text = (article.title + ' ' + (article.description || '')).toLowerCase();
            const cryptoKeywords = ['bitcoin', 'crypto', 'blockchain', 'ethereum', 'btc', 'eth', 'cryptocurrency'];
            const hasCrypto = cryptoKeywords.some(keyword => text.includes(keyword));
            const hasValidUrl = isValidNewsUrl(article.url);
            return !hasCrypto && hasValidUrl;
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
        if (theNewsApiResponse.status === 'fulfilled') {
          const errorData = await theNewsApiResponse.value.text();
          console.error('TheNewsAPI failed with status:', theNewsApiResponse.value.status, 'Response:', errorData);
        } else {
          console.error('TheNewsAPI failed:', theNewsApiResponse.reason);
        }
      }
      apiIndex++;
    }

    // Process GNews results
    if (GNEWS_API_KEY && responses[apiIndex]) {
      const gnewsResponse = responses[apiIndex];
      if (gnewsResponse.status === 'fulfilled' && gnewsResponse.value.ok) {
        const data = await gnewsResponse.value.json();
        console.log('GNews response:', JSON.stringify(data).substring(0, 200));
        if (data.articles && data.articles.length > 0) {
          const filtered = data.articles.filter((article: any) => {
            const text = (article.title + ' ' + (article.description || '')).toLowerCase();
            const cryptoKeywords = ['bitcoin', 'crypto', 'blockchain', 'ethereum', 'btc', 'eth', 'cryptocurrency'];
            const hasCrypto = cryptoKeywords.some(keyword => text.includes(keyword));
            const hasValidUrl = isValidNewsUrl(article.url);
            return !hasCrypto && hasValidUrl;
          });
          
          allArticles.push(...filtered.map((article: any) => ({
            title: article.title,
            category: categorizeTopic(article.title, article.description),
            sentiment: analyzeSentiment(article.title, article.description),
            time: formatTimeAgo(article.publishedAt),
            source: article.source.name || 'GNews',
            imageUrl: article.image,
            url: article.url,
            region: region
          })));
        }
      } else {
        if (gnewsResponse.status === 'fulfilled') {
          const errorData = await gnewsResponse.value.text();
          console.error('GNews failed with status:', gnewsResponse.value.status, 'Response:', errorData);
        } else {
          console.error('GNews failed:', gnewsResponse.reason);
        }
      }
      apiIndex++;
    }

    // Process StockNews results
    if (STOCKNEWS_API_KEY && responses[apiIndex]) {
      const stockNewsResponse = responses[apiIndex];
      if (stockNewsResponse.status === 'fulfilled' && stockNewsResponse.value.ok) {
        const data = await stockNewsResponse.value.json();
        console.log('StockNews response:', JSON.stringify(data).substring(0, 200));
        if (data.data && data.data.length > 0) {
          const filtered = data.data.filter((article: any) => {
            const text = (article.title + ' ' + (article.text || '')).toLowerCase();
            const cryptoKeywords = ['bitcoin', 'crypto', 'blockchain', 'ethereum', 'btc', 'eth', 'cryptocurrency'];
            const hasCrypto = cryptoKeywords.some(keyword => text.includes(keyword));
            const hasValidUrl = isValidNewsUrl(article.news_url);
            return !hasCrypto && hasValidUrl;
          });
          
          allArticles.push(...filtered.map((article: any) => ({
            title: article.title,
            category: categorizeTopic(article.title, article.text || ''),
            sentiment: article.sentiment === 'Positive' ? 'positive' : article.sentiment === 'Negative' ? 'negative' : 'neutral',
            time: formatTimeAgo(article.date),
            source: article.source_name || 'StockNews',
            imageUrl: article.image_url,
            url: article.news_url,
            region: region
          })));
        }
      } else {
        if (stockNewsResponse.status === 'fulfilled') {
          const errorData = await stockNewsResponse.value.text();
          console.error('StockNews failed with status:', stockNewsResponse.value.status, 'Response:', errorData);
        } else {
          console.error('StockNews failed:', stockNewsResponse.reason);
        }
      }
    }

    // If no articles were fetched, return empty array
    if (allArticles.length === 0) {
      console.log('No articles fetched from any API');
      return new Response(
        JSON.stringify({ 
          articles: [],
          message: 'No articles available at the moment. Please check API keys and try again.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

function isValidNewsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // Filter out invalid URL patterns
  const invalidPatterns = [
    'blogger.com/feeds',
    'feeds.feedburner.com',
    'localhost',
    '127.0.0.1',
  ];
  
  const urlLower = url.toLowerCase();
  
  // Check for invalid patterns
  if (invalidPatterns.some(pattern => urlLower.includes(pattern))) {
    return false;
  }
  
  // Verify it's a valid HTTP/HTTPS URL
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
