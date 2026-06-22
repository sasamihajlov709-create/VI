// server.ts
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and Urlencoded body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- API Routes (MUST run before Vite middleware) ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: "firestore-only" });
  });

  // Automated metadata scraper for web page previews
  app.get("/api/metadata/scrape", async (req, res) => {
    const urlParam = req.query.url as string;
    if (!urlParam) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    const unescapeHtml = (str: string): string => {
      return str
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
    };

    const extractTag = (htmlText: string, regexes: RegExp[]): string => {
      for (const rx of regexes) {
        const match = htmlText.match(rx);
        if (match && match[1]) {
          return unescapeHtml(match[1].trim());
        }
      }
      return "";
    };

    try {
      const parsedUrl = new URL(urlParam);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return res.status(400).json({ error: "Invalid protocol. Only http/https supported." });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.json({
          title: parsedUrl.hostname,
          description: urlParam,
          image: "",
          url: urlParam
        });
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        if (contentType.startsWith("image/")) {
          return res.json({
            title: urlParam.split("/").pop() || "Image Preview",
            description: "Direct Image Link",
            image: urlParam,
            url: urlParam
          });
        }
        return res.json({
          title: parsedUrl.hostname,
          description: urlParam,
          image: "",
          url: urlParam
        });
      }

      const html = await response.text();

      const title = extractTag(html, [
        /<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i,
        /<meta\s+content=["'](.*?)["']\s+property=["']og:title["']/i,
        /<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i,
        /<title>(.*?)<\/title>/i
      ]) || parsedUrl.hostname;

      const description = extractTag(html, [
        /<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i,
        /<meta\s+content=["'](.*?)["']\s+property=["']og:description["']/i,
        /<meta\s+name=["']twitter:description["']\s+content=["'](.*?)["']/i,
        /<meta\s+name=["']description["']\s+content=["'](.*?)["']/i
      ]);

      let image = extractTag(html, [
        /<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i,
        /<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i,
        /<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i,
        /<link\s+rel=["']image_src["']\s+href=["'](.*?)["']/i
      ]);

      if (image && !image.startsWith("http://") && !image.startsWith("https://")) {
        try {
          image = new URL(image, parsedUrl.href).toString();
        } catch (_) {
          image = "";
        }
      }

      res.json({
        title,
        description,
        image,
        url: urlParam
      });
    } catch (e: any) {
      console.warn(`Error scraping url ${urlParam}:`, e.message);
      try {
        const u = new URL(urlParam);
        res.json({
          title: u.hostname,
          description: urlParam,
          image: "",
          url: urlParam
        });
      } catch (_) {
        res.status(400).json({ error: "Invalid URL format" });
      }
    }
  });

  // --- End API Routes ---

  // Vite middleware for development OR static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
