import { cached } from './cache'
import { getSheetRows } from './sheets'
import { getEspnIdMap, getPlayerPhotos } from './espn'
import { getSleeperPlayers } from './sleeper'
import { getCommonsCategories, getCommonsCategoryByName, getCommonsPhotos } from './commonsPhotos'

// Uma foto de jogo de um jogador (para notícias sem foto, por exemplo):
//   1. a mais recente guardada no Drive para ele (aba PR_FOTOS);
//   2. a mais recente das notícias da ESPN em que ele é o assunto (primeiro
//      jogador citado na legenda);
//   3. uma foto de jogo da galeria dele no Wikimedia Commons (com crédito).

const norm = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const stripSuffix = full => String(full || '').replace(/\s+(Jr|Sr|II|III|IV|V)\.?$/i, '').trim()

function getKnownNames() {
  return cached('player-photo:names', 6 * 3600, async () => {
    const rows = await getSheetRows('_PLAYER_CACHE')
    return Array.from(new Set(rows.flatMap(r => [norm(r?.full_name)]).filter(k => k.includes(' ') && k.length >= 7)))
  })
}

function firstNamed(text, names) {
  let best = null
  names.forEach(k => {
    const i = text.indexOf(` ${k} `)
    if (i >= 0 && (!best || i < best.i || (i === best.i && k.length > best.k.length))) best = { i, k }
  })
  return best
}

const notGame = /interview|portrait|headshot|camp|practice|press|conference|cropped|signing|parade|award|ceremony|visit|draft|combine|pro bowl|fan ?duel|podcast|welcome|family|injured|military|honored|golf|pebble|celebrity|charity|tournament|wedding|concert/i
const isGameTitle = t => /\b(vs\.?|versus|at)\b/.test(t) || /\b(game|week \d+|preseason|playoffs?|wild card|super bowl)\b/i.test(t)
const isGameDay = d => { const x = new Date(d); const m = x.getUTCMonth(); return (m >= 8 || m === 0) && [0, 1, 4, 6].includes(x.getUTCDay()) }

export function getPlayerPhoto(sleeperId) {
  const id = String(sleeperId || '').trim()
  return cached(`player-photo:v3:${id}`, 6 * 3600, async () => {
    if (!id) return null
    // 1) Drive
    const saved = (await getSheetRows('PR_FOTOS').catch(() => []))
      .filter(r => String(r?.PlayerId || '').trim() === id && String(r?.FileId || '').trim())
      .pop()
    // Várias fotos (para notícias diferentes não repetirem a mesma); a 1ª é a principal
    const alts = []
    const add = (url, credit = '') => { if (url && !alts.some(a => a.url === url)) alts.push({ url, credit }) }
    if (saved) add(`/api/pr-photo/${encodeURIComponent(String(saved.FileId).trim())}`, String(saved.Credito || '').trim())

    const [players, espnIds, names] = await Promise.all([getSleeperPlayers(), getEspnIdMap(), getKnownNames()])
    const info = players.get(id)
    const espnId = espnIds[id]
    if (!info || !espnId) return alts.length ? { ...alts[0], alts } : null
    const me = norm(stripSuffix(info.name))

    // 2) ESPN: foto (não quadro de vídeo) com ele como assunto, a mais recente
    const photos = (await getPlayerPhotos(espnId).catch(() => []))
      .filter(ph => !ph.still)
      .map(ph => ({ ...ph, text: ` ${norm(ph.caption)} ` }))
      .filter(ph => { const f = firstNamed(ph.text, names); return f && f.i <= 40 && f.k === me })
      .sort((a, b) => (b.published || 0) - (a.published || 0))
    photos.slice(0, 6).forEach(ph => add(ph.url))
    if (alts.length >= 4) return { ...alts[0], alts }

    // 3) Commons: foto de jogo da carreira na NFL, a mais recente; sem foto de
    // jogo, qualquer foto dele no futebol (de preferência com o nome no título)
    const cat = (await getCommonsCategories([espnId]).catch(() => ({})))[espnId] || await getCommonsCategoryByName(info.name).catch(() => null)
    if (!cat) return alts.length ? { ...alts[0], alts } : null
    const now = new Date()
    const nflSeason = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
    const rookie = info.team && info.yearsExp != null ? Date.UTC(nflSeason - info.yearsExp, 7, 1) : 0
    const offTopic = /golf|pebble|celebrity|charity|tournament|wedding|concert|basketball|baseball|signing|autograph|visit|cemetery|memorial|hospital|white house|school|military|army|navy|troops|veteran|funeral|church|gala|premiere|red carpet/i
    const last = me.split(' ').pop()
    const all = (await getCommonsPhotos(cat).catch(() => []))
      .filter(ph => ph.date && ph.date >= rookie && !offTopic.test(ph.title))
      .sort((a, b) => b.date - a.date)
    const named = ph => last.length >= 3 && norm(ph.title).includes(last)
    const game = ph => !notGame.test(ph.title) && (isGameTitle(ph.title) || isGameDay(ph.date))
    const ranked = [
      ...all.filter(ph => named(ph) && game(ph) && ph.width > ph.height),
      ...all.filter(ph => named(ph) && game(ph)),
      ...all.filter(ph => game(ph) && ph.width > ph.height),
      ...all.filter(ph => named(ph)),
    ]
    ;(ranked.length ? ranked : all).slice(0, 8).forEach(ph => add(ph.url, ph.credit))
    return alts.length ? { ...alts[0], alts: alts.slice(0, 8) } : null
  })
}
