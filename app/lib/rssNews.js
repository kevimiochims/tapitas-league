import { cached, fetchText } from './cache'
import { normalizePlayerKey } from './leagueRosters'

// Notícias de fantasy de outros sites, via RSS. Cada fonte tem endereços
// alternativos; se uma fonte falhar, as outras seguem funcionando.
const SOURCES = [
  { name: 'RotoWire', urls: ['https://www.rotowire.com/rss/news.php?sport=NFL'] },
  { name: 'RotoBaller', urls: ['https://www.rotoballer.com/player-news/feed?sport=nfl', 'https://www.rotoballer.com/category/nfl/feed'] },
  { name: 'FantasyPros', urls: ['https://www.fantasypros.com/nfl/rss/player-news.xml', 'https://www.fantasypros.com/rss/nfl/news.xml'] },
  { name: 'CBS Sports', urls: ['https://www.cbssports.com/rss/headlines/nfl/'] },
]

const decode = str => String(str || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#8217;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#8211;|&#8212;/g, '–')
  .replace(/\s+/g, ' ')
  .trim()

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? m[1] : ''
}

export function parseRss(xml, source) {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []
  return items.map(item => {
    const headline = decode(tag(item, 'title'))
    const link = decode(tag(item, 'link')) || (item.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || null
    const date = decode(tag(item, 'pubDate') || tag(item, 'published') || tag(item, 'updated') || tag(item, 'dc:date'))
    const published = date && !Number.isNaN(new Date(date).getTime()) ? new Date(date).toISOString() : null
    const description = decode(tag(item, 'description') || tag(item, 'summary') || tag(item, 'content:encoded')).slice(0, 400)
    return { id: `${source}:${link || headline}`, headline, description, published, url: link, source }
  }).filter(n => n.headline)
}

async function loadSource(src) {
  let lastError = null
  for (const url of src.urls) {
    try {
      const items = parseRss(await fetchText(url, { timeoutMs: 12000 }), src.name)
      if (items.length) return items
    } catch (err) { lastError = err }
  }
  if (lastError) console.error(`[rss] ${src.name}: ${lastError.message}`)
  return []
}

// Todas as notícias recentes das fontes RSS
export function getRssNews() {
  return cached('rss:news', 900, async () => {
    const lists = await Promise.all(SOURCES.map(loadSource))
    return lists.flat()
  })
}

// Liga notícias a jogadores pelo nome completo no título ou no resumo
export function matchNewsToPlayers(items, players) {
  const keyed = players
    .filter(p => p?.name && p.pos !== 'DEF' && p.name.trim().split(/\s+/).length >= 2)
    .map(p => ({ player: p, key: ` ${normalizePlayerKey(p.name)} ` }))
  const out = []
  items.forEach(n => {
    const text = ` ${normalizePlayerKey(`${n.headline} ${n.description}`)} `
    const hit = keyed.find(k => text.includes(k.key))
    if (hit) out.push({ ...n, player: hit.player })
  })
  return out
}
