const API_BASE_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:8000';

export interface AnalysisRequest {
  pregunta: string;
  vix?: number;
}

export interface AnalysisResponse {
  analisis: string;
  categoria: string;
  token: number;
  num_eventos: number;
  alpha: number | null;
  beta: number | null;
  relevante: boolean;
}

export async function analyzeNews(request: AnalysisRequest): Promise<AnalysisResponse> {
  console.log('🔍 Conectando a:', API_BASE_URL);
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pregunta: request.pregunta,
      vix: request.vix || 20.0
    }),
  });
  
  if (!response.ok) {
    throw new Error('Error en el análisis');
  }
  
  return await response.json();
}
