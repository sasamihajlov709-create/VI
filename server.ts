// server.ts
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { chats, messages, calls } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and Urlencoded body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- API Routes (MUST run before Vite middleware) ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: process.env.SQL_DB_NAME ? "configured" : "offline" });
  });

  // User synchronization route
  app.post("/api/users/sync", requireAuth, async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Missing authentication payload" });
    }
    try {
      const { email, uid, name, picture } = req.user;
      const user = await getOrCreateUser(
        uid,
        email || `${uid}@placeholder.com`,
        undefined,
        name,
        picture
      );
      res.json({ status: "success", user });
    } catch (error: any) {
      console.error("Error syncing user to database:", error);
      res.status(500).json({ error: error.message || "Failed to sync user data" });
    }
  });

  // Fetch or create user record
  app.get("/api/users/profile", requireAuth, async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Missing authentication payload" });
    }
    try {
      const { uid, email } = req.user;
      const user = await getOrCreateUser(uid, email || `${uid}@placeholder.com`);
      res.json(user);
    } catch (error: any) {
      console.error("Error retrieving profile:", error);
      res.status(500).json({ error: error.message || "Failed to fetch user profile" });
    }
  });

  // Log voice call history
  app.post("/api/calls", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uuid, receiverId, status } = req.body;
      const callerId = req.user?.uid;
      if (!uuid || !callerId || !receiverId) {
        return res.status(400).json({ error: "Missing required call details" });
      }

      const newCall = await db.insert(calls)
        .values({
          uuid,
          callerId,
          receiverId,
          status: status || 'ringing'
        })
        .onConflictDoUpdate({
          target: calls.uuid,
          set: { status: status || 'ringing' }
        })
        .returning();

      res.status(201).json(newCall[0]);
    } catch (error: any) {
      console.error("Database call logging failed:", error);
      res.status(500).json({ error: "Failed to log call history" });
    }
  });

  // Update call status
  app.patch("/api/calls/:uuid", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uuid } = req.params;
      const { status } = req.body;
      if (!uuid || !status) {
        return res.status(400).json({ error: "Missing required call update details" });
      }

      const updated = await db.update(calls)
        .set({ status })
        .where(eq(calls.uuid, uuid))
        .returning();

      res.json(updated[0] || { status: "not_found" });
    } catch (error: any) {
      console.error("Database call update failed:", error);
      res.status(500).json({ error: "Failed to update call history" });
    }
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
