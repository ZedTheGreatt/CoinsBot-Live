import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { candles } = req.body;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[AI] GEMINI_API_KEY missing");
    return res.status(500).json({ error: "API Key not configured in environment" });
  }

  if (!candles || !Array.isArray(candles)) {
    return res.status(400).json({ error: "Invalid candle data" });
  }

  try {
    const genAI = new (GoogleGenAI as any)({ apiKey: apiKey });
    const model = (genAI as any).getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are an elite crypto technical analyst. Evaluate trends, volatility, and momentum. Be concise and professional." 
    });

    const recentData = candles.slice(-50).map((c: any) => ({
      t: new Date((c.time || 0) * 1000).toISOString(),
      o: c.open,
      h: c.high,
      l: c.low,
      c: c.close,
      v: c.volume
    }));

    const prompt = `Analyze current crypto market based on these 50 candles. Professional tone.
    Provide a JSON response only. No markdown formatting.
    {
      "score": number (-100 to 100),
      "label": "BULLISH" | "BEARISH" | "NEUTRAL",
      "summary": "string",
      "keyFactors": ["string", "string", "string"],
      "riskLevel": "LOW" | "MEDIUM" | "HIGH"
    }
    
    Data: ${JSON.stringify(recentData)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    
    return res.status(200).json(JSON.parse(jsonStr.trim()));
  } catch (error: any) {
    console.error("[AI] Error:", error);
    return res.status(500).json({ 
      error: "Neural Engine failure", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}
