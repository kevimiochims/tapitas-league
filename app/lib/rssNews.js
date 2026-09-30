import { cached, fetchText } from './cache'
import { normalizePlayerKey } from './leagueRosters'

// Notícias de fantasy de outros sites, via RSS. Cada fonte tem endereços
// alternativos; se uma fonte falhar, as outras seguem funcionando.
const SOURCES = [
  { name: 'RotoWire', urls: ['https://www.rotowire.com/rss/news.php?sport=NFL'] },
  { name: 'RotoBaller', urls: ['https://www.rotoballer.com/player-news/feed?sport=nfl', 'https://www.rotoballer.com/category/nfl/feed'] },
  { name: 'FantasyPros', urls: ['https://www.fantasypros.com/nfl/rss/player-news.xml', 'https://www.fantasypros.com/rss/nfl/news.xml'] },
  { name: 'CBS Sports', urls: ['https://www.cbssports.com/rss/headlines/nfl/'] },
  { name: 'Pro Football Talk', urls: ['https://www.nbcsports.com/profootballtalk.rss', 'https://profootballtalk.nbcsports.com/feed/'] },
  { name: 'ESPN NFL', urls: ['https://www.espn.com/espn/rss/nfl/news'] },
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
  const attempts = []
  for (const url of src.urls) {
    try {
      const items = parseRss(await fetchText(url, { timeoutMs: 12000 }), src.name)
      attempts.push({ url, ok: true, items: items.length })
      if (items.length) return { name: src.name, items, attempts }
    } catch (err) {
      attempts.push({ url, ok: false, error: err.message })
    }
  }
  console.error(`[rss] ${src.name}: no items`, attempts)
  return { name: src.name, items: [], attempts }
}

// Resultado de cada fonte (para diagnóstico em /api/nfl/news-sources)
export function getRssSources() {
  return cached('rss:sources', 900, () => Promise.all(SOURCES.map(loadSource)))
}

// Todas as notícias recentes das fontes RSS
export async function getRssNews() {
  const sources = await getRssSources()
  return sources.flatMap(s => s.items)
}

// Liga notícias a jogadores pelo nome completo no título ou no resumo
export function matchNewsToPlayers(items, players) {
  // Variações do nome: "de von achane" e "devon achane" (apóstrofos e hífens)
  const keyed = players
    .filter(p => p?.name && p.pos !== 'DEF' && p.name.trim().split(/\s+/).length >= 2)
    .map(p => {
      const base = normalizePlayerKey(p.name)
      const joined = normalizePlayerKey(String(p.name).replace(/['’`.-]/g, ''))
      return { player: p, keys: Array.from(new Set([` ${base} `, ` ${joined} `])) }
    })
  const out = []
  items.forEach(n => {
    const raw = `${n.headline} ${n.description}`
    const text = ` ${normalizePlayerKey(raw)} `
    const textJoined = ` ${normalizePlayerKey(raw.replace(/['’`.-]/g, ''))} `
    const hit = keyed.find(k => k.keys.some(key => text.includes(key) || textJoined.includes(key)))
    if (hit) out.push({ ...n, player: hit.player })
  })
  return out
}
