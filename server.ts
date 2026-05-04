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

  // Helper for HTTPS requests
  const httpsRequest = (url: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      console.log(`[Proxy] Requesting: ${url}`);
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        timeout: 15000 // Increased to 15s
      };

      https.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
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
      // Test with a simple ticker request
      await httpsRequest('https://api.pro.coins.ph/openapi/quote/v1/ticker/24hr?symbol=BTCPHP');
      res.json({ status: "ok", api: "connected" });
    } catch (error) {
      res.status(503).json({ status: "error", api: "disconnected", message: error instanceof Error ? error.message : String(error) });
    }
  });

  // Coins.ph API Proxy
  app.get("/api/coins/klines", async (req, res) => {
    const { symbol, interval, limit } = req.query;
    console.log(`[Proxy] Fetching klines for ${symbol} (${interval})`);
    try {
      const url = `https://api.pro.coins.ph/openapi/quote/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 500}`;
      const data = await httpsRequest(url);
      res.json(data);
    } catch (error) {
      console.error("[Proxy] Klines exception:", error);
      res.status(500).json({ error: "Failed to fetch klines from Coins.ph" });
    }
  });

  app.get("/api/coins/ticker", async (req, res) => {
    const { symbol } = req.query;
    console.log(`[Proxy] Fetching ticker for ${symbol || 'ALL'}`);
    try {
      const url = symbol 
        ? `https://api.pro.coins.ph/openapi/quote/v1/ticker/24hr?symbol=${symbol}`
        : `https://api.pro.coins.ph/openapi/quote/v1/ticker/24hr`;
      const data = await httpsRequest(url);
      res.json(data);
    } catch (error) {
      console.error("[Proxy] Ticker exception:", error);
      res.status(500).json({ error: "Failed to fetch ticker from Coins.ph" });
    }
  });

  // Neural Pulse AI Agent (Server-side to protect API Key)
  app.post("/api/ai/sentiment", async (req, res) => {
    const { candles } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      console.error("[AI] GEMINI_API_KEY is missing");
      return res.status(500).json({ error: "Neural Engine not configured. Please add GEMINI_API_KEY." });
    }

    if (!candles || !Array.isArray(candles)) {
      return res.status(400).json({ error: "Invalid candle data" });
    }

    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

      const recentData = candles.slice(-50).map((c: any) => ({
        t: new Date((c.time || 0) * 1000).toISOString(),
        o: c.open,
        h: c.high,
        l: c.low,
        c: c.close,
        v: c.volume
      }));

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

      const responseText = response.text;
      if (!responseText) throw new Error("No response from AI");
      
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.error("[AI] Error:", error);
      res.status(500).json({ 
        error: "Neural Engine failure", 
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
