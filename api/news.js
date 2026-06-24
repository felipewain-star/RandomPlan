// api/news.js — Vercel Serverless Function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const sources = [
    { url: 'https://www.biobiochile.cl/lista/nacional.rss',     sub: 'chile',        ic: '🇨🇱' },
    { url: 'https://www.biobiochile.cl/lista/deportes.rss',     sub: 'futbol',       ic: '⚽'  },
    { url: 'https://www.biobiochile.cl/lista/economia.rss',     sub: 'finanzas',     ic: '💰'  },
    { url: 'https://www.biobiochile.cl/lista/tecnologia.rss',   sub: 'tecnologia',   ic: '💻'  },
    { url: 'https://www.cooperativa.cl/rss/noticias.xml',       sub: 'chile',        ic: '🇨🇱' },
    { url: 'https://feeds.bbci.co.uk/mundo/rss.xml',            sub: 'contingencia', ic: '🌍'  },
    { url: 'https://cnnespanol.cnn.com/feed/',                  sub: 'contingencia', ic: '📰'  },
    { url: 'https://www.mundodeportivo.com/rss/futbol.xml',     sub: 'futbol',       ic: '⚽'  },
    { url: 'https://as.com/rss/tags/mundial_2026.xml',          sub: 'futbol',       ic: '⚽'  },
  ];

  function isSpanish(text) {
    if (!text) return false;
    // must have Spanish accent chars OR multiple common Spanish words
    if (/[áéíóúñüÁÉÍÓÚÑÜ¿¡]/i.test(text)) return true;
    const esWords = ['chile','el ','la ','los ','las ','del ','que ','por ','con ','una ','para ','son ','fue ','han ','está ','están ','su ','sus ','se ','en ','al ','también','como '];
    const lower = text.toLowerCase();
    const count = esWords.filter(w => lower.includes(w)).length;
    return count >= 2;
  }

  function parseRSS(xml, sub, ic) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"') : '';
      const linkMatch = block.match(/<link[^>]*>([^<]+)<\/link>/);
      const link = linkMatch ? linkMatch[1].trim() : '';
      const descMatch = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
      const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g,'').trim().slice(0,200) : '';

      if (!title || title.length < 10) continue;
      if (!isSpanish(title)) continue; // skip English

      items.push({ title, link, desc, sub, ic });
      if (items.length >= 3) break;
    }
    return items;
  }

  const allItems = [];

  await Promise.allSettled(
    sources.map(async (src) => {
      try {
        const r = await fetch(src.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 RandomPlan/1.0' },
          signal: AbortSignal.timeout(4000)
        });
        if (!r.ok) return;
        const xml = await r.text();
        const items = parseRSS(xml, src.sub, src.ic);
        allItems.push(...items);
      } catch (e) {}
    })
  );

  allItems.sort(() => Math.random() - 0.5);
  res.json({ items: allItems.slice(0, 15), total: allItems.length });
}
