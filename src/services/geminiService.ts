import { GoogleGenAI, Type } from "@google/genai";
import { OHLCCandle } from "../types";

export interface AISentiment {
  score: number; // -100 to 100
  label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
  keyFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export async function getMarketSentiment(candles: OHLCCandle[]): Promise<AISentiment | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || candles.length < 20) {
    if (!apiKey) console.warn("[NeuralPulse] GEMINI_API_KEY is missing. AI analysis disabled.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
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
      contents: [{ role: 'user', parts: [{ text: `Analyze the market sentiment based on this data: ${JSON.stringify(recentData)}` }] }],
      config: {
        systemInstruction: "You are an elite crypto technical analyst. Evaluate trends, volatility, and momentum. Be concise and professional.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["score", "label", "summary", "keyFactors", "riskLevel"],
          properties: {
            score: { type: Type.NUMBER, description: "Sentiment score -100 to 100" },
            label: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "NEUTRAL"] },
            summary: { type: Type.STRING },
            keyFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] }
          }
        }
      }
    });

    if (response.text) {
      try {
        return JSON.parse(response.text.trim());
      } catch (parseError) {
        console.error("[NeuralPulse] Parse error:", parseError, response.text);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error("[NeuralPulse] AI Error:", error);
    return null;
  }
}
