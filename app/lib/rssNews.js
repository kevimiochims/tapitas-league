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

const NAMED_ENTITIES = {
  nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>',
  rsquo: "'", lsquo: "'", sbquo: "'", rdquo: '"', ldquo: '"', bdquo: '"',
  ndash: '–', mdash: '—', hellip: '…', prime: "'", acute: "'",
}

// Decodifica entidades HTML (nomeadas, &#39; e &#x27;) — sem isso "De&rsquo;Von"
// não bate com "De'Von"
function decodeEntities(str) {
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? m
  })
}

const decode = str => decodeEntities(decodeEntities(String(str || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')))
  .replace(/[\u2018\u2019\u02BC\u0060\u00B4]/g, "'")
  .replace(/\s+/g, ' ')
  .trim()

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? m[1] : ''
}

// Foto da matéria: media:content / media:thumbnail / enclosure de imagem, ou a
// primeira <img> do resumo ou do conteúdo
function rssImage(item) {
  const attr = re => decodeEntities((item.match(re) || [])[1] || '')
  const url = attr(/<media:content[^>]*\burl="([^"]+)"[^>]*>/i)
    || attr(/<media:thumbnail[^>]*\burl="([^"]+)"/i)
    || attr(/<enclosure[^>]*\burl="([^"]+)"[^>]*type="image/i)
    || attr(/<enclosure[^>]*type="image[^"]*"[^>]*\burl="([^"]+)"/i)
    || (decodeEntities(item).match(/<img[^>]*\bsrc="([^"]+)"/i) || [])[1] || ''
  return /^https?:\/\//.test(url) && !/\.(mp4|mp3|m4a)(\?|$)/i.test(url) ? url : null
}

export function parseRss(xml, source) {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []
  return items.map(item => {
    const headline = decode(tag(item, 'title'))
    const link = decode(tag(item, 'link')) || (item.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || null
    const date = decode(tag(item, 'pubDate') || tag(item, 'published') || tag(item, 'updated') || tag(item, 'dc:date'))
    const published = date && !Number.isNaN(new Date(date).getTime()) ? new Date(date).toISOString() : null
    const description = decode(tag(item, 'description') || tag(item, 'summary') || tag(item, 'content:encoded')).slice(0, 400)
    return { id: `${source}:${link || headline}`, headline, description, published, url: link, source, image: rssImage(item) }
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

// Liga notícias a jogadores pelo nome completo no título ou no resumo.
// `loose` (busca de um jogador só): também aceita só o sobrenome, se ele tiver
// 5+ letras (ex.: "Dolphins' Achane carted off").
export function matchNewsToPlayers(items, players, { loose = false } = {}) {
  // Variações do nome: "de von achane" e "devon achane" (apóstrofos e hífens)
  const keyed = players
    .filter(p => p?.name && p.pos !== 'DEF' && p.name.trim().split(/\s+/).length >= 2)
    .map(p => {
      const base = normalizePlayerKey(p.name)
      const joined = normalizePlayerKey(String(p.name).replace(/['’`.-]/g, ''))
      return { player: p, keys: Array.from(new Set([` ${base} `, ` ${joined} `])), last: joined.split(' ').pop() || '' }
    })
  const out = []
  items.forEach(n => {
    const raw = `${n.headline} ${n.description}`
    const text = ` ${normalizePlayerKey(raw)} `
    const textJoined = ` ${normalizePlayerKey(raw.replace(/['’`.-]/g, ''))} `
    // Todos os jogadores citados (ex.: relatório de lesões com vários nomes),
    // na ordem em que aparecem no texto
    let hits = keyed
      .map(k => ({ k, at: Math.min(...k.keys.map(key => { const i = text.indexOf(key); const j = textJoined.indexOf(key); return Math.min(i < 0 ? Infinity : i, j < 0 ? Infinity : j) })) }))
      .filter(h => h.at !== Infinity)
      .sort((a, b) => a.at - b.at)
      .map(h => h.k)
    if (!hits.length && loose) {
      const hit = keyed.find(k => k.last.length >= 5 && (text.includes(` ${k.last} `) || textJoined.includes(` ${k.last} `)))
      if (hit) hits = [hit]
    }
    if (hits.length) out.push({ ...n, player: hits[0].player, players: hits.map(h => h.player) })
  })
  return out
}
