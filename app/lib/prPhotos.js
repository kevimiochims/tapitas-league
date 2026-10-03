import { cached } from './cache'
import { getSheetRows } from './sheets'
import { getScoreboard, getEspnIdMap, getPlayerPhotos } from './espn'
import { getSleeperPlayers } from './sleeper'

// Foto automática de cada time no card do Power Rankings, tirada das notícias
// da ESPN (feed de fantasy e página de cada atleta). Junta as fotos de todos
// os titulares da semana (a foto de um jogador muitas vezes está na notícia de
// outro). Regra: a foto é do maior pontuador do time; só se não houver
// nenhuma foto dele passa para o 2º, depois o 3º... Para cada jogador vale a
// melhor que houver: foto da semana do jogo com ele como assunto da legenda,
// vídeo da semana, foto da semana que só o cita, foto de outra rodada da
// temporada. A mesma foto não se repete em dois times na mesma semana.

const DAY = 24 * 3600 * 1000
const num = v => Number(String(v ?? '').replace(',', '.')) || 0
const norm = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const stripSuffix = full => String(full || '').replace(/\s+(Jr|Sr|II|III|IV|V)\.?$/i, '').trim()

async function weekWindow(season, weekLabel) {
  const weeks = (String(weekLabel).match(/\d+/g) || []).map(Number)
  const dates = []
  for (const week of weeks) {
    const board = await getScoreboard({ week, season }).catch(() => null)
    ;(board?.games || []).forEach(g => { const t = Date.parse(g.date || ''); if (t) dates.push(t) })
  }
  if (!dates.length) return null
  return { from: Math.min(...dates) - DAY, to: Math.max(...dates) + 5 * DAY }
}

// A ESPN guarda a mesma foto em vários tamanhos; usa a de 1296px se existir
async function largest(url) {
  const big = url.replace(/_\d+x\d+_16-9\.jpg$/, '_1296x729_16-9.jpg')
  if (big === url) return url
  const ok = await fetch(big, { method: 'HEAD', signal: AbortSignal.timeout(5000) }).then(r => r.ok).catch(() => false)
  return ok ? big : url
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]) }
  }))
  return out
}

export function getPowerRankingPhotos(season, week) {
  return cached(`pr-photos:v6:${season}|${week}`, 3 * 3600, async () => {
    const [games, cacheRows, espnIds, players, window] = await Promise.all([
      getSheetRows('GAME_FACTS_ALL'),
      getSheetRows('_PLAYER_CACHE'),
      getEspnIdMap(),
      getSleeperPlayers(),
      weekWindow(season, week),
    ])

    // Nome → candidatos; com homônimos ("Kenneth Walker" RB e WR), vale quem
    // está num time da NFL e tem foto na ESPN
    const byName = new Map()
    cacheRows.forEach(r => {
      const id = String(r?.player_id || '').trim()
      if (!id || String(r?.position || '').toUpperCase() === 'DEF') return
      const full = String(r?.full_name || r?.name || '').trim()
      ;[r?.full_name, r?.name].forEach(n => {
        const k = norm(n)
        if (!k) return
        if (!byName.has(k)) byName.set(k, [])
        if (!byName.get(k).some(c => c.id === id)) byName.get(k).push({ id, full })
      })
    })
    const resolve = name => {
      const list = byName.get(norm(name)) || []
      const score = c => (players.get(c.id)?.team ? 2 : 0) + (espnIds[c.id] ? 1 : 0)
      return list.slice().sort((a, b) => score(b) - score(a))[0] || null
    }

    const rows = games.filter(g => String(g?.Season || '').trim() === String(season) && String(g?.Week || '').trim() === String(week))
    const teams = rows.map(row => {
      const starters = []
      for (let i = 1; i <= 13; i++) {
        const info = resolve(row?.[`S${i}_Name`])
        if (info) starters.push({ ...info, espnId: espnIds[info.id] || null, pts: num(row?.[`S${i}_Pts`]) })
      }
      starters.sort((a, b) => b.pts - a.pts)
      return { team: String(row?.Team || '').trim(), starters }
    })

    // Todas as fotos dos feeds dos titulares da semana, sem repetição
    const espnList = Array.from(new Set(teams.flatMap(t => t.starters.map(p => p.espnId).filter(Boolean))))
    const feeds = await mapLimit(espnList, 12, id => getPlayerPhotos(id).catch(() => []))
    const pool = new Map()
    feeds.flat().forEach(ph => { if (!pool.has(ph.url)) pool.set(ph.url, ph) })
    const photos = Array.from(pool.values()).map(ph => ({ ...ph, text: ` ${norm(ph.caption)} ` }))
    const seasonStart = Date.UTC(Number(season), 7, 1)
    const inWindow = ph => window && ph.published && ph.published >= window.from && ph.published <= window.to
    const sameSeason = ph => ph.published && ph.published >= seasonStart && ph.published <= (window ? window.to : Infinity)
    // Legenda que começa pelo jogador (ele é o assunto da foto) vale mais do
    // que uma que só o cita no meio, ao lado de outros
    const name = p => norm(stripSuffix(p.full))
    // O jogador é o assunto da foto quando é o primeiro jogador citado na
    // legenda, logo no começo ("Falcons wide receiver Drake London said...");
    // "DJ Moore should become Josh Allen's favorite target" é foto do DJ Moore
    const knownNames = Array.from(byName.keys()).filter(k => k.includes(' ') && k.length >= 7)
    const firstNamed = new Map()
    photos.forEach(ph => {
      let best = null
      knownNames.forEach(k => {
        const i = ph.text.indexOf(` ${k} `)
        if (i >= 0 && (!best || i < best.i || (i === best.i && k.length > best.k.length))) best = { i, k }
      })
      firstNamed.set(ph.url, best)
    })
    const leads = (ph, p) => {
      const first = firstNamed.get(ph.url)
      return Boolean(first && first.i <= 40 && first.k === name(p))
    }
    const mentions = (ph, p) => ph.text.includes(` ${name(p)} `)
    const photoWeek = ph => !ph.still && inWindow(ph)
    const stillWeek = ph => ph.still && inWindow(ph)
    const photoSeason = ph => !ph.still && sameSeason(ph)
    const stillSeason = ph => ph.still && sameSeason(ph)
    // Para cada jogador, da melhor foto para a pior: da semana com ele como
    // assunto, vídeo da semana, foto da semana que só o cita, e por fim fotos
    // de outras rodadas da temporada
    const rules = [
      [photoWeek, leads], [stillWeek, leads], [photoWeek, mentions], [stillWeek, mentions],
      [photoSeason, leads], [photoSeason, mentions], [stillSeason, leads], [stillSeason, mentions],
    ]

    const used = new Set()
    const result = {}
    for (const { team, starters } of teams) {
      const star = starters[0] || null
      let hit = null
      let who = null
      // Regra fixa: o maior pontuador; só sem nenhuma foto dele passa para o
      // 2º, depois o 3º (e assim por diante)
      for (const p of starters) {
        for (const [when, match] of rules) {
          const found = photos
            .filter(ph => !used.has(ph.url) && when(ph) && match(ph, p))
            .sort((a, b) => (b.width || 0) - (a.width || 0))[0]
          if (found) { hit = found; who = p; break }
        }
        if (hit) break
      }
      if (hit) used.add(hit.url)
      const shown = who || star
      result[team] = {
        url: hit ? await largest(hit.url) : null,
        caption: hit?.caption || '',
        player: shown?.full || '',
        playerId: shown?.id || null,
        pts: shown?.pts || 0,
      }
    }
    return result
  })
}
