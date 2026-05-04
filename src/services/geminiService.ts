import { GoogleGenAI, Type } from "@google/genai";
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
  if (candles.length < 20) return null;

  // Priority: LocalStorage -> Env (if exposed)
  const primaryKey = localStorage.getItem('GEMINI_API_KEY') || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  const fallbackKey = localStorage.getItem('GEMINI_API_KEY_FALLBACK') || (import.meta as any).env?.VITE_GEMINI_API_KEY_FALLBACK;
  
  const keys = [primaryKey, fallbackKey].filter(Boolean);

  // If no local keys, fallback to server-side API proxy
  if (keys.length === 0) {
    try {
      const response = await fetch('/api/ai/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candles }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          score: 0,
          label: 'NEUTRAL',
          summary: 'Neural Engine Halted',
          keyFactors: [],
          riskLevel: 'MEDIUM',
          error: errorData.error || `Server responded with ${response.status}`
        };
      }

      return await response.json();
    } catch (err) {
      console.warn("[NeuralPulse] Server proxy failed and no local keys configured.");
      return null;
    }
  }

  try {
    let responseText = "";
    let lastError: any = null;

    for (const key of keys) {
      try {
        // We use cast to any to handle potential version/type mismatch in this environment
        const ai = new (GoogleGenAI as any)({ apiKey: key });
        
        const recentData = candles.slice(-50).map(c => ({
          t: new Date((c.time as number) * 1000).toISOString(),
          o: c.open,
          h: c.high,
          l: c.low,
          c: c.close,
          v: c.volume
        }));

        const result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: `Analyze the market sentiment based on this data: ${JSON.stringify(recentData)}` }] }],
          config: {
            systemInstruction: "You are an elite crypto technical analyst. Evaluate trends, volatility, and momentum. Be concise and professional. Respond in JSON ONLY.",
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

        if (result.text) {
          responseText = result.text;
          break; // Success
        }
      } catch (err: any) {
        console.warn(`[NeuralPulse] API Key fail, trying next... ${err.message}`);
        lastError = err;
      }
    }

    if (responseText) {
      try {
        return JSON.parse(responseText.trim());
      } catch (parseError) {
        console.error("[NeuralPulse] Parse error:", parseError, responseText);
        return null;
      }
    }
    
    if (lastError) throw lastError;
    return null;
  } catch (error) {
    console.error("[NeuralPulse] AI Error:", error);
    return {
      score: 0,
      label: 'NEUTRAL',
      summary: 'AI Engine temporarily unavailable',
      keyFactors: [],
      riskLevel: 'MEDIUM',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
