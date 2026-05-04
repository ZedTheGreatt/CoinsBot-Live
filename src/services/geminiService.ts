import { GoogleGenAI, Type } from "@google/genai";
import { OHLCCandle } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AISentiment {
  score: number; // -100 to 100
  label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
  keyFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export async function getMarketSentiment(candles: OHLCCandle[]): Promise<AISentiment | null> {
  if (!process.env.GEMINI_API_KEY || candles.length < 20) return null;

  try {
    const recentData = candles.slice(-50).map(c => ({
      t: new Date((c.time as number) * 1000).toISOString(),
      o: c.open,
      h: c.high,
      l: c.low,
      c: c.close,
      v: c.volume
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Analyze market sentiment based on this data: ${JSON.stringify(recentData)}` }] }],
      config: {
        systemInstruction: "You are an elite crypto technical analyst. Evaluate trends, volatility, and momentum. Be concise and professional.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["score", "label", "summary", "keyFactors", "riskLevel"],
          properties: {
            score: { type: Type.NUMBER, description: "Sentiment score -100 (Extremely Bearish) to 100 (Extremely Bullish)" },
            label: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "NEUTRAL"] },
            summary: { type: Type.STRING, description: "1-2 sentence summary" },
            keyFactors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 3 technical reasons" },
            riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] }
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text.trim());
      return data;
    }
    return null;
  } catch (error) {
    console.error("[NeuralPulse] AI Error:", error);
    return null;
  }
}
