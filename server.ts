import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Helper for HTTPS requests
  const httpsRequest = (url: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      console.log(`[Proxy] Requesting: ${url}`);
      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        timeout: 10000 // 10s timeout
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse JSON: ${data.substring(0, 100)}`));
            }
          } else {
            console.error(`[Proxy] API Error: ${res.statusCode} - ${data.substring(0, 200)}`);
            reject(new Error(`Status ${res.statusCode}: ${data.substring(0, 100)}`));
          }
        });
      }).on('error', (err) => {
        console.error(`[Proxy] Connection Error: ${err.message}`);
        reject(err);
      }).on('timeout', () => {
        console.error('[Proxy] Request timed out');
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
