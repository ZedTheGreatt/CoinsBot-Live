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

  // Priority Keys: Groq (requested for speed/unli) -> Gemini
  const groqKey = localStorage.getItem('GROQ_API_KEY') || (import.meta as any).env?.VITE_GROQ_API_KEY;
  const primaryGemini = localStorage.getItem('GEMINI_API_KEY') || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  const fallbackGemini = localStorage.getItem('GEMINI_API_KEY_FALLBACK') || (import.meta as any).env?.VITE_GEMINI_API_KEY_FALLBACK;
  
  const geminiKeys = [primaryGemini, fallbackGemini].filter(Boolean);

  // If no local keys, fallback to server-side API proxy which now supports both Groq and Gemini
  if (!groqKey && geminiKeys.length === 0) {
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

  // 1. Try Groq first if available locally
  if (groqKey) {
    try {
      const recentData = candles.slice(-50).map(c => ({
        t: new Date((c.time as number) * 1000).toISOString(),
        o: c.open,
        h: c.high,
        l: c.low,
        c: c.close,
        v: c.volume
      }));

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are an elite crypto technical analyst. Evaluate trends, volatility, and momentum. Be concise and professional. Respond in JSON ONLY."
            },
            {
              role: "user",
              content: `Analyze market: ${JSON.stringify(recentData)}`
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (groqResponse.ok) {
        const result: any = await groqResponse.json();
        const content = result.choices?.[0]?.message?.content;
        if (content) {
          responseText = content;
        }
      } else {
        console.warn("[NeuralPulse] Local Groq fail, trying Gemini...");
      }
    } catch (err) {
      console.warn("[NeuralPulse] Local Groq connection failed");
    }
  }

  // 2. Try Gemini if Groq failed or wasn't available
  if (!responseText) {
    for (const key of geminiKeys) {
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
  }

  if (responseText) {
      try {
        return JSON.parse(responseText.trim());
      } catch (parseError) {
        console.error("[NeuralPulse] Parse error:", parseError, responseText);
        return null;
      }
    }
    
  if (lastError) {
    const msg = lastError.message || String(lastError);
    if (msg.includes("API_KEY_HTTP_REFERRER_BLOCKED")) {
      console.error("[NeuralPulse] Gemini API Key restricted by referer. Disable restrictions in Google Cloud Console.");
    } else if (msg.includes("API_KEY_INVALID")) {
      console.error("[NeuralPulse] Gemini API Key invalid.");
    }
    throw lastError;
  }
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
