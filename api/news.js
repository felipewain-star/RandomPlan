export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  // Google News RSS - funciona desde Vercel sin bloqueo
  const sources = [
    { url: 'https://news.google.com/rss/search?q=chile+noticias&hl=es-CL&gl=CL&ceid=CL:es', sub: 'chile', ic: '🇨🇱', max: 4 },
    { url: 'https://news.google.com/rss/search?q=futbol+chile+mundial&hl=es-CL&gl=CL&ceid=CL:es', sub: 'futbol', ic: '⚽', max: 4 },
    { url: 'https://news.google.com/rss/search?q=economia+chile+dolar&hl=es-CL&gl=CL&ceid=CL:es', sub: 'finanzas', ic: '💰', max: 3 },
    { url: 'https://news.google.com/rss/search?q=mundial+2026&hl=es-CL&gl=CL&ceid=CL:es', sub: 'futbol', ic: '⚽', max: 3 },
    { url: 'https://news.google.com/rss/search?q=tecnologia+inteligencia+artificial&hl=es-CL&gl=CL&ceid=CL:es', sub: 'tecnologia', ic: '💻', max: 2 },
  ];

  function isSpanish(text) {
    if (!text) return false;
    if (/[áéíóúñüÁÉÍÓÚÑÜ]/i.test(text)) return true;
    const words = ['chile','el ','la ','los ','las ','del ','que ','por ','con ','una ','para '];
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
      const title = t ? t[1].trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>') : '';
      const link = l ? l[1].trim() : '';
      const desc = d ? d[1].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().slice(0,200) : '';
      if (!title || title.length < 10 || !isSpanish(title)) continue;
      if (/^(sigue|en directo|live)/i.test(desc)) continue;
      items.push({ title, link, desc, sub, ic });
      if (items.length >= max) break;
    }
    return items;
  }

  const allItems = [];
  const errors = [];

  await Promise.allSettled(sources.map(async (src) => {
    try {
      const r = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RandomPlan/1.0)' },
        signal: AbortSignal.timeout(5000)
      });
      if (!r.ok) { errors.push(src.url + ' -> ' + r.status); return; }
      const xml = await r.text();
      allItems.push(...parseRSS(xml, src.sub, src.ic, src.max));
    } catch(e) {
      errors.push(src.url.slice(0,50) + ' -> ' + e.message);
    }
  }));

  allItems.sort(() => Math.random() - 0.5);
  res.json({ items: allItems.slice(0, 15), total: allItems.length, errors });
}
