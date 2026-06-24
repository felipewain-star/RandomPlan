export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const sources = [
    { url: 'https://news.google.com/rss/search?q=chile+noticias&hl=es-CL&gl=CL&ceid=CL:es', sub: 'chile', ic: '🇨🇱', max: 4 },
    { url: 'https://news.google.com/rss/search?q=futbol+chile+mundial&hl=es-CL&gl=CL&ceid=CL:es', sub: 'futbol', ic: '⚽', max: 4 },
    { url: 'https://news.google.com/rss/search?q=economia+chile+dolar&hl=es-CL&gl=CL&ceid=CL:es', sub: 'finanzas', ic: '💰', max: 3 },
    { url: 'https://news.google.com/rss/search?q=mundial+2026&hl=es-CL&gl=CL&ceid=CL:es', sub: 'futbol', ic: '⚽', max: 3 },
    { url: 'https://news.google.com/rss/search?q=tecnologia+inteligencia+artificial+chile&hl=es-CL&gl=CL&ceid=CL:es', sub: 'tecnologia', ic: '💻', max: 2 },
  ];

  function cleanText(str) {
    if (!str) return '';
    return str
      .replace(/<[^>]+>/g, '')        // remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

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
      const tMatch = b.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const lMatch = b.match(/<link[^>]*>([^<]+)<\/link>/);
      const dMatch = b.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

      const title = cleanText(tMatch ? tMatch[1] : '');
      const link = lMatch ? lMatch[1].trim() : '';
      const desc = cleanText(dMatch ? dMatch[1] : '').slice(0, 200);

      if (!title || title.length < 10 || !isSpanish(title)) continue;
      if (/^(sigue|en directo|live)/i.test(desc)) continue;

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

  allItems.sort(() => Math.random() - 0.5);
  res.json({ items: allItems.slice(0, 15) });
}
