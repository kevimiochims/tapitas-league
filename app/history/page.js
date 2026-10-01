'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { BrandBackdrop, PageShell, CardShell, CardGroup, StatRow, Tag, ResultBadge, TeamLogo, Segmented, Tabs } from '../components/ui'
import PlayerProfileModal from '../components/PlayerProfileModal'
import PlayerCutout from '../components/PlayerCutout'

const BASE_URL = '/api/sheet'

const TEAM_LOGOS = {
  'howmuch': '/images/howmuch.png',
    'i am megatron': '/images/megatron.png',
    'moneyball': '/images/moneyball.png',
    'ocupa e resiste': '/images/ocupa.png',
    'oldbrady': '/images/oldbrady.png',
    'patrolao squad': '/images/patrolao.png',
    'pequers verde': '/images/pequers.png',
    'peytao da massa': '/images/peytao.png',
    'rincao settlers': '/images/rincao.png',
    'h-lera do mahl': '/images/hlera.png',
}

function normalizeString(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getTeamLogo(name) {
  return TEAM_LOGOS[normalizeString(name)] || null
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0

  let text = String(value).trim().replace(/[^0-9,.-]/g, '')
  if (!text) return 0

  const hasComma = text.includes(',')
  const hasDot = text.includes('.')

  if (hasComma && hasDot) {
    // If both separators exist, the last one is treated as the decimal separator.
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
      text = text.replace(/\./g, '').replace(',', '.')
    } else {
      text = text.replace(/,/g, '')
    }
  } else if (hasComma) {
    text = text.replace(',', '.')
  }

  const parsed = Number(text)
  return Number.isNaN(parsed) ? 0 : parsed
}

function getField(row, ...keys) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null) return row[key]
  }
  return ''
}

function getGameType(row) {
  return normalizeString(getField(row, 'GameType', 'gameType', 'GAME_TYPE'))
}

function getResult(row) {
  return normalizeString(getField(row, 'Result', 'result')).toUpperCase()
}

function getSeason(row) {
  return String(getField(row, 'Season', 'season')).trim()
}

function getTeam(row) {
  return String(getField(row, 'Team', 'team')).trim()
}

function getOpponent(row) {
  return String(getField(row, 'Opponent', 'opponent')).trim()
}

function getStage(row) {
  return normalizeString(getField(row, 'GameStage', 'gameStage'))
}

function matchupHref(row) {
  if (!row) return '/matchups'
  return `/matchups?season=${encodeURIComponent(getSeason(row))}&week=${encodeURIComponent(getField(row, 'Week', 'week'))}&team=${encodeURIComponent(getTeam(row))}&opp=${encodeURIComponent(getOpponent(row))}`
}

function teamHref(name) {
  return `/teams?team=${encodeURIComponent(String(name || '').trim())}`
}


// Jogadores escalados num jogo (titulares e reservas) do GAME_FACTS_ALL.
function extractPlayerAppearances(game, max = 13) {
  const list = []
  for (let i = 1; i <= max; i++) {
    const starter = game?.[`S${i}_Name`]
    if (starter && starter !== '--empty--' && String(starter).trim()) list.push({ name: String(starter).trim(), status: 'Starter', pts: parseNumber(game?.[`S${i}_Pts`]) })
    const bench = game?.[`B${i}_Name`]
    if (bench && bench !== '--empty--' && String(bench).trim()) list.push({ name: String(bench).trim(), status: 'Bench', pts: parseNumber(game?.[`B${i}_Pts`]) })
  }
  return list
}

function normalizePlayerKey(value) {
  return normalizeString(value).replace(/\./g, '').replace(/\s+/g, ' ').trim()
}

// _PLAYER_CACHE → busca por nome curto ("J. Allen") ou completo.
function buildPlayerLookup(rows) {
  const map = new Map()
  rows.forEach(row => {
    const playerId = String(row?.player_id || '').trim()
    if (!playerId) return
    const entry = { playerId, name: String(row?.name || '').trim(), pos: String(row?.position || row?.pos || '').trim().toUpperCase() }
    ;[row?.name, row?.full_name].filter(Boolean).forEach(v => {
      const key = normalizePlayerKey(v)
      if (key && !map.has(key)) map.set(key, entry)
    })
  })
  return map
}

function PlayerPhoto({ playerId, name, size = 28 }) {
  const [failed, setFailed] = useState(false)
  const initials = String(name || '?').split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[10px] font-semibold text-[#16274F] ring-1 ring-[#E6E8EB]" style={{ width: size, height: size }}>
      {playerId && !failed
        ? <img src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
        : initials}
    </span>
  )
}

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch {
    return []
  }
}

export default function HistoryPage() {
  const [games, setGames] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [openSeason, setOpenSeason] = useState(null)
  const [view, setView] = useState('champion')
  const [playerLookup, setPlayerLookup] = useState(new Map())
  const [profile, setProfile] = useState(null)
  const closeProfile = () => setProfile(null)
  useEffect(() => {
    async function load() {
      const [data, historyData, playerCache] = await Promise.all([
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_RAW`),
        safeFetch(`${BASE_URL}/_PLAYER_CACHE`),
      ])
      setPlayerLookup(buildPlayerLookup(playerCache))

      setGames(data)
      setHistory(historyData)

      const seasons = [
        ...new Set(
          data
            .filter(g => getGameType(g) === 'finals')
            .map(g => getSeason(g))
            .filter(Boolean)
        ),
      ].sort((a, b) => Number(b) - Number(a))

      if (seasons.length > 0) {
        setOpenSeason(seasons[0])
      }

      setLoading(false)
    }

    load()
  }, [])

  const seasonData = useMemo(() => {
    // Only show seasons that have a completed final (Tapitas Bowl winner)
    const completedSeasons = [
      ...new Set(
        games
          .filter(g =>
            getGameType(g) === 'tapitas bowl' &&
            getResult(g) === 'W'
          )
          .map(g => getSeason(g))
          .filter(Boolean)
      ),
    ].sort((a, b) => Number(b) - Number(a))

    return completedSeasons.map(season => {
      const seasonGames = games.filter(
        g => getSeason(g) === season
      )


      const uniqueTeams = [
        ...new Set(
          seasonGames.map(g => getTeam(g))
        ),
      ]

      // TEAM RECORDS
      const records = {}

      uniqueTeams.forEach(team => {
        const tg = seasonGames.filter(
          g => getTeam(g) === team
        )

        const wins = tg.filter(
          g =>
            getResult(g) === 'W'
        ).length

        const losses = tg.filter(
          g =>
            getResult(g) === 'L'
        ).length

        const points = tg.reduce(
          (sum, g) => sum + parseNumber(getField(g, 'PF', 'pf')),
          0
        )

        records[team] = {
          wins,
          losses,
          points,
        }
      })

      // CHAMPION
      const finalsGames = seasonGames.filter(g =>
        getGameType(g) === 'tapitas bowl'
      )

      const finalsWinner = finalsGames.find(g => getResult(g) === 'W')

      const champion = finalsWinner ? getTeam(finalsWinner) || null : null

      const championGames = seasonGames
        .filter(
          g =>
            getTeam(g) ===
            champion
        )
        .sort((a, b) => {
          return (
            parseFloat(getField(a, 'Week', 'week') || 0) -
            parseFloat(getField(b, 'Week', 'week') || 0)
          )
        })

      const regGames = championGames
        .filter(g => {
          const stage = getStage(g)

          return (
            !stage ||
            stage === 'reg season'
          )
        })
        .map(g => ({
          result:
            getResult(g),

          opp: getOpponent(g),

          week: getField(g, 'Week', 'week'),

          score: parseNumber(getField(g, 'PF', 'pf')),

          oppScore: parseNumber(getField(g, 'PA', 'pa')),
          href: matchupHref(g),
        }))

      const playoffGames =
        championGames
          .filter(g => getStage(g) === 'playoffs')
          .map(g => ({
            result:
              getResult(g),

            opp: getOpponent(g),

            week: getField(g, 'Week', 'week'),

            score: parseNumber(getField(g, 'PF', 'pf')),

            oppScore: parseNumber(getField(g, 'PA', 'pa')),
            gameType: g?.GameType,
            href: matchupHref(g),
          }))

      const half = Math.ceil(
        regGames.length / 2
      )

      const regCol1 =
        regGames.slice(0, half)

      const regCol2 =
        regGames.slice(half)

      // CHAMPION RECORD / SEASON STATS
      // Keep every value consumed by the UI defined, even when a season has
      // incomplete historical rows.
      const championRecord = {
        wins: regGames.filter(g => g.result === 'W').length,
        losses: regGames.filter(g => g.result === 'L').length,
      }

      const numericChampionRegPF = regGames
        .map(g => Number(g?.score))
        .filter(Number.isFinite)

      const avgPF = numericChampionRegPF.length
        ? numericChampionRegPF.reduce((sum, value) => sum + value, 0) / numericChampionRegPF.length
        : 0

      const bestPFGame = [...seasonGames].sort(
        (a, b) => parseNumber(getField(b, 'PF', 'pf')) - parseNumber(getField(a, 'PF', 'pf'))
      )[0] || null

      const worstPFGame = [...seasonGames].sort(
        (a, b) => parseNumber(getField(a, 'PF', 'pf')) - parseNumber(getField(b, 'PF', 'pf'))
      )[0] || null

      // Championship final
      const championshipOpponent = getOpponent(finalsWinner) || null
      const championshipScore = finalsWinner
        ? parseNumber(getField(finalsWinner, 'PF', 'pf'))
        : null
      const championshipOpponentScore = finalsWinner
        ? parseNumber(getField(finalsWinner, 'PA', 'pa'))
        : null


      // UNICORN
      // The Unicorn is the loser of the official Unicorn game.
      // GAME_FACTS_ALL contains mirrored rows, so the losing row is the
      // authoritative team for the season. This avoids confusing the
      // Unicorn with the last regular-season standing.
      const unicornGames = seasonGames.filter(g => {
        const gameType = getGameType(g)
        return gameType === 'unicórnio' || gameType === 'unicornio' || gameType === 'unicorn'
      })

      const unicornLoser = unicornGames.find(g => getResult(g) === 'L')

      const unicorn = unicornLoser ? getTeam(unicornLoser) || null : null

      const mapTeamGame = g => ({
        result: getResult(g),
        opp: getOpponent(g),
        week: getField(g, 'Week', 'week'),
        score: parseNumber(getField(g, 'PF', 'pf')),
        oppScore: parseNumber(getField(g, 'PA', 'pa')),
        gameType: g?.GameType,
        href: matchupHref(g),
      })
      const unicornGamesAll = seasonGames
        .filter(g => unicorn && getTeam(g) === unicorn)
        .sort((a, b) => parseFloat(getField(a, 'Week', 'week') || 0) - parseFloat(getField(b, 'Week', 'week') || 0))
      const unicornRegGames = unicornGamesAll.filter(g => !getStage(g) || getStage(g) === 'reg season').map(mapTeamGame)
      const unicornConsolationGames = unicornGamesAll.filter(g => getStage(g) === 'consolation').map(mapTeamGame)

      // Classificação final (TEAM_HISTORY_RAW): vice pelo jogo da final,
      // terceiro pela coluna Standing.
      const seasonRows = history.filter(r => String(r?.Season || '').trim() === season)
      const rowFor = team => seasonRows.find(r => normalizeString(r?.Team) === normalizeString(team))
      const thirdRow = seasonRows.find(r => parseNumber(r?.Standing) === 3)
      const standingLine = team => {
        const r = rowFor(team)
        return r ? `${parseNumber(r?.W)}–${parseNumber(r?.L)} overall` : ''
      }

      // Jogadores: maior total, maior média (mín. 6 jogos como titular) e
      // melhor jogo individual da temporada. Rodada dupla conta metade.
      const playerMap = new Map()
      let bestPlayerGame = null
      seasonGames.forEach(g => {
        const team = getTeam(g)
        const double = String(getField(g, 'Week', 'week')).includes('-')
        extractPlayerAppearances(g).forEach(a => {
          if (a.status !== 'Starter') return
          const pts = double ? a.pts / 2 : a.pts
          const key = `${a.name}|${team}`
          if (!playerMap.has(key)) playerMap.set(key, { name: a.name, team, total: 0, starts: 0 })
          const p = playerMap.get(key)
          p.total += pts
          p.starts += 1
          if (!double && (!bestPlayerGame || a.pts > bestPlayerGame.pts)) bestPlayerGame = { name: a.name, team, pts: a.pts, opp: getOpponent(g), week: getField(g, 'Week', 'week'), href: matchupHref(g) }
        })
      })
      const playerList = Array.from(playerMap.values())
      const topScorer = [...playerList].sort((a, b) => b.total - a.total)[0] || null
      const topAverage = [...playerList].filter(p => p.starts >= 6).sort((a, b) => b.total / b.starts - a.total / a.starts)[0] || null

      // HIGHEST SCORE
      const highestScoreGame = [...seasonGames].sort(
        (a, b) =>
          parseNumber(getField(b, 'PF', 'pf')) - parseNumber(getField(a, 'PF', 'pf'))
      )[0]

      // CLOSEST GAME
      const closestGame = [...seasonGames].sort((a, b) => {
        const marginA = Math.abs(
          parseNumber(getField(a, 'PF', 'pf')) - parseNumber(getField(a, 'PA', 'pa'))
        )

        const marginB = Math.abs(
          parseNumber(getField(b, 'PF', 'pf')) - parseNumber(getField(b, 'PA', 'pa'))
        )

        return marginA - marginB
      })[0]

      // BIGGEST BLOWOUT
      const biggestBlowout = [...seasonGames]
        .filter(
          g =>
            getResult(g) === 'W'
        )
        .sort((a, b) => {
          const marginA =
            parseNumber(getField(a, 'PF', 'pf')) - parseNumber(getField(a, 'PA', 'pa'))

          const marginB =
            parseNumber(getField(b, 'PF', 'pf')) - parseNumber(getField(b, 'PA', 'pa'))

          return marginB - marginA
        })[0]

      // SEASON RECAP
      const seasonRecapRow = [...seasonGames]
        .reverse()
        .find(g => {
          const recap = String(getField(g, 'Season_Recap', 'season_recap') || '').trim()
          return recap.length > 0
        })

      const recap =
        String(getField(seasonRecapRow, 'Season_Recap', 'season_recap') || '')
          .trim() || null

      // BEST RECORD
      const bestRecord = Object.entries(records).sort((a, b) => {
        if (a[1].wins !== b[1].wins) {
          return b[1].wins - a[1].wins
        }

        return b[1].points - a[1].points
      })[0]

      return {
        season,
        champion,
        unicorn,
        highestScoreGame,
        closestGame,
        biggestBlowout,
        recap,
        bestRecord,
        championRecord,
        avgPF,
        bestPFGame,
        worstPFGame,
        championshipOpponent,
        championshipScore,
        championshipOpponentScore,
        championshipFinalGame: finalsWinner,
        unicornGame: unicornLoser || null,
        unicornOpponent: unicornLoser ? getOpponent(unicornLoser) : null,
        unicornScore: unicornLoser ? parseNumber(getField(unicornLoser, 'PF', 'pf')) : null,
        unicornOpponentScore: unicornLoser ? parseNumber(getField(unicornLoser, 'PA', 'pa')) : null,
        unicornRegGames,
        unicornConsolationGames,
        runnerUp: getOpponent(finalsWinner) || null,
        runnerUpLine: standingLine(getOpponent(finalsWinner)),
        championLine: standingLine(champion),
        third: thirdRow ? String(thirdRow?.Team || '').trim() : null,
        thirdLine: thirdRow ? `${parseNumber(thirdRow?.W)}–${parseNumber(thirdRow?.L)} overall` : '',
        topScorer,
        topAverage,
        bestPlayerGame,
        regGames,
        playoffGames,
        regCol1,
        regCol2,
      }
    })
  }, [games, history])

  const selected = seasonData.find(s => s.season === openSeason) || seasonData[0] || null

  const gameScore = g => `${parseNumber(getField(g, 'PF', 'pf')).toFixed(2)} – ${parseNumber(getField(g, 'PA', 'pa')).toFixed(2)}`
  const gameMargin = g => Math.abs(parseNumber(getField(g, 'PF', 'pf')) - parseNumber(getField(g, 'PA', 'pa'))).toFixed(2)
  const stageRecord = (team, stage) => {
    const rows = games.filter(g => getSeason(g) === selected?.season && getTeam(g) === String(team || '').trim() && getStage(g) === stage)
    return `${rows.filter(g => getResult(g) === 'W').length}–${rows.filter(g => getResult(g) === 'L').length}`
  }

  const selectSeason = (season, nextView = 'champion') => { setOpenSeason(season); setView(nextView) }
  const playerInfo = name => playerLookup.get(normalizePlayerKey(name)) || null

  // Jogo de uma campanha: clicável, abre o confronto na Matchups.
  const RunGame = ({ g, highlight }) => (
    <Link href={g.href || '/matchups'} className={`group flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 transition-colors ${highlight ? 'bg-[#FFF6D6] hover:bg-[#FFEFB8]' : 'bg-[#F4F5F7] hover:bg-[#ECEEF1]'}`}>
      <ResultBadge result={g.result} />
      <TeamLogo name={g.opp} size={20} />
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-[#111] group-hover:text-[#D01F2D]">vs {g.opp}</div>
        <div className="text-[11px] tabular-nums text-[#6B7280]">Wk {g.week || '—'} · {Number(g.score).toFixed(1)}–{Number(g.oppScore).toFixed(1)}</div>
      </div>
    </Link>
  )

  const RunSection = ({ label, games: list, highlightFinal }) => list.length > 0 && (
    <div>
      <div className="mb-2 text-[12px] font-medium text-[#6B7280]">{label} · {list.filter(g => g.result === 'W').length}–{list.filter(g => g.result === 'L').length}</div>
      <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 md:grid-cols-3">
        {list.map((g, i) => <RunGame key={i} g={g} highlight={highlightFinal && highlightFinal(g)} />)}
      </div>
    </div>
  )

  // Caminho em formato de chave: cada jogo da fase decisiva é uma etapa,
  // ligadas por uma linha; a última etapa (final/unicórnio) em destaque.
  const RoadCard = ({ title, subtitle, list, tone = 'navy' }) => {
    const steps = [...list].sort((x, y) => parseFloat(x.week) - parseFloat(y.week))
    if (!steps.length) return null
    const accent = tone === 'red' ? '#C8102E' : '#02275F'
    return (
      <CardShell title={title} subtitle={subtitle}>
        <div className="scroll-hide overflow-x-auto px-3 py-4 lg:px-4">
          <div className="mx-auto flex w-max items-stretch">
            {steps.map((g, i) => {
              const last = i === steps.length - 1
              const won = g.result === 'W'
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <div className="flex w-8 flex-shrink-0 items-center sm:w-12">
                      <div className="h-[3px] w-full rounded-full" style={{ background: accent, opacity: 0.25 }} />
                    </div>
                  )}
                  <Link
                    href={g.href || '/matchups'}
                    className={`group relative flex w-[150px] flex-shrink-0 flex-col items-center overflow-hidden rounded-xl px-3 py-3 text-center transition-shadow hover:shadow-md sm:w-[168px] ${last ? 'text-white' : 'bg-[#F4F5F7]'}`}
                  >
                    {last && <BrandBackdrop tone={tone} />}
                    <div className={`relative text-[10px] font-semibold uppercase tracking-[0.12em] ${last ? (tone === 'red' ? 'text-white/85' : 'text-[#E8C766]') : 'text-[#6B7280]'}`}>
                      {g.gameType && String(g.gameType).trim() ? String(g.gameType).trim() : `Week ${g.week}`}
                    </div>
                    <span className={`relative mt-2 rounded-full bg-white p-1 ${last ? 'shadow-lg' : 'ring-1 ring-[#E6E8EB]'}`}><TeamLogo name={g.opp} size={36} /></span>
                    <div className={`relative mt-1.5 w-full truncate text-[12px] font-medium ${last ? 'text-white' : 'text-[#111] group-hover:text-[#D01F2D]'}`}>vs {g.opp}</div>
                    <div className="relative mt-1 flex items-center gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${won ? 'bg-[#1E8E3E] text-white' : 'bg-[#D01F2D] text-white'}`}>{g.result}</span>
                      <span className={`text-[13px] font-bold tabular-nums ${last ? 'text-white' : 'text-[#111]'}`}>{Number(g.score).toFixed(1)}–{Number(g.oppScore).toFixed(1)}</span>
                    </div>
                  </Link>
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </CardShell>
    )
  }

  // Placar de um jogo decisivo: hero azul (final) ou vermelho (unicórnio),
  // com a textura do hero da Home.
  const Scoreboard = ({ href, badge, left, right, leftTag, rightTag, winnerLeft = true, tone = 'navy' }) => (
    <Link href={href} className="group relative mb-2 block overflow-hidden rounded-xl text-white">
      <BrandBackdrop tone={tone} />
      <div className="relative px-3 py-4 sm:py-5">
        <div className="mb-3 flex justify-center">{badge}</div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          {[[left, leftTag, winnerLeft], null, [right, rightTag, !winnerLeft]].map((cfg, i) => cfg ? (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="rounded-full bg-white p-1 shadow-lg"><TeamLogo name={cfg[0].team} size={46} /></span>
              <div className={`text-center text-[14px] font-semibold leading-tight sm:text-[16px] ${cfg[2] ? 'text-white' : 'text-white/65'}`}>{cfg[0].team || '—'}</div>
              <div className={`font-bold leading-none tabular-nums ${cfg[2] ? 'text-white' : 'text-white/55'}`} style={{ fontSize: 'clamp(30px, 5vw, 44px)' }}>{Number.isFinite(cfg[0].score) ? cfg[0].score.toFixed(2) : '—'}</div>
              {cfg[1]}
            </div>
          ) : (
            <div key={i} className="flex flex-col items-center gap-1 self-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[13px] font-black italic text-[#111] shadow-lg">VS</div>
              <div className="mt-1 text-[11px] font-bold tabular-nums text-white/85">{Number.isFinite(left.score) && Number.isFinite(right.score) ? Math.abs(left.score - right.score).toFixed(2) : '—'}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">margin</div>
            </div>
          ))}
        </div>
      </div>
      <div className="relative border-t border-white/15 py-2 text-center text-[12px] font-medium text-white/85 group-hover:text-white group-hover:underline">Open the game</div>
    </Link>
  )

  const finalCard = selected && (
    <Scoreboard
      href={matchupHref(selected.championshipFinalGame)}
      badge={<span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8C766]/20 px-3 py-1 text-[12px] font-semibold text-[#E8C766]"><Trophy className="h-3.5 w-3.5" /> {selected.season} · Tapitas Bowl</span>}
      left={{ team: selected.champion, score: selected.championshipScore }}
      right={{ team: selected.championshipOpponent, score: selected.championshipOpponentScore }}
      leftTag={<Tag tone="gold">🏆 Champion</Tag>}
      rightTag={<Tag>Runner-up</Tag>}
    />
  )

  const unicornCard = selected && selected.unicornGame && (
    <Scoreboard
      href={matchupHref(selected.unicornGame)}
      badge={<span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-white">🦄 {selected.season} · Unicorn game</span>}
      tone="red"
      left={{ team: selected.unicornOpponent, score: selected.unicornOpponentScore }}
      right={{ team: selected.unicorn, score: selected.unicornScore }}
      leftTag={<Tag tone="green">Escaped</Tag>}
      rightTag={<Tag tone="red">🦄 Unicorn</Tag>}
    />
  )

  const runCard = selected && (
    <CardShell title="Championship run" subtitle={`${selected.champion || '—'} · full campaign · tap a game to open it`}>
      <div className="space-y-4 p-3 lg:p-4">
        <RunSection label="Regular season" games={selected.regGames} />
        <RunSection label="Playoffs" games={selected.playoffGames} highlightFinal={g => getGameType(g) === 'tapitas bowl'} />
      </div>
    </CardShell>
  )

  const unicornRunCard = selected && selected.unicorn && (
    <CardShell title="Unicorn run" subtitle={`${selected.unicorn} · the road to the bottom · tap a game to open it`}>
      <div className="space-y-4 p-3 lg:p-4">
        <RunSection label="Regular season" games={selected.unicornRegGames} />
        <RunSection label="Consolation" games={selected.unicornConsolationGames} highlightFinal={g => ['unicórnio', 'unicornio', 'unicorn'].includes(normalizeString(g.gameType))} />
      </div>
    </CardShell>
  )

  const recapCard = selected?.recap && (
    <CardShell title="Season recap">
      <div className="max-w-[760px] px-3 py-4 text-[14px] leading-[1.7] text-[#2F3542] lg:px-4">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-[#111]">{children}</strong>,
            em: ({ children }) => <em className="font-semibold not-italic text-[#02275F]">{children}</em>,
            h1: ({ children }) => <h3 className="mb-2 mt-4 text-[16px] font-bold text-[#111]">{children}</h3>,
            h2: ({ children }) => <h3 className="mb-2 mt-4 text-[16px] font-bold text-[#111]">{children}</h3>,
            h3: ({ children }) => <h3 className="mb-2 mt-4 text-[16px] font-bold text-[#111]">{children}</h3>,
          }}
        >
          {selected.recap}
        </ReactMarkdown>
      </div>
    </CardShell>
  )

  const playerRow = (label, p, value, onClick) => p && (
    <StatRow
      onClick={onClick}
      left={<PlayerPhoto playerId={playerInfo(p.name)?.playerId} name={p.name} />}
      eyebrow={label}
      title={p.name}
      subtitle={p.team}
      value={value}
    />
  )

  const awardsCard = selected && (
    <CardShell title="Season awards" subtitle={`${selected.season} season`} sidebar>
      {/* MVP da temporada (mais pontos) em destaque, com a foto recortada */}
      {selected.topScorer && (
        <button
          type="button"
          onClick={() => setProfile({ name: selected.topScorer.name, team: selected.topScorer.team })}
          className="group relative mx-3 mt-3 block w-[calc(100%-1.5rem)] overflow-hidden rounded-xl text-left text-white lg:mx-4 lg:w-[calc(100%-2rem)]"
        >
          <BrandBackdrop />
          <div className="absolute -right-2 bottom-0"><PlayerCutout sleeperId={playerInfo(selected.topScorer.name)?.playerId} name={selected.topScorer.name} className="h-[112px]" /></div>
          <div className="relative max-w-[60%] px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E8C766]">⭐ Season MVP</div>
            <div className="mt-1 truncate text-[15px] font-bold">{selected.topScorer.name}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/75"><span className="rounded-full bg-white p-px"><TeamLogo name={selected.topScorer.team} size={14} /></span><span className="truncate">{selected.topScorer.team}</span></div>
            <div className="mt-2 text-[24px] font-bold leading-none tabular-nums">{selected.topScorer.total.toFixed(1)}<span className="ml-1 text-[11px] font-medium text-white/70">pts</span></div>
          </div>
        </button>
      )}
      <CardGroup label="Final standings" first>
        <StatRow href={teamHref(selected.champion)} left={<TeamLogo name={selected.champion} size={28} />} eyebrow="🏆 Champion" title={selected.champion || '—'} subtitle={`Reg. season ${selected.championRecord?.wins ?? 0}–${selected.championRecord?.losses ?? 0} · Playoffs ${selected.playoffGames.filter(g => g?.result === 'W').length}–${selected.playoffGames.filter(g => g?.result === 'L').length}`} />
        {selected.runnerUp && <StatRow href={teamHref(selected.runnerUp)} left={<TeamLogo name={selected.runnerUp} size={28} />} eyebrow="🥈 Runner-up" title={selected.runnerUp} subtitle={selected.runnerUpLine} />}
        {selected.third && <StatRow href={teamHref(selected.third)} left={<TeamLogo name={selected.third} size={28} />} eyebrow="🥉 Third place" title={selected.third} subtitle={selected.thirdLine} />}
        <StatRow onClick={() => setView('unicorn')} left={<TeamLogo name={selected.unicorn} size={28} />} eyebrow="🦄 Unicorn" title={selected.unicorn || '—'} subtitle={`Reg. season ${stageRecord(selected.unicorn, 'reg season')} · Consolation ${stageRecord(selected.unicorn, 'consolation')}`} />
      </CardGroup>
      <CardGroup label="Player dominance">
        {playerRow('Most points', selected.topScorer, selected.topScorer?.total.toFixed(1), () => setProfile({ name: selected.topScorer.name, team: selected.topScorer.team }))}
        {playerRow('Best average (6+ starts)', selected.topAverage, selected.topAverage ? (selected.topAverage.total / selected.topAverage.starts).toFixed(2) : null, () => setProfile({ name: selected.topAverage.name, team: selected.topAverage.team }))}
        {selected.bestPlayerGame && (
          <StatRow href={selected.bestPlayerGame.href} left={<PlayerPhoto playerId={playerInfo(selected.bestPlayerGame.name)?.playerId} name={selected.bestPlayerGame.name} />} eyebrow="Best single game" title={selected.bestPlayerGame.name} subtitle={`${selected.bestPlayerGame.team} vs ${selected.bestPlayerGame.opp} · Wk ${selected.bestPlayerGame.week}`} value={selected.bestPlayerGame.pts.toFixed(2)} valueClass="text-[#1E8E3E]" />
        )}
      </CardGroup>
      <CardGroup label="Single games">
        <StatRow href={matchupHref(selected.highestScoreGame)} left={<TeamLogo name={getTeam(selected.highestScoreGame)} size={28} />} eyebrow="Highest score" title={getTeam(selected.highestScoreGame) || '—'} subtitle={`vs ${getOpponent(selected.highestScoreGame) || '—'} · Wk ${getField(selected.highestScoreGame, 'Week', 'week') || '—'}`} value={parseNumber(getField(selected.highestScoreGame, 'PF', 'pf')).toFixed(2)} valueClass="text-[#1E8E3E]" />
        <StatRow href={matchupHref(selected.worstPFGame)} left={<TeamLogo name={getTeam(selected.worstPFGame)} size={28} />} eyebrow="Lowest score" title={getTeam(selected.worstPFGame) || '—'} subtitle={`vs ${getOpponent(selected.worstPFGame) || '—'} · Wk ${getField(selected.worstPFGame, 'Week', 'week') || '—'}`} value={parseNumber(getField(selected.worstPFGame, 'PF', 'pf')).toFixed(2)} valueClass="text-[#D01F2D]" />
        <StatRow href={matchupHref(selected.closestGame)} left={<TeamLogo name={getTeam(selected.closestGame)} size={28} />} eyebrow="Closest game" title={`${getTeam(selected.closestGame) || '—'} vs ${getOpponent(selected.closestGame) || '—'}`} subtitle={`${gameScore(selected.closestGame)} · Wk ${getField(selected.closestGame, 'Week', 'week') || '—'}`} value={gameMargin(selected.closestGame)} />
        <StatRow href={matchupHref(selected.biggestBlowout)} left={<TeamLogo name={getTeam(selected.biggestBlowout)} size={28} />} eyebrow="Biggest win" title={`${getTeam(selected.biggestBlowout) || '—'} vs ${getOpponent(selected.biggestBlowout) || '—'}`} subtitle={`${gameScore(selected.biggestBlowout)} · Wk ${getField(selected.biggestBlowout, 'Week', 'week') || '—'}`} value={`+${gameMargin(selected.biggestBlowout)}`} />
      </CardGroup>
      <div className="h-2 lg:h-3" />
    </CardShell>
  )

  const listRow = (s, team, isActive, onClick) => (
    <StatRow
      key={s.season}
      onClick={onClick}
      left={<TeamLogo name={team} size={24} />}
      title={team || '—'}
      value={s.season}
      valueClass={isActive ? 'text-[#D01F2D]' : 'text-[#6B7280]'}
    />
  )

  const championsCard = (
    <CardShell title="Champions" subtitle="Every Tapitas League title" sidebar>
      <div className="py-1 lg:py-2">
        {seasonData.map(s => listRow(s, s.champion, view === 'champion' && s.season === selected?.season, () => selectSeason(s.season, 'champion')))}
      </div>
    </CardShell>
  )

  const unicornsCard = (
    <CardShell title="Unicorns 🦄" subtitle="The last of every season" sidebar>
      <div className="py-1 lg:py-2">
        {seasonData.filter(s => s.unicorn).map(s => listRow(s, s.unicorn, view === 'unicorn' && s.season === selected?.season, () => selectSeason(s.season, 'unicorn')))}
      </div>
    </CardShell>
  )

  return (
    <PageShell loading={loading}>
      {seasonData.length === 0 ? (
        <div className="rounded-xl bg-white py-16 text-center">
          <div className="text-[14px] font-semibold text-[#111]">No history data found</div>
          <div className="mt-1 text-[12px] text-[#6B7280]">Check the GAME_FACTS_ALL data source and its column names.</div>
        </div>
      ) : (
        <>
          {/* Temporadas (mesmo padrão do seletor da Draft/Matchups) */}
          <div className="mb-2 flex items-stretch overflow-hidden rounded-xl bg-white">
            <span className="flex flex-shrink-0 items-center border-r border-[#EEF0F2] px-3 text-[14px] font-bold text-[#111]">History</span>
            <div className="scroll-hide flex min-w-0 flex-1 overflow-x-auto">
              {seasonData.map(s => (
                <button
                  key={s.season}
                  onClick={() => setOpenSeason(s.season)}
                  title={view === 'unicorn' ? `🦄 ${s.unicorn || ''}` : `🏆 ${s.champion || ''}`}
                  className={`flex flex-shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] tabular-nums transition-colors ${selected?.season === s.season ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280] hover:text-[#111]'}`}
                >
                  {/* Logo do campeão (ou do unicórnio) de cada temporada */}
                  <span className={`rounded-full ${selected?.season === s.season ? 'ring-2 ring-[#E8C766]' : 'opacity-80'}`}><TeamLogo name={view === 'unicorn' ? s.unicorn : s.champion} size={20} /></span>
                  {s.season}
                </button>
              ))}
            </div>
            <div className="hidden flex-shrink-0 items-center border-l border-[#EEF0F2] px-2 sm:flex">
              <Segmented options={[['champion', '🏆 Champion'], ['unicorn', '🦄 Unicorn']]} value={view} onChange={setView} />
            </div>
          </div>
          <div className="mb-2 sm:hidden">
            <Tabs tabs={[['champion', '🏆 Champion story'], ['unicorn', '🦄 Unicorn story']]} value={view} onChange={setView} />
          </div>

          <div data-sticky-cols className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)_260px] lg:items-start lg:gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px] xl:gap-5">
            <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC] hidden lg:block">
              {championsCard}
              {unicornsCard}
            </aside>
            <div className="min-w-0">
              {view === 'unicorn' ? unicornCard : finalCard}
              {view === 'unicorn'
                ? selected?.unicorn && <RoadCard title="Road to the bottom 🦄" subtitle={`${selected.unicorn} · consolation bracket`} list={selected.unicornConsolationGames || []} tone="red" />
                : selected && <RoadCard title="Road to the title 🏆" subtitle={`${selected.champion} · playoff bracket`} list={selected.playoffGames || []} />}
              {view === 'unicorn' ? unicornRunCard : runCard}
              <div className="lg:hidden">{awardsCard}</div>
              {recapCard}
            </div>
            <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC] hidden lg:block">{awardsCard}</aside>
          </div>
        </>
      )}

      {profile && (
        <PlayerProfileModal
          key={`${profile.name}|${profile.team}`}
          rawName={profile.name}
          displayName={profile.name}
          position={playerInfo(profile.name)?.pos}
          playerId={playerInfo(profile.name)?.playerId}
          games={games}
          initialTeams={[profile.team]}
          onClose={closeProfile}
        />
      )}
    </PageShell>
  )
}
