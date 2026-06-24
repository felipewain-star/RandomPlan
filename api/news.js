// v4
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');

  const sources = [
    { url: 'https://news.google.com/rss/search?q=chile+noticias&hl=es-CL&gl=CL&ceid=CL:es', sub: 'chile', ic: '🇨🇱', max: 4 },
    { url: 'https://news.google.com/rss/search?q=futbol+chile+mundial&hl=es-CL&gl=CL&ceid=CL:es', sub: 'futbol', ic: '⚽', max: 4 },
    { url: 'https://news.google.com/rss/search?q=economia+chile+dolar&hl=es-CL&gl=CL&ceid=CL:es', sub: 'finanzas', ic: '💰', max: 3 },
    { url: 'https://news.google.com/rss/search?q=mundial+2026&hl=es-CL&gl=CL&ceid=CL:es', sub: 'futbol', ic: '⚽', max: 3 },
    { url: 'https://news.google.com/rss/search?q=tecnologia+chile&hl=es-CL&gl=CL&ceid=CL:es', sub: 'tecnologia', ic: '💻', max: 2 },
  ];

  function cleanText(str) {
    if (!str) return '';
    return str
      .replace(/<[^>]+>/gi, '')
      .replace(/&lt;.*?&gt;/gi, '')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/https?:\/\/[^\s]*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isSpanish(text) {
    if (!text) return false;
    if (/[áéíóúñüÁÉÍÓÚÑÜ]/i.test(text)) return true;
    const words = ['chile','el ','la ','los ','las ','del ','que ','por ','con ','una ','para '];
    return words.filter(w => text.toLowerCase().includes(w)).length >= 2;
  }

  // Resolve Google News redirect URL to real article URL
  async function resolveUrl(url) {
    try {
      if (!url.includes('news.google.com')) return url;
      const r = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(3000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RandomPlan/1.0)' }
      });
      return r.url || url;
    } catch(e) {
      return url;
    }
  }

  function parseRSS(xml, sub, ic, max) {
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const b = m[1];
      const tMatch = b.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const lMatch = b.match(/<link[^>]*>([^<]+)<\/link>/);
      const dMatch = b.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

      const title = cleanText(tMatch ? tMatch[1] : '');
      const link = lMatch ? lMatch[1].trim() : '';
      const desc = cleanText(dMatch ? dMatch[1] : '').slice(0, 180);

      if (!title || title.length < 10 || !isSpanish(title)) continue;

      items.push({ title, link, desc, sub, ic });
      if (items.length >= max) break;
    }
    return items;
  }

  const allItems = [];
  await Promise.allSettled(sources.map(async (src) => {
    try {
      const r = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RandomPlan/1.0)' },
        signal: AbortSignal.timeout(5000)
      });
      if (!r.ok) return;
      allItems.push(...parseRSS(await r.text(), src.sub, src.ic, src.max));
    } catch(e) {}
  }));

  // Resolve all Google News URLs in parallel
  await Promise.allSettled(allItems.map(async (item) => {
    item.link = await resolveUrl(item.link);
  }));

  allItems.sort(() => Math.random() - 0.5);
  res.json({ items: allItems.slice(0, 15) });
}
