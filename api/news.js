// api/news.js — Vercel Serverless Function
// Proxy RSS de BioBio, CNN Español, ESPN y Cooperativa
// Subir a /api/news.js en el repo GitHub

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300'); // cache 5 min

  const sources = [
    { url: 'https://www.biobiochile.cl/lista/nacional.rss',     sub: 'chile',        ic: '🇨🇱' },
    { url: 'https://www.biobiochile.cl/lista/deportes.rss',     sub: 'futbol',       ic: '⚽'  },
    { url: 'https://cnnespanol.cnn.com/feed/',                  sub: 'contingencia', ic: '📰'  },
    { url: 'https://www.cooperativa.cl/rss/noticias.xml',       sub: 'chile',        ic: '🇨🇱' },
    { url: 'https://www.espn.com/espn/rss/soccer/news',         sub: 'futbol',       ic: '⚽'  },
    { url: 'https://feeds.bbci.co.uk/mundo/rss.xml',            sub: 'contingencia', ic: '🌍'  },
    { url: 'https://www.biobiochile.cl/lista/economia.rss',     sub: 'finanzas',     ic: '💰'  },
    { url: 'https://www.biobiochile.cl/lista/tecnologia.rss',   sub: 'tecnologia',   ic: '💻'  },
  ];

  function parseRSS(xml, sub, ic) {
    const items = [];
    // match <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      // title
      const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      // link
      const linkMatch = block.match(/<link[^>]*>([^<]+)<\/link>/) || block.match(/<link[^>]*\/>/);
      const link = linkMatch ? linkMatch[1].trim() : '';
      // description
      const descMatch = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
      const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 200) : '';
      if (title && title.length > 5) {
        items.push({ title, link, desc, sub, ic });
      }
      if (items.length >= 3) break; // max 3 por fuente
    }
    return items;
  }

  const allItems = [];
  const errors = [];

  await Promise.allSettled(
    sources.map(async (src) => {
      try {
        const r = await fetch(src.url, {
          headers: { 'User-Agent': 'RandomPlan/1.0' },
          signal: AbortSignal.timeout(4000)
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const xml = await r.text();
        const items = parseRSS(xml, src.sub, src.ic);
        allItems.push(...items);
      } catch (e) {
        errors.push({ url: src.url, error: e.message });
      }
    })
  );

  // shuffle para mezclar fuentes
  allItems.sort(() => Math.random() - 0.5);

  res.json({ items: allItems.slice(0, 15), errors, total: allItems.length });
}
