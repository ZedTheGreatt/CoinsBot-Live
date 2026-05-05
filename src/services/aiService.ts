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

  const groqKey = localStorage.getItem('GROQ_API_KEY') || (import.meta as any).env?.VITE_GROQ_API_KEY;
  
  if (!groqKey) {
    try {
      const response = await fetch('/api/ai/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candles }),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.warn("[NeuralPulse] Server proxy failed.");
      return null;
    }
  }

  try {
    const recentData = candles.slice(-50).map(c => ({
      t: new Date((c.time as number) * 1000).toISOString(),
      o: c.open,
      h: c.high,
      l: c.low,
      c: c.close,
      v: c.volume
    }));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: "You are an elite crypto technical analyst. Evaluate trends and momentum. Respond in JSON ONLY with schema: { \"score\": number, \"label\": \"BULLISH\"|\"BEARISH\"|\"NEUTRAL\", \"summary\": string, \"keyFactors\": string[], \"riskLevel\": \"LOW\"|\"MEDIUM\"|\"HIGH\" }"
          },
          {
            role: "user",
            content: `Analyze market: ${JSON.stringify(recentData)}`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) throw new Error("Groq API Error");

    const result: any = await response.json();
    const content = result.choices?.[0]?.message?.content;
    
    if (content) return JSON.parse(content);
    return null;
  } catch (error) {
    console.error("[NeuralPulse] Groq Error:", error);
    return null;
  }
}
