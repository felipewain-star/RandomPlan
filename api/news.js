export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const sources = [
    { url: 'https://www.biobiochile.cl/lista/nacional.rss',       sub: 'chile',        ic: '🇨🇱', weight: 3 },
    { url: 'https://www.biobiochile.cl/lista/deportes.rss',       sub: 'futbol',       ic: '⚽',  weight: 3 },
    { url: 'https://www.biobiochile.cl/lista/economia.rss',       sub: 'finanzas',     ic: '💰',  weight: 2 },
    { url: 'https://www.biobiochile.cl/lista/tecnologia.rss',     sub: 'tecnologia',   ic: '💻',  weight: 2 },
    { url: 'https://www.cooperativa.cl/rss/noticias.xml',         sub: 'chile',        ic: '🇨🇱', weight: 2 },
    { url: 'https://as.com/rss/tags/mundial_2026.xml',            sub: 'futbol',       ic: '⚽',  weight: 2 },
    { url: 'https://www.mundodeportivo.com/rss/futbol.xml',       sub: 'futbol',       ic: '⚽',  weight: 1 },
    { url: 'https://cnnespanol.cnn.com/feed/',                    sub: 'contingencia', ic: '📰',  weight: 1 },
    { url: 'https://feeds.bbci.co.uk/mundo/rss.xml',              sub: 'contingencia', ic: '🌍',  weight: 1 },
  ];

  function isSpanish(text) {
    if (!text) return false;
    if (/[áéíóúñüÁÉÍÓÚÑÜ¿¡]/i.test(text)) return true;
    const words = ['chile','el ','la ','los ','las ','del ','que ','por ','con ','una ','para ','son ','fue '];
    return words.filter(w => text.toLowerCase().includes(w)).length >= 2;
  }

  function parseRSS(xml, sub, ic, max) {
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const b = m[1];
      const t = b.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const l = b.match(/<link[^>]*>([^<]+)<\/link>/);
      const d = b.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
      const title = t ? t[1].trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"') : '';
      const link = l ? l[1].trim() : '';
      const desc = d ? d[1].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().slice(0,200) : '';
      if (!title || title.length < 10 || !isSpanish(title)) continue;
      // skip generic "sigue en directo" descriptions
      const cleanDesc = desc.toLowerCase();
      if(cleanDesc.startsWith('sigue en directo') || cleanDesc.startsWith('en directo')) continue;
      items.push({ title, link, desc, sub, ic });
      if (items.length >= max) break;
    }
    return items;
  }

  const allItems = [];
  await Promise.allSettled(sources.map(async (src) => {
    try {
      const r = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 RandomPlan/1.0' },
        signal: AbortSignal.timeout(4000)
      });
      if (!r.ok) return;
      const items = parseRSS(await r.text(), src.sub, src.ic, src.weight+1);
      allItems.push(...items);
    } catch(e) {}
  }));

  // shuffle but keep some order by sub variety
  allItems.sort(() => Math.random() - 0.5);
  res.json({ items: allItems.slice(0, 15) });
}
