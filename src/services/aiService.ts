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

    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn("[NeuralPulse] Server proxy failed.");
    return null;
  }
}
