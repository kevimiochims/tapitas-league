'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { PageShell, CardShell, CardGroup, StatRow, Tag, ResultBadge, TeamLogo } from '../components/ui'

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
  useEffect(() => {
    async function load() {
      const [data, historyData] = await Promise.all([
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_RAW`),
      ])

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

  const RunGame = ({ g, highlight }) => (
    <div className={`flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 ${highlight ? 'bg-[#FFF6D6]' : 'bg-[#F4F5F7]'}`}>
      <ResultBadge result={g.result} />
      <TeamLogo name={g.opp} size={20} />
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-[#111]">vs {g.opp}</div>
        <div className="text-[11px] tabular-nums text-[#6B7280]">Wk {g.week || '—'} · {Number(g.score).toFixed(1)}–{Number(g.oppScore).toFixed(1)}</div>
      </div>
    </div>
  )

  const finalCard = selected && (
    <Link href={matchupHref(selected.championshipFinalGame)} className="group mb-2 block overflow-hidden rounded-xl bg-white">
      <div className="px-3 py-4 sm:py-5">
        <div className="mb-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2B8] px-3 py-1 text-[12px] font-medium text-[#6B5A00]">
            <Trophy className="h-3.5 w-3.5" /> {selected.season} · Tapitas Bowl
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <div className="flex flex-col items-center gap-2">
            <TeamLogo name={selected.champion} size={48} />
            <div className="text-center text-[14px] font-semibold leading-tight text-[#111] sm:text-[16px]">{selected.champion || '—'}</div>
            <div className="font-bold leading-none tabular-nums text-[#111]" style={{ fontSize: 'clamp(30px, 5vw, 44px)' }}>{selected.championshipScore?.toFixed(2) ?? '—'}</div>
            <Tag tone="gold">🏆 Champion</Tag>
          </div>
          <div className="flex flex-col items-center gap-1 self-center">
            <div className="text-[14px] font-semibold text-[#9CA3AF]">VS</div>
            <div className="text-[11px] font-bold tabular-nums text-[#6B7280]">
              {Number.isFinite(selected.championshipScore) && Number.isFinite(selected.championshipOpponentScore) ? Math.abs(selected.championshipScore - selected.championshipOpponentScore).toFixed(2) : '—'}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">margin</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <TeamLogo name={selected.championshipOpponent} size={48} />
            <div className="text-center text-[14px] font-semibold leading-tight text-[#6B7280] sm:text-[16px]">{selected.championshipOpponent || '—'}</div>
            <div className="font-bold leading-none tabular-nums text-[#9CA3AF]" style={{ fontSize: 'clamp(30px, 5vw, 44px)' }}>{selected.championshipOpponentScore?.toFixed(2) ?? '—'}</div>
            <Tag>Runner-up</Tag>
          </div>
        </div>
      </div>
      <div className="border-t border-[#EEF0F2] py-2 text-center text-[12px] font-medium text-[#D01F2D] group-hover:underline">Open the final</div>
    </Link>
  )

  const awardsCard = selected && (
    <CardShell title="Season awards" subtitle={`${selected.season} season`} sidebar>
      <CardGroup label="Standings" first>
        <StatRow href={teamHref(selected.champion)} left={<TeamLogo name={selected.champion} size={28} />} eyebrow="🏆 Champion" title={selected.champion || '—'} subtitle={`Reg. season ${selected.championRecord?.wins ?? 0}–${selected.championRecord?.losses ?? 0} · Playoffs ${selected.playoffGames.filter(g => g?.result === 'W').length}–${selected.playoffGames.filter(g => g?.result === 'L').length} · ${(selected.avgPF ?? 0).toFixed(1)} pts/wk`} />
        <StatRow href={teamHref(selected.unicorn)} left={<TeamLogo name={selected.unicorn} size={28} />} eyebrow="🦄 Unicorn" title={selected.unicorn || '—'} subtitle={`Reg. season ${stageRecord(selected.unicorn, 'reg season')} · Consolation ${stageRecord(selected.unicorn, 'consolation')}`} />
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

  const runCard = selected && (
    <CardShell title="Championship run" subtitle={`${selected.champion || '—'} · full campaign`}>
      <div className="space-y-4 p-3 lg:p-4">
        <div>
          <div className="mb-2 text-[12px] font-medium text-[#6B7280]">Regular season · {selected.championRecord?.wins ?? 0}–{selected.championRecord?.losses ?? 0}</div>
          <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 md:grid-cols-3">
            {selected.regGames.map((g, index) => <RunGame key={`rs-${index}`} g={g} />)}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[12px] font-medium text-[#6B7280]">Playoffs · {selected.playoffGames.filter(g => g?.result === 'W').length}–{selected.playoffGames.filter(g => g?.result === 'L').length}</div>
          <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 md:grid-cols-3">
            {selected.playoffGames.map((g, index) => <RunGame key={`po-${index}`} g={g} highlight={getGameType(g) === 'tapitas bowl'} />)}
          </div>
        </div>
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

  const championsCard = (
    <CardShell title="Champions" subtitle="Every Tapitas League title" sidebar>
      <div className="py-1 lg:py-2">
        {seasonData.map(s => (
          <StatRow
            key={s.season}
            onClick={() => setOpenSeason(s.season)}
            left={<TeamLogo name={s.champion} size={24} />}
            title={s.champion || '—'}
            subtitle={s.unicorn ? `🦄 ${s.unicorn}` : undefined}
            value={s.season}
            valueClass={s.season === selected?.season ? 'text-[#D01F2D]' : 'text-[#6B7280]'}
          />
        ))}
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
                  className={`flex-shrink-0 border-b-2 px-3 py-3 text-[13px] tabular-nums transition-colors ${selected?.season === s.season ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280] hover:text-[#111]'}`}
                >
                  {s.season}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)_260px] lg:items-start lg:gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px] xl:gap-5">
            <aside className="hidden lg:block">{championsCard}</aside>
            <div className="min-w-0">
              {finalCard}
              <div className="lg:hidden">{awardsCard}</div>
              {runCard}
              {recapCard}
            </div>
            <aside className="hidden lg:block">{awardsCard}</aside>
          </div>
        </>
      )}
    </PageShell>
  )
}
