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
  const CACHE_TTL = {
    klines: 60000, // 1 minute
    ticker: 10000, // 10 seconds
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
        timeout: 8000 // Reduced to 8s for faster failure/retry cycle
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
      // Test with a simple ticker request (3s cache for health check)
      await httpsRequest('https://api.pro.coins.ph/openapi/quote/v1/ticker/24hr?symbol=BTCPHP', 3000);
      res.json({ status: "ok", api: "connected" });
    } catch (error) {
      res.status(503).json({ status: "error", api: "disconnected", message: error instanceof Error ? error.message : String(error) });
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
      console.error("[Proxy] Klines exception:", error);
      res.status(500).json({ error: "Failed to fetch klines from Coins.ph" });
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
      console.error("[Proxy] Ticker exception:", error);
      res.status(500).json({ error: "Failed to fetch ticker from Coins.ph" });
    }
  });

  // Neural Pulse AI Agent (Server-side to protect API Key)
  app.post("/api/ai/sentiment", async (req, res) => {
    const { candles } = req.body;
    
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_FALLBACK].filter(Boolean) as string[];
    
    if (!groqKey && geminiKeys.length === 0) {
      console.error("[AI] No API keys configured (Groq or Gemini)");
      return res.status(500).json({ error: "Neural Engine not configured. Please add GROQ_API_KEY or GEMINI_API_KEY." });
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
      // 1. Try Groq first if available (requested for "near unli use")
      if (groqKey) {
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
                  content: "You are an elite crypto technical analyst. Evaluate trends, volatility, and momentum. Be concise and professional. Respond in JSON ONLY with this schema: { \"score\": number, \"label\": \"BULLISH\"|\"BEARISH\"|\"NEUTRAL\", \"summary\": string, \"keyFactors\": string[], \"riskLevel\": \"LOW\"|\"MEDIUM\"|\"HIGH\" }"
                },
                {
                  role: "user",
                  content: `Analyze market: ${JSON.stringify(recentData)}`
                }
              ],
              response_format: { type: "json_object" }
            })
          });

          if (fetchResponse.ok) {
            const result: any = await fetchResponse.json();
            const content = result.choices?.[0]?.message?.content;
            if (content) {
              console.log("[AI] Analysis successful via Groq");
              return res.json(JSON.parse(content));
            }
          } else {
            const errorText = await fetchResponse.text();
            console.warn(`[AI] Groq failed, status: ${fetchResponse.status}. Error: ${errorText}`);
          }
        } catch (groqErr: any) {
          console.warn(`[AI] Groq connection failed: ${groqErr.message}`);
        }
      }

      // 2. Try Gemini fallback
      const { GoogleGenAI, Type } = await import("@google/genai");
      let lastError: any = null;
      let responseText = "";

      for (const key of geminiKeys) {
        try {
          const ai = new (GoogleGenAI as any)({ apiKey: key });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: 'user', parts: [{ text: `Analyze market: ${JSON.stringify(recentData)}` }] }],
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
          console.warn(`[AI] Gemini key failed, trying next... Error: ${err.message}`);
          lastError = err;
        }
      }

      if (responseText) {
        console.log("[AI] Analysis successful via Gemini");
        return res.json(JSON.parse(responseText.trim()));
      }
      
      let errorMessage = "Failed to generate content from all available engines (Groq/Gemini)";
      if (lastError?.message?.includes("API_KEY_HTTP_REFERRER_BLOCKED")) {
        errorMessage = "Gemini API Key blocked: Deactivate 'HTTP Referrer' restrictions in Google Cloud Console for backend use.";
      } else if (lastError?.message?.includes("API_KEY_INVALID")) {
        errorMessage = "Gemini API Key invalid: Please check your configuration in Settings.";
      }

      throw new Error(errorMessage);
    } catch (error: any) {
      console.error("[AI] Error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Neural Engine failure", 
        details: error instanceof Error ? error.message : String(error) 
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
