import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Coins.ph API Proxy
  app.get("/api/coins/klines", async (req, res) => {
    const { symbol, interval, limit } = req.query;
    try {
      const response = await fetch(`https://api.pro.coins.ph/openapi/quote/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 500}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy error klines:", error);
      res.status(500).json({ error: "Failed to fetch klines from Coins.ph" });
    }
  });

  app.get("/api/coins/ticker", async (req, res) => {
    const { symbol } = req.query;
    try {
      const response = await fetch(`https://api.pro.coins.ph/openapi/quote/v1/ticker/24hr?symbol=${symbol}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy error ticker:", error);
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
