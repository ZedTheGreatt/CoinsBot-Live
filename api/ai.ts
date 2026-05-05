import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory cache for serverless warm starts
const aiCache = new Map<string, { data: any, timestamp: number, lastCandleTime: number, lastPrice: number }>();
const CACHE_TTL = 300000; // 5 minutes

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { candles, symbol = 'UNKNOWN' } = req.body;
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    console.error("[AI] GROQ_API_KEY missing");
    return res.status(500).json({ 
      error: "Neural Engine Offline: GROQ_API_KEY is missing in your environment. Go to Vercel Settings > Environment Variables to add it." 
    });
  }

  if (!candles || !Array.isArray(candles) || candles.length === 0) {
    return res.status(400).json({ error: "Invalid candle data" });
  }

  // Semantic Cache Check
  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle.close;
  const currentTime = lastCandle.time;
  const cacheKey = `ai_sentiment_${symbol}`;
  const cached = aiCache.get(cacheKey);

  if (cached) {
    const isStale = Date.now() - cached.timestamp > CACHE_TTL;
    const isPriceSame = Math.abs(currentPrice - cached.lastPrice) / cached.lastPrice < 0.0001;
    const isTimeSame = currentTime === cached.lastCandleTime;

    if (!isStale && (isPriceSame || isTimeSame)) {
      console.log(`[AI] Returning cached sentiment for ${symbol}`);
      return res.status(200).json(cached.data);
    }
  }

    try {
    const result = await groqChatCompletion({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are an elite crypto technical analyst. Evaluate trends and momentum. Respond in JSON ONLY with schema: { \"score\": number, \"label\": \"BULLISH\"|\"BEARISH\"|\"NEUTRAL\", \"summary\": string, \"keyFactors\": string[], \"riskLevel\": \"LOW\"|\"MEDIUM\"|\"HIGH\" }"
        },
        {
          role: "user",
          content: `Analyze (30-candle data): ${JSON.stringify(candles.slice(-30).map((c: any) => [c.open, c.high, c.low, c.close, c.volume]))}`
        }
      ],
      response_format: { type: "json_object" }
    }, groqKey);

    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("No response from Groq");
    
    const parsed = JSON.parse(content);

    // Update Cache
    aiCache.set(cacheKey, {
      data: parsed,
      timestamp: Date.now(),
      lastPrice: currentPrice,
      lastCandleTime: currentTime
    });

    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error("[AI] Error:", error);
    
    // Fallback to stale cache if available
    const cached = aiCache.get(`ai_sentiment_${symbol}`);
    if (cached) {
      return res.status(200).json({ ...cached.data, isStale: true });
    }

    return res.status(500).json({ 
      error: error.message?.includes("429") ? "Neural Engine Congested" : "Neural Engine failure",
      details: error.message 
    });
  }
}

async function groqChatCompletion(payload: any, apiKey: string, retries = 2, delay = 1000): Promise<any> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 429 && retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return groqChatCompletion(payload, apiKey, retries - 1, delay * 2);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return groqChatCompletion(payload, apiKey, retries - 1, delay * 2);
    }
    throw err;
  }
}
