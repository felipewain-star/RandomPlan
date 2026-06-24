// api/news.js — Vercel Serverless Function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const sources = [
    { url: 'https://www.biobiochile.cl/lista/nacional.rss',       sub: 'chile',        ic: '🇨🇱' },
    { url: 'https://www.biobiochile.cl/lista/deportes.rss',       sub: 'futbol',       ic: '⚽'  },
    { url: 'https://www.biobiochile.cl/lista/economia.rss',       sub: 'finanzas',     ic: '💰'  },
    { url: 'https://www.biobiochile.cl/lista/tecnologia.rss',     sub: 'tecnologia',   ic: '💻'  },
    { url: 'https://www.cooperativa.cl/rss/noticias.xml',         sub: 'chile',        ic: '🇨🇱' },
    { url: 'https://feeds.bbci.co.uk/mundo/rss.xml',              sub: 'contingencia', ic: '🌍'  },
    { url: 'https://cnnespanol.cnn.com/feed/',                    sub: 'contingencia', ic: '📰'  },
    { url: 'https://www.espn.com/espn/rss/soccer/news',           sub: 'futbol',       ic: '⚽'  },
    { url: 'https://mundodeportivo.com/rss/futbol.xml',           sub: 'futbol',       ic: '⚽'  },
    { url: 'https://as.com/rss/tags/mundial_2026.xml',            sub: 'futbol',       ic: '⚽'  },
  ];

  function parseRSS(xml, sub, ic) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>') : '';
      const linkMatch = block.match(/<link[^>]*>([^<]+)<\/link>/);
      const link = linkMatch ? linkMatch[1].trim() : '';
      const descMatch = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
      const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g,'').trim().slice(0,200) : '';

      // Filter out English content
      const esWords = ['chile','el','la','los','las','en','de','que','por','con','del','un','una','se','para','es','son','fue','han','está','están'];
      const titleLower = title.toLowerCase();
      const wordCount = esWords.filter(w => titleLower.includes(' '+w+' ') || titleLower.startsWith(w+' ')).length;
      if(wordCount < 1 && !/[áéíóúñü]/i.test(title)) continue; // skip english

      if (title && title.length > 10) {
        items.push({ title, link, desc, sub, ic });
      }
      if (items.length >= 3) break;
    }
    return items;
  }

  const allItems = [];

  await Promise.allSettled(
    sources.map(async (src) => {
      try {
        const r = await fetch(src.url, {
          headers: { 'User-Agent': 'RandomPlan/1.0' },
          signal: AbortSignal.timeout(4000)
        });
        if (!r.ok) return;
        const xml = await r.text();
        const items = parseRSS(xml, src.sub, src.ic);
        allItems.push(...items);
      } catch (e) {}
    })
  );

  // shuffle y limitar
  allItems.sort(() => Math.random() - 0.5);
  res.json({ items: allItems.slice(0, 15), total: allItems.length });
}
