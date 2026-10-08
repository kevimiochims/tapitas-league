import { cached, forget } from './cache'
import { getSheetRows } from './sheets'
import { getScoreboard, getEspnIdMap, getPlayerPhotos } from './espn'
import { getSleeperPlayers } from './sleeper'
import { getCommonsCategories, getCommonsCategoryByName, getCommonsPhotos } from './commonsPhotos'
import { getWeekEvents, getRecapPhotos, getDayPhotos, getWeekDays, getPlayerWeekTeams, largestEspnPhoto } from './espnArchive'
import { normalizeNflTeam } from './nflTeams'

// Foto automática de cada time no card do Power Rankings, tirada das notícias
// da ESPN (feed de fantasy e página de cada atleta). Junta as fotos de todos
// os titulares da semana (a foto de um jogador muitas vezes está na notícia de
// outro). Regra: a foto é do maior pontuador do time; só se não houver
// nenhuma foto dele passa para o 2º, depois o 3º... Para cada jogador vale a
// melhor que houver: foto da semana do jogo com ele como assunto da legenda,
// vídeo da semana, foto da semana que só o cita, foto de outra rodada da
// temporada. Sem nada na ESPN (semanas antigas), vale a galeria do jogador
// no Wikimedia Commons (foto livre, com crédito). A mesma foto não se repete
// em dois times na mesma semana.

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

// Resultado incompleto (o tempo acabou antes de olhar todos os times): não
// fica guardado, e a próxima chamada completa o que faltou
const partialResults = new WeakSet()
export const isPartialPhotos = result => partialResults.has(result)

export async function getPowerRankingPhotos(season, week) {
  const key = `pr-photos:v24:${season}|${week}`
  const result = await cached(key, 3 * 3600, () => findPowerRankingPhotos(season, week))
  if (partialResults.has(result)) forget(key)
  return result
}

function findPowerRankingPhotos(season, week) {
  return (async () => {
    // O site tem 60s por chamada; depois de 40s para de buscar fotos novas
    // (arquivo e Commons) e devolve o que já achou
    const started = Date.now()
    const late = () => Date.now() - started > 40000
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
    // (o feed da ESPN por jogador só guarda as últimas semanas: em semanas
    // antigas não traz nada daquela época e só gastaria tempo)
    const recentWeek = window && window.to > Date.now() - 120 * DAY
    const espnList = recentWeek ? Array.from(new Set(teams.flatMap(t => t.starters.map(p => p.espnId).filter(Boolean)))) : []
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
    // Procura nas sequências de 2 a 5 palavras da legenda, da primeira para a
    // última (com o nome mais longo valendo no empate), em vez de testar os
    // milhares de nomes conhecidos em cada legenda, o que deixava semanas
    // antigas (centenas de legendas) lentas demais
    const knownSet = new Set(knownNames)
    const firstNamedCache = new Map()
    const firstNamedIn = text => {
      if (firstNamedCache.has(text)) return firstNamedCache.get(text)
      const words = text.trim().split(' ')
      let best = null
      for (let j = 0, at = 0; j < words.length && !best; at += words[j].length + 1, j++) {
        for (let n = 5; n >= 2 && !best; n--) {
          if (j + n > words.length) continue
          const k = words.slice(j, j + n).join(' ')
          if (knownSet.has(k)) best = { i: at, k }
        }
      }
      firstNamedCache.set(text, best)
      return best
    }
    const firstNamed = new Map(photos.map(ph => [ph.url, firstNamedIn(ph.text)]))
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

    // Reserva: galeria do jogador no Wikimedia Commons (semanas antigas, que a
    // ESPN não guarda mais). Primeiro uma foto daquela temporada; senão a mais
    // próxima dela, mas só da carreira na NFL (nada de faculdade)
    const commonsCats = await getCommonsCategories(teams.flatMap(t => t.starters.slice(0, 3).map(p => p.espnId).filter(Boolean))).catch(() => ({}))
    const now = new Date()
    const nflSeason = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
    const seasonFrom = Date.UTC(Number(season), 7, 1)
    const seasonTo = Date.UTC(Number(season) + 1, 2, 1)
    // Sorteio estável por semana/time/jogador: semanas diferentes mostram
    // fotos diferentes do mesmo jogador, mas a mesma semana é sempre igual
    const pick = (list, seed) => {
      if (!list.length) return null
      let h = 0
      for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
      return list[h % list.length]
    }
    const commonsFor = async (p, team) => {
      const cat = (p.espnId && commonsCats[p.espnId]) || await getCommonsCategoryByName(p.full)
      if (!cat) return null
      // Estreia na NFL (só dá para calcular de quem está em atividade)
      const info = players.get(p.id)
      const rookie = info?.team && info?.yearsExp != null ? Date.UTC(nflSeason - info.yearsExp, 7, 1) : null
      // Fora só o que claramente não é ele em contexto de futebol
      const offTopic = /golf|pebble|celebrity|charity|tournament|wedding|concert|basketball|baseball|signing|autograph|visit|cemetery|memorial|hospital|white house|school|military|army|navy|air force|marine|troops|veteran|funeral|church|gala|premiere|red carpet/i
      const notGame = /interview|portrait|headshot|camp|practice|press|conference|cropped|parade|award|ceremony|visit|draft|combine|pro bowl|fan ?duel|podcast|welcome|family|injured|military|honored/i
      // "vs"/"at" em minúsculas ("Bears at Lions"); "AT&T" não conta
      const isGameTitle = t => /\b(vs\.?|versus|at)\b/.test(t) || /\b(game|week \d+|preseason|playoffs?|wild card|super bowl)\b/i.test(t)
      const isGameDay = d => { const x = new Date(d); const m = x.getUTCMonth(); const wd = x.getUTCDay(); return (m >= 8 || m === 0) && [0, 1, 4, 6].includes(wd) }
      const base = ph => ph.date && !used.has(ph.url) && (!rookie || ph.date >= rookie) && !offTopic.test(ph.title)
      const game = ph => base(ph) && !notGame.test(ph.title) && (isGameTitle(ph.title) || isGameDay(ph.date))
      const inSeason = ph => ph.date >= seasonFrom && ph.date < seasonTo
      const near = (ph, before, after) => ph.date >= Date.UTC(Number(season) - before, 7, 1) && ph.date < Date.UTC(Number(season) + after + 1, 2, 1)
      const seed = `${season}|${week}|${team}|${p.id}`
      // Sem .catch: Commons fora do ar (limite de pedidos) não é "sem foto"
      const [thisYear, nextYear, all] = await Promise.all([getCommonsPhotos(cat, season), getCommonsPhotos(cat, String(Number(season) + 1)), getCommonsPhotos(cat)])
      const seasonList = [...thisYear, ...nextYear]
      const pool = Array.from(new Map([...seasonList, ...all].map(ph => [ph.url, ph])).values())
      // Paisagem primeiro (cabe melhor no card); da melhor para a mais solta:
      // 1) jogo na temporada; 2) qualquer foto dele na temporada (entrevista,
      // treino...); 3) jogo em até 1 temporada antes/2 depois; 4) qualquer foto
      // em até 2 antes/3 depois. Dentro de cada etapa, sorteio por semana.
      // Só fotos de jogo com o nome dele no título: da temporada; senão de até
      // 1 temporada antes/2 depois. Paisagem primeiro; sorteio por semana.
      const last = norm(stripSuffix(p.full)).split(' ').pop()
      const named = ph => last.length >= 3 && norm(ph.title).includes(last)
      for (const tier of [ph => inSeason(ph), ph => near(ph, 1, 2)]) {
        const list = pool.filter(ph => game(ph) && named(ph) && tier(ph))
        const wide = list.filter(ph => ph.width > ph.height)
        const chosen = pick(wide.length ? wide : list, seed)
        if (chosen) return chosen
      }
      return null
    }

    // Arquivo da ESPN (recaps dos jogos e notícias de cada dia): fotos de jogo
    // de qualquer temporada. O jogador é reconhecido pelo nome do arquivo
    // ("nfl_u_rodgers04jr") no recap do jogo dele, ou pela legenda que começa
    // por ele. Retratos de cadastro ("Baldwin_Doug 140127") ficam de fora.
    const weekNums = (String(week).match(/\d+/g) || []).map(Number)
    const weekDays = await getWeekDays(season, week).catch(() => [])
    const dayPhotos = (await mapLimit(weekDays, 4, d => getDayPhotos(d).catch(() => []))).flat()
      .map(ph => ({ ...ph, text: ` ${norm(ph.caption)} ` }))
    const headshot = ph => /^\S+_\S+ \d{6}/.test(ph.caption) || /mug|headshot|_ms_|logo/i.test(ph.file)
    // Data da foto no próprio endereço (/photo/2014/1012/): só da temporada
    // (agosto a fevereiro); foto de abril é de offseason, não de jogo
    const urlDate = ph => { const m = String(ph.url).match(/\/photo\/(\d{4})\/(\d{2})(\d{2})\//); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null }
    const inSeasonPhoto = ph => { const t = urlDate(ph); if (!t) return true; const mo = new Date(t).getUTCMonth(); return t >= seasonFrom && t < seasonTo && (mo >= 7 || mo <= 1) }
    // Sobrenomes dos jogadores conhecidos: arquivo com o nome de OUTRO jogador
    // ("chi_jennings") é foto dele, mesmo que a legenda cite o nosso
    const lastNames = Array.from(new Set(knownNames.map(k => k.split(' ').pop()).filter(l => l.length >= 5)))
    const fileNamesOther = (ph, p) => {
      const mine = norm(stripSuffix(p.full)).split(' ').pop()
      const letters = ph.file.replace(/\.jpg$/, '').replace(/[^a-z]/g, '')
      return !letters.includes(mine) && lastNames.some(l => l !== mine && letters.includes(l))
    }
    const fileHas = (ph, p) => {
      const lastKey = norm(stripSuffix(p.full)).split(' ').pop().replace(/ /g, '')
      return lastKey.length >= 4 && ph.file.replace(/[^a-z]/g, '').includes(lastKey)
    }
    const captionLeads = (ph, p) => { const f = firstNamedIn(` ${norm(ph.caption)} `); return Boolean(f && f.i <= 60 && f.k === name(p)) }
    // Partidas de todas as semanas da temporada (buscadas uma vez, em paralelo)
    let seasonEventsPromise = null
    const seasonEvents = () => {
      if (!seasonEventsPromise) {
        seasonEventsPromise = mapLimit(Array.from({ length: 18 }, (_, i) => i + 1), 6, w => getWeekEvents(season, w).catch(() => []))
          .then(list => Object.fromEntries(list.map((events, i) => [i + 1, events])))
      }
      return seasonEventsPromise
    }
    const archiveFor = async (p, team) => {
      const [teamsByWeek, eventsByWeek] = await Promise.all([getPlayerWeekTeams(p.id, season).catch(() => ({})), seasonEvents()])
      const nflTeam = normalizeNflTeam(teamsByWeek[weekNums[0]] || teamsByWeek[weekNums[1]] || '')
      const ok = ph => !used.has(ph.url) && !headshot(ph) && inSeasonPhoto(ph)
      const matches = ph => ok(ph) && (fileHas(ph, p) || (captionLeads(ph, p) && !fileNamesOther(ph, p)))
      const gamesOf = (w, t) => (eventsByWeek[w] || []).filter(e => e.teams.map(normalizeNflTeam).includes(t))
      // 1) recap do jogo dele nesta semana
      if (nflTeam) {
        const events = weekNums.flatMap(w => gamesOf(w, nflTeam))
        const recaps = await mapLimit(events, 4, e => getRecapPhotos(e.id).catch(() => []))
        const hit = recaps.flat().find(matches)
        if (hit) return hit
      }
      // 2) notícias dos dias desta semana com ele como assunto da legenda
      const day = dayPhotos.filter(ph => ok(ph) && captionLeads(ph, p) && !fileNamesOther(ph, p) && ph.width >= ph.height)
        .sort((a, b) => (b.width || 0) - (a.width || 0))[0]
      if (day) return day
      // 3) recaps dos jogos do time dele em outras rodadas da temporada (em paralelo)
      const otherEvents = []
      for (let w = 1; w <= 18; w++) {
        if (weekNums.includes(w)) continue
        const t = normalizeNflTeam(teamsByWeek[w] || '')
        if (t) otherEvents.push(...gamesOf(w, t))
      }
      if (otherEvents.length) {
        const recaps = await mapLimit(otherEvents, 8, e => getRecapPhotos(e.id).catch(() => []))
        const chosen = pick(recaps.flat().filter(matches), `${season}|${week}|${team}|${p.id}`)
        if (chosen) return chosen
      }
      return null
    }

    // Os times são escolhidos um por vez (a mesma foto não pode ir para dois),
    // o que deixava semanas antigas lentas demais (mais de 1 minuto). Antes,
    // busca em paralelo o arquivo da ESPN de todos os titulares; a escolha
    // depois quase só lê o que já está guardado. Espera no máximo 20s: o que
    // não chegou continua sendo buscado e é aproveitado quando chegar. (O
    // Commons não entra aqui: ele bloqueia quem pede muito de uma vez.)
    const ahead = Array.from(new Map(teams.flatMap(t => t.starters).map(p => [p.id, p])).values())
    const allRecaps = async p => {
      const [teamsByWeek, eventsByWeek] = await Promise.all([getPlayerWeekTeams(p.id, season).catch(() => ({})), seasonEvents()])
      const events = []
      for (let w = 1; w <= 18; w++) {
        const t = normalizeNflTeam(teamsByWeek[w] || '')
        if (t) events.push(...(eventsByWeek[w] || []).filter(e => e.teams.map(normalizeNflTeam).includes(t)))
      }
      await mapLimit(events, 6, e => getRecapPhotos(e.id).catch(() => []))
    }
    if (!recentWeek) await Promise.race([mapLimit(ahead, 12, allRecaps), new Promise(r => setTimeout(r, 20000))])

    const used = new Set()
    const result = {}
    let partial = false
    for (const { team, starters } of teams) {
      const star = starters[0] || null
      let hit = null
      let who = null
      // Regra fixa: o maior pontuador; só sem nenhuma foto dele passa para o
      // 2º, depois o 3º (e assim por diante). Para cada um: ESPN, depois Commons
      for (const p of starters) {
        for (const [when, match] of rules) {
          const list = photos.filter(ph => !used.has(ph.url) && when(ph) && match(ph, p))
          // Foto da semana: a maior; de outras rodadas: sorteio por semana (varia)
          const found = when === photoSeason || when === stillSeason
            ? pick(list, `${season}|${week}|${team}|${p.id}`)
            : list.sort((a, b) => (b.width || 0) - (a.width || 0))[0]
          if (found) { hit = found; who = p; break }
        }
        // Arquivo e Commons: os 3 maiores primeiro; se nenhum deles tiver foto,
        // segue pelos outros titulares (melhor um titular do que card sem foto)
        if (!hit && late()) { partial = true; break }
        if (!hit) {
          const archived = await archiveFor(p, team).catch(() => null)
          if (archived) { hit = { ...archived, caption: archived.caption || archived.headline || '' }; who = p }
        }
        if (!hit) {
          const free = await commonsFor(p, team).catch(() => { partial = true; return null })
          if (free) { hit = { ...free, caption: free.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''), commons: true }; who = p }
        }
        if (hit) break
      }
      if (hit) used.add(hit.url)
      const shown = who || star
      result[team] = {
        url: hit ? (hit.commons ? hit.url : hit.source ? await largestEspnPhoto(hit.url) : await largest(hit.url)) : null,
        caption: hit?.caption || '',
        credit: hit?.commons ? hit.credit : '',
        player: shown?.full || '',
        playerId: shown?.id || null,
        pts: shown?.pts || 0,
      }
    }
    if (partial) partialResults.add(result)
    return result
  })()
}
