// Dossiê para os recaps de IA (Apps Script + Gemini).
//
// A ideia: o código calcula, a IA escreve. Aqui juntamos tudo o que a liga
// sabe sobre um confronto (ou um time, no Power Ranking) — histórico do
// confronto, recordes, sequências, campanha, títulos, transações, recaps
// anteriores — e transformamos em "ganchos" prontos. As piadas internas
// (LORE) ficam numa planilha privada e são somadas pelo Apps Script, não aqui.
// A IA não precisa fazer conta nenhuma: só escolher a história e contar.
//
// Regra de cronologia: só entram jogos até a semana pedida (nada do futuro),
// para que recaps de temporadas antigas não "saibam" o que veio depois.

import { getSheetRows } from './sheets'
import { getLeagueTransactions } from './leagueTransactions'
import { getLeagueInfo, getSleeperWeek } from './leagueSchedule'

const ROSTER_CONFIG = {
  2014: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, def: 1 },
  2015: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, def: 1 },
  2016: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, def: 1 },
  2021: { qb: 2, rb: 3, wr: 3, te: 1, flex: 2, k: 1, def: 1 },
  2022: { qb: 2, rb: 3, wr: 3, te: 1, flex: 2, k: 1, def: 1 },
  2023: { qb: 2, rb: 2, wr: 2, te: 1, flex: 3, k: 1, def: 1 },
}

function rosterSlots(season) {
  const year = Number(season)
  const key = Object.keys(ROSTER_CONFIG).map(Number).filter(y => y <= year).sort((a, b) => b - a)[0] || 2023
  const c = ROSTER_CONFIG[key]
  const slots = []
  const add = (pos, n) => { for (let i = 0; i < n; i++) slots.push(pos) }
  add('QB', c.qb); add('RB', c.rb); add('WR', c.wr); add('TE', c.te); add('FLEX', c.flex); add('K', c.k); add('DEF', c.def)
  return slots
}

// Números da planilha vêm com vírgula decimal ("123,45")
export function num(value) {
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const n = Number(cleaned)
  return Number.isNaN(n) ? 0 : n
}

const str = v => String(v ?? '').trim()
const norm = v => str(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const f2 = n => (Math.round(n * 100) / 100).toFixed(2)
const isDouble = g => /[-&]/.test(str(g.Week))
const weekNum = g => parseFloat(str(g.Week)) || 0
const stage = g => norm(g.GameStage)
const gtype = g => norm(g.GameType)
const isFinal = g => gtype(g) === 'tapitas bowl'
const isUnicorn = g => ['unicornio', 'unicorn'].includes(gtype(g))
const order = g => Number(str(g.Season)) * 100 + weekNum(g)
const resultOf = g => {
  const r = str(g.Result).toUpperCase()
  if (r) return r[0]
  const pf = num(g.PF), pa = num(g.PA)
  return pf > pa ? 'W' : pf < pa ? 'L' : 'T'
}
const field = (g, ...names) => { for (const n of names) if (g?.[n] !== undefined && g?.[n] !== '') return g[n]; return '' }
const ordinal = n => `${n}º`
// Para palavras femininas (pontuação, vitória): "a maior" / "a 3ª maior"
const rankF = (n, word) => (n === 1 ? `a ${word}` : `a ${n}ª ${word}`)

// Vaga do titular no texto do dossiê. A vaga FLEX fica de fora: estar no FLEX
// é estratégia do time (e a ordem das vagas na planilha já veio errada), então
// a IA não deve comentar em que vaga o jogador atuou.
const slotLabel = p => (p.slot && p.slot !== 'FLEX' ? ` (${p.slot})` : '')

// Jogadores de uma linha (titulares com a vaga, banco)
function lineup(g) {
  const slots = rosterSlots(g.Season)
  const starters = []
  for (let i = 1; i <= 15; i++) {
    const name = str(g[`S${i}_Name`])
    if (!name || name === '--empty--') continue
    starters.push({ name, pts: num(g[`S${i}_Pts`]), slot: slots[i - 1] || '' })
  }
  const bench = []
  for (let i = 1; i <= 10; i++) {
    const name = str(g[`B${i}_Name`])
    if (!name || name === '--empty--') continue
    bench.push({ name, pts: num(g[`B${i}_Pts`]) })
  }
  return { starters, bench }
}

// Abreviação para casar nomes ("Josh Allen" ↔ "J. Allen")
const abbr = name => {
  const parts = norm(name).replace(/[.'’]/g, '').replace(/\b(jr|sr|ii|iii|iv)\b/g, '').split(/\s+/).filter(Boolean)
  return parts.length > 1 ? `${parts[0][0]} ${parts.slice(1).join(' ')}` : parts.join(' ')
}

// Uma linha por time/jogo (sem duplicar a mesma semana do mesmo time)
function teamGames(games) {
  const seen = new Set()
  return games.filter(g => {
    const key = `${norm(g.Team)}|${str(g.Season)}|${str(g.Week)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Títulos, vices e unicórnios por temporada (decididos até o momento)
function honors(games) {
  const bySeason = {}
  games.forEach(g => {
    const s = str(g.Season)
    if (isFinal(g)) {
      bySeason[s] = bySeason[s] || {}
      if (resultOf(g) === 'W') bySeason[s].champion = str(g.Team)
      if (resultOf(g) === 'L') bySeason[s].vice = str(g.Team)
    }
    if (isUnicorn(g) && resultOf(g) === 'L') {
      bySeason[s] = bySeason[s] || {}
      bySeason[s].unicorn = str(g.Team)
    }
  })
  return bySeason
}

// Classificação da temporada regular até a semana (vitórias, depois PF)
function standings(rows, season) {
  const acc = {}
  rows.filter(g => str(g.Season) === season && stage(g) === 'reg season').forEach(g => {
    const t = str(g.Team)
    acc[t] = acc[t] || { team: t, w: 0, l: 0, t: 0, pf: 0, n: 0 }
    const r = resultOf(g)
    if (r === 'W') acc[t].w++
    else if (r === 'L') acc[t].l++
    else acc[t].t++
    acc[t].pf += num(g.PF)
    acc[t].n++
  })
  return Object.values(acc).sort((a, b) => b.w - a.w || b.pf - a.pf).map((r, i) => ({ ...r, rank: i + 1 }))
}

function recordStr(r) { return r ? `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}` : '' }

// Sequência atual de um time antes de um jogo (W/L seguidas, todas as fases)
function streakBefore(rows, team, g) {
  const prev = rows.filter(x => norm(x.Team) === norm(team) && order(x) < order(g)).sort((a, b) => order(b) - order(a))
  if (!prev.length) return null
  const first = resultOf(prev[0])
  let n = 0
  for (const x of prev) { if (resultOf(x) === first) n++; else break }
  return { type: first, n }
}

function h2h(rows, a, b, g) {
  const meetings = rows
    .filter(x => norm(x.Team) === norm(a) && norm(x.Opponent) === norm(b) && order(x) <= order(g))
    .sort((x, y) => order(x) - order(y))
  let wa = 0, wb = 0
  meetings.forEach(x => { const r = resultOf(x); if (r === 'W') wa++; else if (r === 'L') wb++ })
  // Sequência atual no confronto (contando este jogo)
  let streakTeam = null, streakN = 0
  for (let i = meetings.length - 1; i >= 0; i--) {
    const r = resultOf(meetings[i])
    const winner = r === 'W' ? a : r === 'L' ? b : null
    if (!winner) break
    if (!streakTeam) { streakTeam = winner; streakN = 1 } else if (winner === streakTeam) streakN++
    else break
  }
  const before = meetings.filter(x => order(x) < order(g))
  const lastWinOf = team => [...before].reverse().find(x => (resultOf(x) === 'W' ? a : resultOf(x) === 'L' ? b : null) === team)
  const playoffs = meetings.filter(x => stage(x) === 'playoffs' || isFinal(x) || isUnicorn(x))
  return { meetings, before, wa, wb, streakTeam, streakN, lastWinOf, playoffs }
}

const gameLabel = g => `${str(g.Season)} W${str(g.Week)}${str(g.GameType) && stage(g) !== 'reg season' ? ` (${str(g.GameType)})` : ''}`

// ── Contexto de um confronto ────────────────────────────────────────────
async function loadData() {
  const [games, tx] = await Promise.all([
    getSheetRows('GAME_FACTS_ALL'),
    getLeagueTransactions().catch(() => ({ transactions: [] })),
  ])
  return { games, transactions: tx?.transactions || [] }
}

// Ganchos de um time no jogo (recordes, sequência, jogadores...)
function teamAngles({ rows, team, opp, g, oppG, weekRows, seasonRows }) {
  const angles = []
  const pf = num(g.PF)
  const pa = num(g.PA)
  const r = resultOf(g)
  const margin = Math.abs(pf - pa)

  // Pontuação: semana, temporada, histórico
  const weekScores = weekRows.map(x => num(x.PF)).sort((a, b) => b - a)
  const wRank = weekScores.indexOf(pf) + 1
  if (wRank === 1 && weekScores.length > 2) angles.push({ w: 3, text: `${team} fez a maior pontuação da semana (${f2(pf)}).` })
  if (wRank === weekScores.length && weekScores.length > 2) angles.push({ w: 3, text: `${team} fez a menor pontuação da semana (${f2(pf)}).` })
  if (r === 'L' && wRank > 0 && wRank <= 3 && weekScores.length > 4) angles.push({ w: 3, text: `${team} perdeu mesmo com ${rankF(wRank, 'maior pontuação')} da semana (${f2(pf)}).` })
  if (r === 'W' && wRank >= weekScores.length - 2 && weekScores.length > 4) angles.push({ w: 3, text: `${team} venceu com uma das piores pontuações da semana (${wRank}ª de ${weekScores.length}, ${f2(pf)}).` })

  if (!isDouble(g)) {
    const single = rows.filter(x => !isDouble(x))
    const all = single.map(x => num(x.PF)).sort((a, b) => b - a)
    const rank = all.indexOf(pf) + 1
    if (rank > 0 && rank <= 15) angles.push({ w: 5, text: `${f2(pf)} pontos é ${rankF(rank, 'maior pontuação')} da história da liga (semanas simples, ${all.length} pontuações).` })
    const low = [...all].reverse().indexOf(pf) + 1
    if (low > 0 && low <= 15) angles.push({ w: 5, text: `${f2(pf)} pontos é ${rankF(low, 'MENOR pontuação')} da história da liga (semanas simples).` })
    const own = single.filter(x => norm(x.Team) === norm(team)).map(x => num(x.PF)).sort((a, b) => b - a)
    if (own.length > 5 && own[0] === pf) angles.push({ w: 4, text: `Maior pontuação de ${team} em toda a história da franquia.` })
    if (own.length > 5 && own[own.length - 1] === pf) angles.push({ w: 4, text: `Menor pontuação de ${team} em toda a história da franquia.` })
    const seasonOwn = seasonRows.filter(x => norm(x.Team) === norm(team) && !isDouble(x)).map(x => num(x.PF))
    if (seasonOwn.length > 2 && Math.max(...seasonOwn) === pf) angles.push({ w: 2, text: `Melhor pontuação de ${team} na temporada.` })
    if (seasonOwn.length > 2 && Math.min(...seasonOwn) === pf) angles.push({ w: 2, text: `Pior pontuação de ${team} na temporada.` })
    if (pf >= 200) {
      const n200 = single.filter(x => norm(x.Team) === norm(team) && num(x.PF) >= 200).length
      const total200 = single.filter(x => num(x.PF) >= 200).length
      angles.push({ w: 4, text: `${team} passou dos 200 pontos: é o ${ordinal(n200)} jogo de 200+ da franquia e o ${ordinal(total200)} da liga.` })
    }
  }

  // Sequência (antes deste jogo)
  const before = streakBefore(rows, team, g)
  if (before && before.n >= 3) {
    if (before.type === r) angles.push({ w: 3, text: `${team} chegou a ${before.n + 1} ${r === 'W' ? 'vitórias' : 'derrotas'} seguidas.` })
    else if (before.type === 'W') angles.push({ w: 4, text: `${team} tinha ${before.n} vitórias seguidas e a sequência acabou aqui.` })
    else if (before.type === 'L') angles.push({ w: 4, text: `${team} quebrou uma sequência de ${before.n} derrotas.` })
  }

  // Jogadores
  const { starters, bench } = lineup(g)
  const top = [...starters].sort((a, b) => b.pts - a.pts)[0]
  if (top) {
    const allPlayerPts = rows.flatMap(x => lineup(x).starters.map(p => p.pts)).sort((a, b) => b - a)
    const pr = allPlayerPts.indexOf(top.pts) + 1
    const weekPlayerPts = weekRows.flatMap(x => lineup(x).starters.map(p => p.pts)).sort((a, b) => b - a)
    let line = `Destaque de ${team}: ${top.name}${slotLabel(top)} com ${f2(top.pts)} pontos (${top.pts && pf ? Math.round((top.pts / pf) * 100) : 0}% do time).`
    if (weekPlayerPts[0] === top.pts) line += ' Maior pontuação de um jogador na semana.'
    if (pr > 0 && pr <= 25) line += ` É ${rankF(pr, 'maior pontuação')} de um jogador na história da liga.`
    angles.push({ w: pr > 0 && pr <= 25 ? 4 : 2, text: line })
  }
  const flop = starters.filter(p => p.slot !== 'K' && p.slot !== 'DEF').sort((a, b) => a.pts - b.pts)[0]
  if (flop && flop.pts <= 3) angles.push({ w: 2, text: flop.pts === 0 ? `${flop.name}${slotLabel(flop)} zerou como titular de ${team}.` : `${flop.name}${slotLabel(flop)} fez só ${f2(flop.pts)} pontos como titular de ${team}.` })
  // Banco e escalação ideal ficam de fora dos ganchos de propósito: a IA tendia
  // a sugerir trocas impossíveis ("era só pôr o QB do banco"). O banco segue nas
  // ESCALAÇÕES para quem quiser olhar.

  // Margem
  if (r === 'W' && margin < 5) angles.push({ w: 3, text: `Vitória por apenas ${f2(margin)} pontos.` })
  return angles
}

function franchiseLine(team, hon, rows) {
  const titles = [], vices = [], unicorns = []
  Object.entries(hon).forEach(([s, h]) => {
    if (norm(h.champion) === norm(team)) titles.push(s)
    if (norm(h.vice) === norm(team)) vices.push(s)
    if (norm(h.unicorn) === norm(team)) unicorns.push(s)
  })
  const own = rows.filter(x => norm(x.Team) === norm(team))
  const w = own.filter(x => resultOf(x) === 'W').length
  const l = own.filter(x => resultOf(x) === 'L').length
  const seasons = [...new Set(own.map(x => str(x.Season)))]
  const parts = [`${team}: ${seasons.length} temporadas, ${w}-${l} na história`]
  parts.push(titles.length ? `títulos: ${titles.join(', ')}` : 'nenhum título')
  if (vices.length) parts.push(`vices: ${vices.join(', ')}`)
  if (unicorns.length) parts.push(`unicórnios: ${unicorns.join(', ')}`)
  const lastTitle = titles.map(Number).sort((a, b) => b - a)[0]
  const firstSeason = seasons.map(Number).sort((a, b) => a - b)[0]
  if (titles.length && lastTitle) parts.push(`último título em ${lastTitle}`)
  else if (firstSeason) parts.push(`na liga desde ${firstSeason}, ainda sem título`)
  return parts.join(' · ')
}

// Trades / adições recentes envolvendo os times e quem jogou neste confronto
function transactionAngles(transactions, teams, g, players) {
  const season = str(g.Season)
  const week = weekNum(g)
  const out = []
  const recent = transactions.filter(t => str(t.season) === season && (Number(t.week) || 0) <= week && (Number(t.week) || 0) >= week - 3)
  recent.filter(t => t.type === 'trade' && t.teams.some(x => teams.map(norm).includes(norm(x)))).forEach(t => {
    const desc = t.moves.map(m => `${m.team} recebeu ${m.adds.map(p => p.name).join(', ') || 'nada'}`).join('; ')
    out.push({ w: 3, text: `Trade recente (week ${t.week}): ${desc}.` })
  })
  // Jogador deste jogo que chegou ao time por troca/waiver na temporada
  const byAbbr = new Map(players.map(p => [abbr(p.name), p]))
  transactions.filter(t => str(t.season) === season && (Number(t.week) || 0) <= week).forEach(t => {
    t.moves.forEach(m => m.adds.forEach(p => {
      const hit = byAbbr.get(abbr(p.name))
      if (!hit || norm(hit.team) !== norm(m.team) || hit.pts < 15) return
      const how = t.type === 'trade' ? `veio numa trade na week ${t.week}` : t.type === 'waiver' ? `foi pego no waiver na week ${t.week}` : `foi pego como free agent na week ${t.week}`
      out.push({ w: 3, text: `${hit.name} (${f2(hit.pts)} pts por ${m.team}) ${how}.` })
    }))
  })
  return out
}

function trimRecap(text, max = 600) {
  const t = str(text).replace(/\s+/g, ' ')
  return t.length > max ? `${t.slice(0, max)}…` : t
}

export async function buildMatchupContext({ season, week, team, opp }) {
  const { games, transactions } = await loadData()
  const rowsAll = teamGames(games)
  const target = rowsAll.find(x => str(x.Season) === str(season) && str(x.Week) === str(week) && norm(x.Team) === norm(team) && (!opp || norm(x.Opponent) === norm(opp)))
  if (!target) return null
  const a = str(target.Team)
  const b = str(target.Opponent)
  const gB = rowsAll.find(x => str(x.Season) === str(season) && str(x.Week) === str(week) && norm(x.Team) === norm(b) && norm(x.Opponent) === norm(a))

  // Só o passado e a própria semana (cronologia)
  const rows = rowsAll.filter(x => order(x) <= order(target))
  const weekRows = rows.filter(x => str(x.Season) === str(season) && str(x.Week) === str(week))
  const seasonRows = rows.filter(x => str(x.Season) === str(season))
  const previousRows = rows.filter(x => order(x) < order(target))
  const hon = honors(previousRows)
  const table = standings(seasonRows, str(season))
  const tableBefore = standings(seasonRows.filter(x => order(x) < order(target)), str(season))

  const pfA = num(target.PF), pfB = num(target.PA)
  const winner = pfA > pfB ? a : pfB > pfA ? b : null
  const loser = winner === a ? b : winner === b ? a : null
  const margin = Math.abs(pfA - pfB)

  // Confronto: história entre os dois
  const hh = h2h(rows, a, b, target)
  const angles = []
  if (hh.before.length === 0) angles.push({ w: 3, text: `Primeiro confronto da história entre ${a} e ${b}.` })
  else {
    angles.push({ w: 2, text: `Série histórica (já com este jogo): ${a} ${hh.wa} x ${hh.wb} ${b} em ${hh.meetings.length} jogos.` })
    if (hh.streakTeam && hh.streakN >= 3) angles.push({ w: 3, text: `${hh.streakTeam} venceu os últimos ${hh.streakN} confrontos entre os dois.` })
    if (winner) {
      const last = hh.lastWinOf(winner)
      if (!last && hh.before.length >= 2) angles.push({ w: 5, text: `Primeira vitória de ${winner} sobre ${loser} na história (${hh.before.length} jogos antes sem vencer).` })
      else if (last && Number(str(season)) - Number(str(last.Season)) >= 2) angles.push({ w: 4, text: `${winner} não vencia ${loser} desde ${gameLabel(last)}.` })
    }
    if (hh.playoffs.filter(x => order(x) < order(target)).length) {
      const pl = hh.playoffs.filter(x => order(x) < order(target)).map(x => `${gameLabel(x)}: ${resultOf(x) === 'W' ? a : b} venceu`).join('; ')
      angles.push({ w: 3, text: `Já se cruzaram em jogos decisivos: ${pl}.` })
    }
    const lastMeet = hh.before[hh.before.length - 1]
    if (lastMeet) angles.push({ w: 1, text: `Último encontro antes deste: ${gameLabel(lastMeet)}, ${a} ${f2(num(lastMeet.PF))} x ${f2(num(lastMeet.PA))} ${b}.` })
  }

  // Margem na semana e na história
  const weekMargins = weekRows.map(x => Math.abs(num(x.PF) - num(x.PA)))
  if (weekRows.length > 4 && margin === Math.max(...weekMargins)) angles.push({ w: 2, text: `Maior margem da semana (${f2(margin)}).` })
  if (weekRows.length > 4 && margin === Math.min(...weekMargins)) angles.push({ w: 2, text: `Jogo mais apertado da semana (${f2(margin)}).` })
  if (!isDouble(target)) {
    const margins = rows.filter(x => !isDouble(x) && resultOf(x) === 'W').map(x => num(x.PF) - num(x.PA)).sort((x, y) => y - x)
    const big = margins.indexOf(margin) + 1
    if (big > 0 && big <= 10) angles.push({ w: 5, text: `Margem de ${f2(margin)}: ${rankF(big, 'maior vitória')} da história da liga.` })
    const close = [...margins].reverse().indexOf(margin) + 1
    if (close > 0 && close <= 10) angles.push({ w: 5, text: `Margem de ${f2(margin)}: ${rankF(close, 'vitória mais apertada')} da história da liga.` })
  }

  // Campanha / tabela
  ;[a, b].forEach(t => {
    const now = table.find(r => norm(r.team) === norm(t))
    const was = tableBefore.find(r => norm(r.team) === norm(t))
    if (stage(target) === 'reg season' && now) {
      let line = `${t}: ${recordStr(now)} na temporada regular, ${ordinal(now.rank)} de ${table.length} na classificação`
      if (was && was.rank !== now.rank) line += ` (era ${ordinal(was.rank)} antes desta semana)`
      angles.push({ w: now.rank === 1 || now.rank === table.length ? 2 : 1, text: `${line}.` })
    }
  })

  // Jogos decisivos
  if (isFinal(target)) angles.push({ w: 6, text: `FINAL (Tapitas Bowl) de ${season}: ${winner} é o campeão.` })
  if (isUnicorn(target)) angles.push({ w: 6, text: `Jogo do Unicórnio de ${season}: ${loser} fica com o Unicórnio (último colocado).` })
  if (stage(target) === 'playoffs' && !isFinal(target)) angles.push({ w: 4, text: `Playoffs: ${loser} está eliminado da briga pelo título.` })

  // Ganchos de cada time e transações
  angles.push(...teamAngles({ rows, team: a, opp: b, g: target, oppG: gB, weekRows, seasonRows }))
  if (gB) angles.push(...teamAngles({ rows, team: b, opp: a, g: gB, oppG: target, weekRows, seasonRows }))
  const players = [
    ...lineup(target).starters.map(p => ({ ...p, team: a })),
    ...(gB ? lineup(gB).starters.map(p => ({ ...p, team: b })) : []),
  ]
  angles.push(...transactionAngles(transactions, [a, b], target, players))

  // Campeão atual (última temporada encerrada antes desta)
  const lastSeason = Object.keys(hon).filter(s => Number(s) < Number(season) && hon[s].champion).sort((x, y) => Number(y) - Number(x))[0]
  const currentChampion = lastSeason ? { team: hon[lastSeason].champion, season: lastSeason } : null
  const defending = currentChampion && [a, b].find(t => norm(t) === norm(currentChampion.team))
  if (defending) angles.push({ w: 1, text: `${defending} é o atual campeão (${lastSeason}).` })

  // Outros jogos da semana (contexto curto)
  const others = []
  const seen = new Set([[a, b].map(norm).sort().join('|')])
  weekRows.forEach(x => {
    const key = [norm(x.Team), norm(x.Opponent)].sort().join('|')
    if (seen.has(key)) return
    seen.add(key)
    others.push(`${str(x.Team)} ${f2(num(x.PF))} x ${f2(num(x.PA))} ${str(x.Opponent)}`)
  })

  // Recaps anteriores dos dois times (para dar continuidade e não repetir)
  const prevRecap = t => {
    const last = previousRows.filter(x => norm(x.Team) === norm(t) && str(x['Recap da Partida'])).sort((x, y) => order(y) - order(x))[0]
    return last ? `Último recap de ${t} (${gameLabel(last)} vs ${str(last.Opponent)}): ${trimRecap(last['Recap da Partida'])}` : ''
  }

  return {
    mode: 'matchup',
    season: str(season),
    week: str(week),
    stage: str(target.GameStage),
    gameType: str(target.GameType),
    teams: [a, b],
    score: { [a]: f2(pfA), [b]: f2(pfB) },
    winner,
    lineups: { [a]: lineup(target), ...(gB ? { [b]: lineup(gB) } : {}) },
    angles: angles.sort((x, y) => y.w - x.w),
    franchises: [a, b].map(t => franchiseLine(t, hon, previousRows)),
    honors: hon,
    currentChampion,
    otherGames: others,
    previousRecaps: [a, b].map(prevRecap).filter(Boolean),
  }
}

// ── Contexto de Power Ranking (um time na semana) ───────────────────────
export async function buildPowerRankingContext({ season, week, team }) {
  const base = await buildMatchupContext({ season, week, team })
  if (!base) return null
  const { games } = await loadData()
  const rowsAll = teamGames(games)
  const weekRows = rowsAll.filter(x => str(x.Season) === str(season) && str(x.Week) === str(week))
  const me = weekRows.find(x => norm(x.Team) === norm(team))
  const ranking = weekRows
    .filter(x => num(x['Power Ranking']) > 0)
    .sort((x, y) => num(x['Power Ranking']) - num(y['Power Ranking']))
    .map(x => `#${num(x['Power Ranking'])} ${str(x.Team)}${str(x['PR Delta']) ? ` (${str(x['PR Delta'])})` : ''}`)
  const prevNote = rowsAll
    .filter(x => norm(x.Team) === norm(team) && order(x) < order(me) && str(x.Note))
    .sort((x, y) => order(y) - order(x))[0]
  return {
    ...base,
    mode: 'pr',
    focus: str(me?.Team || team),
    powerRanking: {
      position: str(me?.['Power Ranking']),
      delta: str(me?.['PR Delta']),
      trend: str(me?.Trend),
      record: `${str(me?.Wins)}-${str(me?.Losses)}`,
      avgPF: str(me?.AVG_PF),
      overallWins: str(me?.OVW),
      table: ranking,
    },
    previousPrNote: prevNote ? `${gameLabel(prevNote)}: ${trimRecap(prevNote.Note, 400)}` : '',
  }
}

// ── Texto do dossiê (o que vai para o prompt) ───────────────────────────
export function renderContext(ctx) {
  const lines = []
  const [a, b] = ctx.teams
  lines.push(`# DOSSIÊ — ${ctx.season} · Week ${ctx.week} · ${ctx.stage}${ctx.gameType && ctx.gameType !== ctx.stage ? ` · ${ctx.gameType}` : ''}`)
  lines.push('')
  lines.push(`Placar: ${a} ${ctx.score[a]} x ${ctx.score[b]} ${b}${ctx.winner ? ` → vitória de ${ctx.winner}` : ' → empate'}`)
  if (ctx.mode === 'pr') {
    const p = ctx.powerRanking
    lines.push('')
    lines.push(`## POWER RANKING — foco em ${ctx.focus}`)
    const facts = [
      p.position && `Posição: #${p.position}${p.delta ? ` (variação ${p.delta}${p.trend ? `, ${p.trend}` : ''})` : ''}`,
      p.record !== '-' && `Campanha ${p.record}`,
      p.avgPF && `Média ${p.avgPF}`,
      p.overallWins && `Overall wins ${p.overallWins}`,
    ].filter(Boolean)
    if (facts.length) lines.push(facts.join(' · '))
    if (p.table.length) lines.push(`Ranking da semana: ${p.table.join(' · ')}`)
    if (ctx.previousPrNote) lines.push(`Verbete da semana anterior (não repita): ${ctx.previousPrNote}`)
  }
  lines.push('')
  lines.push('## GANCHOS (já calculados e verificados — os mais fortes primeiro; escolha 1 ou 2, ignore o resto)')
  ctx.angles.forEach(x => lines.push(`- ${x.text}`))
  lines.push('')
  lines.push('## ESCALAÇÕES')
  lines.push('(Não comente em que vaga cada jogador atuou nem cite FLEX: a escalação é estratégia do time e não demérito do jogador.)')
  Object.entries(ctx.lineups).forEach(([t, l]) => {
    lines.push(`${t} — titulares: ${l.starters.map(p => `${p.name}${slotLabel(p)} ${f2(p.pts)}`).join(', ')}`)
    if (l.bench.length) lines.push(`${t} — banco: ${l.bench.map(p => `${p.name} ${f2(p.pts)}`).join(', ')}`)
  })
  lines.push('')
  lines.push('## FRANQUIAS (só até esta semana)')
  if (ctx.currentChampion) {
    const cc = ctx.currentChampion
    lines.push(`ATUAL CAMPEÃO: ${cc.team} (campeão de ${cc.season}). Só ${cc.team} pode ser chamado de "atual campeão" ou "defensor do título"; qualquer outro campeão é apenas "campeão de [ano]".`)
    ctx.teams.filter(t => norm(t) !== norm(cc.team)).forEach(t => {
      const titles = Object.entries(ctx.honors).filter(([, h]) => norm(h.champion) === norm(t)).map(([y]) => y)
      if (titles.length) lines.push(`ATENÇÃO: ${t} NÃO é o atual campeão (foi campeão em ${titles.join(', ')}).`)
    })
  }
  ctx.franchises.forEach(f => lines.push(`- ${f}`))
  const hon = Object.entries(ctx.honors).sort((x, y) => Number(x[0]) - Number(y[0]))
  if (hon.length) {
    lines.push('')
    lines.push('## CAMPEÕES / VICES / UNICÓRNIOS (temporadas já decididas)')
    hon.forEach(([s, h]) => lines.push(`- ${s}: campeão ${h.champion || '—'}, vice ${h.vice || '—'}, unicórnio ${h.unicorn || '—'}`))
  }
  if (ctx.otherGames.length) {
    lines.push('')
    lines.push(`## OUTROS JOGOS DA SEMANA: ${ctx.otherGames.join(' · ')}`)
  }
  if (ctx.previousRecaps.length) {
    lines.push('')
    lines.push('## RECAPS ANTERIORES DESTES TIMES (dê continuidade às histórias se fizer sentido, mas NÃO repita aberturas, piadas nem estrutura)')
    ctx.previousRecaps.forEach(r => lines.push(`- ${r}`))
  }
  return lines.join('\n')
}

// ── Contexto da rodada inteira (matéria semanal da Tapitas News) ───────
// Todos os confrontos com os seus ganchos, os destaques da rodada, a
// classificação, o Power Ranking e a próxima rodada. Mesma regra de
// cronologia: nada do que aconteceu depois da semana pedida.
export async function buildWeekContext({ season, week }) {
  const { games } = await loadData()
  const rowsAll = teamGames(games)
  const weekRows = rowsAll.filter(x => str(x.Season) === str(season) && str(x.Week) === str(week))
  if (!weekRows.length) return null
  const ref = weekRows[0]
  const rows = rowsAll.filter(x => order(x) <= order(ref))
  const seasonRows = rows.filter(x => str(x.Season) === str(season))
  const previousRows = rows.filter(x => order(x) < order(ref))

  // Um contexto por confronto (sem repetir o espelho)
  const pairs = []
  const seen = new Set()
  weekRows.forEach(x => {
    const key = [norm(x.Team), norm(x.Opponent)].sort().join('|')
    if (seen.has(key)) return
    seen.add(key)
    pairs.push(x)
  })
  // Jogos que valem mais primeiro: final, playoffs, unicórnio, temporada regular, consolação
  const weight = x => (isFinal(x) ? 0 : stage(x) === 'playoffs' ? 1 : isUnicorn(x) ? 2 : stage(x) === 'reg season' ? 3 : 4)
  pairs.sort((x, y) => weight(x) - weight(y))
  const matchups = (await Promise.all(pairs.map(x => buildMatchupContext({ season, week, team: str(x.Team), opp: str(x.Opponent) })))).filter(Boolean)

  // Destaques da rodada
  const byScore = [...weekRows].sort((a, b) => num(b.PF) - num(a.PF))
  // (o placar do contexto já vem formatado "123.45": Number, não num)
  const margins = matchups.map(m => ({ m, margin: Math.abs(Number(m.score[m.teams[0]]) - Number(m.score[m.teams[1]])) })).sort((a, b) => b.margin - a.margin)
  const players = weekRows.flatMap(x => lineup(x).starters.filter(p => p.slot !== 'DEF').map(p => ({ ...p, team: str(x.Team) }))).sort((a, b) => b.pts - a.pts)
  const flops = players.filter(p => p.slot !== 'K').sort((a, b) => a.pts - b.pts).slice(0, 3)
  const table = standings(seasonRows, str(season))
  const tableBefore = standings(seasonRows.filter(x => order(x) < order(ref)), str(season))
  const pr = weekRows
    .filter(x => num(x['Power Ranking']) > 0)
    .sort((x, y) => num(x['Power Ranking']) - num(y['Power Ranking']))
    .map(x => ({ team: str(x.Team), pos: num(x['Power Ranking']), delta: str(x['PR Delta']) }))

  // Próxima rodada: os pares (sem placar) da planilha ou do Sleeper
  let nextWeek = null
  const later = rowsAll.filter(x => str(x.Season) === str(season) && order(x) > order(ref)).sort((a, b) => order(a) - order(b))
  if (later.length) {
    const w = str(later[0].Week)
    const ps = []
    const s2 = new Set()
    later.filter(x => str(x.Week) === w).forEach(x => {
      const key = [norm(x.Team), norm(x.Opponent)].sort().join('|')
      if (s2.has(key)) return
      s2.add(key)
      ps.push([str(x.Team), str(x.Opponent)])
    })
    nextWeek = { week: w, pairs: ps }
  } else {
    const info = await getLeagueInfo().catch(() => null)
    if (info?.season === str(season)) {
      const n = Math.floor(weekNum(ref)) + 1
      const ms = await getSleeperWeek(n).catch(() => [])
      if (ms.length) nextWeek = { week: String(n), pairs: ms.map(m => m.teams.map(t => t.team)) }
    }
  }
  if (nextWeek) {
    nextWeek.pairs = nextWeek.pairs.map(([a, b]) => {
      const hh = h2h(rows, a, b, { ...ref, Season: str(season), Week: String(Number(str(week)) + 0.5) })
      const ra = table.find(r => norm(r.team) === norm(a))
      const rb = table.find(r => norm(r.team) === norm(b))
      return { a, b, series: hh.meetings.length ? `${a} ${hh.wa} x ${hh.wb} ${b} em ${hh.meetings.length} jogos` : 'primeiro confronto', records: [ra && recordStr(ra), rb && recordStr(rb)] }
    })
  }

  const first = matchups[0]
  return {
    mode: 'week',
    season: str(season),
    week: str(week),
    stage: str((pairs[0] || ref).GameStage),
    matchups,
    highs: {
      top: byScore[0] && { team: str(byScore[0].Team), pf: f2(num(byScore[0].PF)) },
      low: byScore[byScore.length - 1] && { team: str(byScore[byScore.length - 1].Team), pf: f2(num(byScore[byScore.length - 1].PF)) },
      biggest: margins[0] && { teams: margins[0].m.teams, winner: margins[0].m.winner, margin: f2(margins[0].margin) },
      closest: margins[margins.length - 1] && { teams: margins[margins.length - 1].m.teams, winner: margins[margins.length - 1].m.winner, margin: f2(margins[margins.length - 1].margin) },
      players: players.slice(0, 6),
      flops,
    },
    table: table.map(r => {
      const was = tableBefore.find(b => norm(b.team) === norm(r.team))
      return { ...r, was: was?.rank || null }
    }),
    powerRanking: pr,
    recaps: weekRows.filter(x => str(x['Recap da Partida'])).map(x => `${str(x.Team)} vs ${str(x.Opponent)}: ${trimRecap(x['Recap da Partida'], 700)}`),
    nextWeek,
    honors: first?.honors || honors(previousRows),
    currentChampion: first?.currentChampion || null,
  }
}

export function renderWeekContext(ctx) {
  const L = []
  L.push(`# DOSSIÊ DA RODADA — ${ctx.season} · Week ${ctx.week} · ${ctx.stage}`)
  L.push('')
  L.push('## CONFRONTOS (placar e os ganchos mais fortes de cada um — já calculados e verificados)')
  ctx.matchups.forEach(m => {
    const [a, b] = m.teams
    L.push(`### ${a} ${m.score[a]} x ${m.score[b]} ${b}${m.winner ? ` → vitória de ${m.winner}` : ' → empate'}${m.gameType && m.gameType !== m.stage ? ` (${m.gameType})` : ''}`)
    m.angles.filter(x => x.w >= 2).slice(0, 6).forEach(x => L.push(`- ${x.text}`))
    Object.entries(m.lineups).forEach(([t, l]) => {
      const top = [...l.starters].sort((x, y) => y.pts - x.pts).slice(0, 3).map(p => `${p.name} ${f2(p.pts)}`).join(', ')
      if (top) L.push(`- Melhores de ${t}: ${top}`)
    })
  })
  const h = ctx.highs
  L.push('')
  L.push('## DESTAQUES DA RODADA')
  if (h.top) L.push(`- Maior pontuação: ${h.top.team} (${h.top.pf})`)
  if (h.low) L.push(`- Menor pontuação: ${h.low.team} (${h.low.pf})`)
  if (h.biggest) L.push(`- Maior vitória: ${h.biggest.winner} (${h.biggest.teams.join(' x ')}, margem ${h.biggest.margin})`)
  if (h.closest) L.push(`- Jogo mais apertado: ${h.closest.teams.join(' x ')}, margem ${h.closest.margin}${h.closest.winner ? `, vitória de ${h.closest.winner}` : ''}`)
  if (h.players.length) L.push(`- Melhores jogadores (titulares): ${h.players.map(p => `${p.name} (${p.team}) ${f2(p.pts)}`).join(' · ')}`)
  if (h.flops.length) L.push(`- Decepções (titulares): ${h.flops.map(p => `${p.name} (${p.team}) ${f2(p.pts)}`).join(' · ')}`)
  if (ctx.table.length && /reg/i.test(ctx.stage)) {
    L.push('')
    L.push('## CLASSIFICAÇÃO DA TEMPORADA REGULAR (depois desta rodada)')
    ctx.table.forEach(r => L.push(`${r.rank}. ${r.team} ${recordStr(r)} · ${Math.round(r.pf)} pts${r.was && r.was !== r.rank ? ` (era ${r.was}º)` : ''}`))
  }
  if (ctx.powerRanking.length) {
    L.push('')
    L.push(`## POWER RANKINGS DA SEMANA: ${ctx.powerRanking.map(p => `#${p.pos} ${p.team}${p.delta ? ` (${p.delta})` : ''}`).join(' · ')}`)
  }
  if (ctx.nextWeek?.pairs?.length) {
    L.push('')
    L.push(`## PRÓXIMA RODADA (Week ${ctx.nextWeek.week}) — só os confrontos, ainda sem resultado`)
    ctx.nextWeek.pairs.forEach(p => L.push(`- ${p.a}${p.records[0] ? ` (${p.records[0]})` : ''} x ${p.b}${p.records[1] ? ` (${p.records[1]})` : ''} · série: ${p.series}`))
  }
  L.push('')
  L.push('## CAMPEÕES / VICES / UNICÓRNIOS (temporadas já decididas)')
  if (ctx.currentChampion) L.push(`ATUAL CAMPEÃO: ${ctx.currentChampion.team} (${ctx.currentChampion.season}). Só ele pode ser chamado de "atual campeão".`)
  Object.entries(ctx.honors).sort((x, y) => Number(x[0]) - Number(y[0])).forEach(([s, hh]) => L.push(`- ${s}: campeão ${hh.champion || '—'}, vice ${hh.vice || '—'}, unicórnio ${hh.unicorn || '—'}`))
  if (ctx.recaps.length) {
    L.push('')
    L.push('## RECAPS JÁ PUBLICADOS DESTA RODADA (use como apoio e para manter a mesma versão dos fatos; não copie frases)')
    ctx.recaps.forEach(r => L.push(`- ${r}`))
  }
  return L.join('\n')
}
