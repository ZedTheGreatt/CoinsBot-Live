import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { candles } = req.body;
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    console.error("[AI] GROQ_API_KEY missing");
    return res.status(500).json({ error: "Groq API Key not configured" });
  }

  if (!candles || !Array.isArray(candles)) {
    return res.status(400).json({ error: "Invalid candle data" });
  }

  const recentData = candles.slice(-50).map((c: any) => ({
    t: new Date((c.time || 0) * 1000).toISOString(),
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
    v: c.volume
  }));

  try {
    const fetchResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: "You are an elite crypto technical analyst. Respond in JSON ONLY with schema: { \"score\": number, \"label\": \"BULLISH\"|\"BEARISH\"|\"NEUTRAL\", \"summary\": string, \"keyFactors\": string[], \"riskLevel\": \"LOW\"|\"MEDIUM\"|\"HIGH\" }"
          },
          {
            role: "user",
            content: `Analyze: ${JSON.stringify(recentData)}`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!fetchResponse.ok) {
      throw new Error(`Groq returned ${fetchResponse.status}`);
    }

    const result: any = await fetchResponse.json();
    const content = result.choices?.[0]?.message?.content;
    
    if (!content) throw new Error("No response from Groq");
    
    return res.status(200).json(JSON.parse(content));
  } catch (error: any) {
    console.error("[AI] Error:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Neural Engine failure"
    });
  }
}
