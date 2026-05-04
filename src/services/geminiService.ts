import { OHLCCandle } from "../types";

export interface AISentiment {
  score: number; // -100 to 100
  label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
  keyFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  error?: string;
}

export async function getMarketSentiment(candles: OHLCCandle[]): Promise<AISentiment | null> {
  // We call our internal API which has access to the server-side GEMINI_API_KEY
  if (candles.length < 20) return null;

  try {
    const response = await fetch('/api/ai/sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ candles }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[NeuralPulse] API error:", response.status, errorData);
      return {
        score: 0,
        label: 'NEUTRAL',
        summary: 'Neural Engine Error',
        keyFactors: [],
        riskLevel: 'MEDIUM',
        error: errorData.error || `Server responded with ${response.status}`
      };
    }

    return await response.json();
  } catch (error) {
    console.error("[NeuralPulse] Connection error:", error);
    return {
      score: 0,
      label: 'NEUTRAL',
      summary: 'Connection Error',
      keyFactors: [],
      riskLevel: 'MEDIUM',
      error: 'Failed to connect to Neural Engine'
    };
  }
}
