import { Router, Request, Response } from 'express'
import * as cheerio from 'cheerio'

const router = Router()

// Helper to call Gemini via REST API (to avoid adding heavy dependencies)
async function summarizeWithGemini(text: string): Promise<{ title?: string, summary?: string, tags?: string[] } | null> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return null;

    // Truncate text to avoid token limits (e.g. 10k chars)
    const truncatedText = text.slice(0, 15000);

    const prompt = `
      你是一位专业的内容分析师。请分析以下网页文本内容，提取核心信息。
      请返回 JSON 格式结果，包含以下字段：
      - title: 能够概述文章内容的中文标题（不超过20字）。
      - summary: 一段详细的中文摘要，概括文章的核心观点、主要内容或工具的用途（100-200字）。
      - tags: 3-5个相关的中文标签。
      
      文本内容：
      ${truncatedText}
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (resultText) {
      return JSON.parse(resultText);
    }
    return null;
  } catch (e) {
    console.error('Gemini API error:', e);
    return null;
  }
}

router.post('/url', async (req: Request, res: Response) => {
  const { url } = req.body
  
  try {
    if (!url) return res.status(400).json({ error: 'URL is required' });

    console.log(`Scraping URL: ${url}`);
    
    // 1. Fetch HTML
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 2. Extract Basic Metadata (Fallback)
    const metaTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const metaDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const metaImage = $('meta[property="og:image"]').attr('content') || '';
    
    // Clean text for AI
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    // 3. AI Summarization
    let aiResult = null;
    if (bodyText.length > 200 && process.env.GOOGLE_API_KEY) {
       aiResult = await summarizeWithGemini(bodyText);
    }

    // 4. Merge Results
    const title = aiResult?.title || metaTitle || '无标题';
    const description = aiResult?.summary || metaDesc || '暂无摘要';
    const tags = aiResult?.tags || ['链接导入'];
    
    // Favicon
    let hostname = '';
    try { hostname = new URL(url).hostname; } catch(e) {}
    const logo_url = hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=128` : '';

    res.json({
      title,
      description,
      url,
      tags,
      logo_url,
      image_url: metaImage // Optional, can be used later
    });

  } catch (error: any) {
    console.error('Scrape error:', error);
    res.status(500).json({ error: '解析失败: ' + error.message });
  }
})

// New Endpoint for Raw Text Analysis
router.post('/text', async (req: Request, res: Response) => {
  const { text, userTitle } = req.body;

  try {
    if (!text) return res.status(400).json({ error: 'Text content is required' });

    // AI Summarization
    let aiResult = null;
    if (process.env.GOOGLE_API_KEY) {
       // Pass userTitle as context to Gemini if available
       const prompt = `
         你是一位专业的内容分析师。请分析以下文本内容，提取核心信息。
         ${userTitle ? `用户已提供标题：${userTitle}，请参考此标题但如果内容不符可重新拟定。` : ''}
         
         请返回 JSON 格式结果，包含以下字段：
         - title: 能够概述文章内容的中文标题（不超过20字）。
         - summary: 一段详细的中文摘要，概括文章的核心观点、主要内容或工具的用途（100-200字）。
         - tags: 3-5个相关的中文标签。
         
         文本内容：
         ${text.slice(0, 15000)}
       `;

       const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
          })
       });

       if (response.ok) {
           const data = await response.json();
           const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
           if (resultText) aiResult = JSON.parse(resultText);
       }
    }

    const title = aiResult?.title || userTitle || '手动录入内容';
    const subtitle = aiResult?.summary || '';
    const description = text; // Full content is kept as description
    const tags = aiResult?.tags || ['手动录入'];

    res.json({
      title,
      subtitle,
      description,
      tags
    });

  } catch (error: any) {
    console.error('Text analysis error:', error);
    res.status(500).json({ error: '分析失败: ' + error.message });
  }
});

export default router
