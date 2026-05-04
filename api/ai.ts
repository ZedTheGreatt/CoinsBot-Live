import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { candles } = req.body;
  
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_FALLBACK].filter(Boolean) as string[];
  if (keys.length === 0) {
    console.error("[AI] No API keys configured");
    return res.status(500).json({ error: "API Key not configured in environment" });
  }

  if (!candles || !Array.isArray(candles)) {
    return res.status(400).json({ error: "Invalid candle data" });
  }

  try {
    const recentData = candles.slice(-50).map((c: any) => ({
      t: new Date((c.time || 0) * 1000).toISOString(),
      o: c.open,
      h: c.high,
      l: c.low,
      c: c.close,
      v: c.volume
    }));

    let lastError: any = null;
    let responseText = "";

    for (const key of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: `Analyze current crypto market based on these 50 candles. Professional tone. Data: ${JSON.stringify(recentData)}` }] }],
          config: {
            systemInstruction: "You are an elite crypto technical analyst. Evaluate trends, volatility, and momentum. Be concise and professional. Respond in JSON ONLY.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: ["score", "label", "summary", "keyFactors", "riskLevel"],
              properties: {
                score: { type: Type.NUMBER },
                label: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "NEUTRAL"] },
                summary: { type: Type.STRING },
                keyFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
                riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] }
              }
            }
          }
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`[AI] API Key failed, trying fallback... Error: ${err.message}`);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error("No response from AI");
    }
    
    return res.status(200).json(JSON.parse(responseText.trim()));
  } catch (error: any) {
    console.error("[AI] Error:", error);
    return res.status(500).json({ 
      error: "Neural Engine failure", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}
