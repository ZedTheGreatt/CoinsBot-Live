import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import https from "https";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory cache for API requests
  const cache = new Map<string, { data: any, timestamp: number }>();
  const aiCache = new Map<string, { data: any, timestamp: number, lastCandleTime: number, lastPrice: number }>();
  
  const CACHE_TTL = {
    klines: 60000, // 1 minute
    ticker: 10000, // 10 seconds
    ai: 300000,    // 5 minutes for AI unless price moves significantly
  };

  // Helper for HTTPS requests with optional caching
  const httpsRequest = (url: string, ttl: number = 0): Promise<any> => {
    if (ttl > 0) {
      const cached = cache.get(url);
      if (cached && Date.now() - cached.timestamp < ttl) {
        console.log(`[Proxy] Cache hit: ${url}`);
        return Promise.resolve(cached.data);
      }
    }

    return new Promise((resolve, reject) => {
      console.log(`[Proxy] Requesting: ${url}`);
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        timeout: 8000
      };

      https.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData = JSON.parse(data);
              if (ttl > 0) {
                cache.set(url, { data: parsedData, timestamp: Date.now() });
              }
              resolve(parsedData);
            } catch (e) {
              console.error(`[Proxy] JSON Parse Error for ${url}:`, data.substring(0, 500));
              reject(new Error(`Failed to parse JSON response`));
            }
          } else {
            console.error(`[Proxy] API Error for ${url}: ${res.statusCode} - ${data.substring(0, 200)}`);
            reject(new Error(`API responded with ${res.statusCode}`));
          }
        });
      }).on('error', (err) => {
        console.error(`[Proxy] Connection Error for ${url}: ${err.message}`);
        reject(err);
      }).on('timeout', () => {
        console.error(`[Proxy] Timeout for ${url}`);
        reject(new Error('Request timed out'));
      });
    });
  };

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      await httpsRequest('https://api.pro.coins.ph/openapi/quote/v1/ticker/24hr?symbol=BTCPHP', 3000);
      res.json({ status: "ok", api: "connected" });
    } catch (error) {
      res.status(503).json({ status: "error", api: "disconnected" });
    }
  });

  // Coins.ph API Proxy
  app.get("/api/coins/klines", async (req, res) => {
    const { symbol, interval, limit } = req.query;
    try {
      const url = `https://api.pro.coins.ph/openapi/quote/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 500}`;
      const data = await httpsRequest(url, CACHE_TTL.klines);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  app.get("/api/coins/ticker", async (req, res) => {
    const { symbol } = req.query;
    try {
      const url = symbol 
        ? `https://api.pro.coins.ph/openapi/quote/v1/ticker/24hr?symbol=${symbol}`
        : `https://api.pro.coins.ph/openapi/quote/v1/ticker/24hr`;
      const data = await httpsRequest(url, CACHE_TTL.ticker);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ticker data" });
    }
  });

  // Helper for Groq with Rate Limit Handling (Retry logic)
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
        console.warn(`[AI] Groq 429 detected. Retrying in ${delay}ms...`);
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

  // Neural Pulse AI Agent (Server-side to protect API Key)
  app.post("/api/ai/sentiment", async (req, res) => {
    const { candles, symbol = 'UNKNOWN' } = req.body;
    const groqKey = process.env.GROQ_API_KEY;
    
    if (!groqKey) {
      console.error("[AI] GROQ_API_KEY is missing");
      return res.status(500).json({ error: "Neural Engine not configured. Please add GROQ_API_KEY." });
    }

    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      return res.status(400).json({ error: "Invalid candle data" });
    }

    // Semantic Cache Check (Check if market has actually moved)
    const lastCandle = candles[candles.length - 1];
    const currentPrice = lastCandle.close;
    const currentTime = lastCandle.time;
    const cacheKey = `ai_sentiment_${symbol}`;
    const cached = aiCache.get(cacheKey);

    if (cached) {
      const isStale = Date.now() - cached.timestamp > CACHE_TTL.ai;
      const isPriceSame = Math.abs(currentPrice - cached.lastPrice) / cached.lastPrice < 0.0001; // 0.01% move
      const isTimeSame = currentTime === cached.lastCandleTime;

      if (!isStale && (isPriceSame || isTimeSame)) {
        console.log(`[AI] Returning cached sentiment for ${symbol}`);
        return res.json(cached.data);
      }
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
      const result = await groqChatCompletion({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an elite crypto technical analyst. Evaluate trends, volatility, and momentum. Provide a very concise single-sentence summary. Respond in JSON ONLY with this schema: { \"score\": number, \"label\": \"BULLISH\"|\"BEARISH\"|\"NEUTRAL\", \"summary\": string, \"keyFactors\": string[], \"riskLevel\": \"LOW\"|\"MEDIUM\"|\"HIGH\" }"
          },
          {
            role: "user",
            content: `Analyze market: ${JSON.stringify(recentData)}`
          }
        ],
        response_format: { type: "json_object" }
      }, groqKey);

      const content = result.choices?.[0]?.message?.content;
      if (!content) throw new Error("No analysis received from Groq");
      
      const parsed = JSON.parse(content);
      
      // Update Cache
      aiCache.set(cacheKey, {
        data: parsed,
        timestamp: Date.now(),
        lastPrice: currentPrice,
        lastCandleTime: currentTime
      });

      console.log(`[AI] Analysis successful via Groq for ${symbol}`);
      res.json(parsed);
    } catch (error: any) {
      console.error("[AI] Error:", error);
      
      // Fallback to stale cache if available
      if (cached) {
        console.warn("[AI] Falling back to stale cache due to error");
        return res.json({ ...cached.data, isStale: true });
      }

      res.status(503).json({ 
        error: error.message?.includes("429") ? "Neural Engine Congested" : "Neural Engine failure", 
        details: String(error) 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
