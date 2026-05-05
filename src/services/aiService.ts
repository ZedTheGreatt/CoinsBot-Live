import { OHLCCandle } from "../types";

export interface AISentiment {
  score: number; // -100 to 100
  label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
  keyFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  error?: string;
}

export async function getMarketSentiment(symbol: string, candles: OHLCCandle[]): Promise<AISentiment | null> {
  if (candles.length < 20) return null;

  try {
    const response = await fetch('/api/ai/sentiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, candles }),
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      return {
        score: 0,
        label: 'NEUTRAL',
        summary: 'Neural Engine Offline',
        keyFactors: [],
        riskLevel: 'MEDIUM',
        error: data?.error || `Server error: ${response.status}`
      } as AISentiment;
    }
    
    return data;
  } catch (err) {
    console.warn("[NeuralPulse] Server proxy failed:", err);
    return {
      score: 0,
       label: 'NEUTRAL',
       summary: 'Connection Error',
       keyFactors: [],
       riskLevel: 'MEDIUM',
       error: "Connection to Neural Engine failed. Please check your network."
    } as AISentiment;
  }
}
