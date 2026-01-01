import { Router } from "express";
import * as cheerio from "cheerio";

const router = Router();

router.post("/extract-meta", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  try {
    const html = await fetch(url).then((r) => r.text());
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text() ||
      "";

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";

    const logo =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      "";

    const favicon =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      "";

    const faviconUrl = favicon && !favicon.startsWith("http")
      ? new URL(favicon, url).toString()
      : favicon;

    return res.json({ title, subtitle: description, logo: logo || faviconUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "extract_meta_failed";
    return res.status(500).json({ error: message });
  }
});

export default router;

