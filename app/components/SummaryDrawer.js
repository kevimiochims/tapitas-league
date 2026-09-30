'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

const TEAM_AVATARS = {
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

function getTeamAvatar(name) {
  return TEAM_AVATARS[normalizeString(name)] || null
}

function TeamAvatar({ team, size = 'h-8 w-8' }) {
  const avatar = getTeamAvatar(team)

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={team}
        className={`${size} flex-shrink-0 rounded-lg object-cover`}
      />
    )
  }

  return (
    <div className={`flex ${size} flex-shrink-0 items-center justify-center rounded-lg bg-[#EEF0F2] text-[10px] font-semibold text-[#4B5563]`}>
      {String(team || '').slice(0, 2).toUpperCase()}
    </div>
  )
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const text = String(value).replace(',', '.').trim()
  const parsed = parseFloat(text)
  return Number.isNaN(parsed) ? 0 : parsed
}

async function safeSheetFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch {
    return []
  }
}

const teamOf = r => r?.Team || r?.team

function SummaryCard({ title, children }) {
  return (
    <section className="mb-2 overflow-hidden rounded-xl bg-white">
      <h3 className="px-4 pb-2 pt-4 text-[15px] font-bold leading-tight text-[#111]">{title}</h3>
      <div className="mx-4 border-t border-[#E6E8EB]" />
      <div className="divide-y divide-[#F1F2F4]">{children}</div>
    </section>
  )
}

function SummaryRow({ team, label, sub, value, size = 'h-8 w-8', strong = false }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <TeamAvatar team={team} size={size} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] text-[#6B7280]">{label}</div>
        <div className={`truncate text-[14px] leading-tight text-[#111] ${strong ? 'font-bold' : 'font-medium'}`}>{team}</div>
        {sub && <div className="truncate text-[12px] text-[#6B7280]">{sub}</div>}
      </div>
      {value && <div className="flex-shrink-0 text-[14px] font-semibold tabular-nums text-[#111]">{value}</div>}
    </div>
  )
}

export default function SummaryDrawer({ open, onClose, allSeasons }) {

  const [selectedSeason, setSelectedSeason] = useState(null)
  const [seasonSummary, setSeasonSummary] = useState(null)
  const [playedSeasons, setPlayedSeasons] = useState([])

  // Fetch which seasons actually have played games (PF > 0)
  useEffect(() => {
    if (!open || playedSeasons.length > 0) return
    safeSheetFetch(`${BASE_URL}/GAME_FACTS_ALL`).then(data => {
      const seasons = [...new Set(
        data
          .filter(g => parseNumber(g?.PF || g?.Score || 0) > 0)
          .map(g => String(g?.Season || '').trim())
          .filter(Boolean)
      )].sort((a, b) => Number(a) - Number(b))
      setPlayedSeasons(seasons)
      // Default to the last season that has played games
      if (!selectedSeason && seasons.length > 0) {
        setSelectedSeason(seasons[seasons.length - 1])
      }
    })
  }, [open])

  // Sync selectedSeason when playedSeasons loads
  useEffect(() => {
    if (playedSeasons.length > 0 && !selectedSeason) {
      setSelectedSeason(playedSeasons[playedSeasons.length - 1])
    }
  }, [playedSeasons])

  // reseta o summary ao trocar de temporada
  useEffect(() => {
    setSeasonSummary(null)
  }, [selectedSeason])

  // carrega o summary
  useEffect(() => {
    if (!open || !selectedSeason) return

    async function loadSummary() {
      const [historyJson, historyRawJson, gamesJson] = await Promise.all([
        safeSheetFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
        safeSheetFetch(`${BASE_URL}/TEAM_HISTORY_RAW`),
        safeSheetFetch(`${BASE_URL}/GAME_FACTS_ALL`),
      ])

      const SEASON = String(selectedSeason)

      const rawSeasonTeams = historyRawJson.filter(r =>
        String(r?.Season || '').trim() === SEASON
      )

      const champion = rawSeasonTeams.find(r =>
        String(r?.Champion || '').toUpperCase() === 'TRUE'
      )

      const finalist = rawSeasonTeams.find(r =>
        String(r?.Reached_Final || '').toUpperCase() === 'TRUE' &&
        String(r?.Champion || '').toUpperCase() !== 'TRUE'
      )

      const sortedByWins = [...rawSeasonTeams].sort((a, b) =>
        parseNumber(b?.RS_W) - parseNumber(a?.RS_W)
      )

      const bestRecord = sortedByWins[0]
      const worstRecord = sortedByWins[sortedByWins.length - 1]

      const sortedByPF = [...rawSeasonTeams].sort((a, b) =>
        parseNumber(b?.RS_PF) - parseNumber(a?.RS_PF)
      )

      const highestScorer = sortedByPF[0]
      const lowestScorer = sortedByPF[sortedByPF.length - 1]

      const validStandings = rawSeasonTeams.filter(team =>
        parseNumber(team?.Standing) > 0
      )

      const unicorn = [...validStandings].sort((a, b) =>
        parseNumber(a?.Standing) - parseNumber(b?.Standing)
      )[validStandings.length - 1]

      const seasonGames = gamesJson.filter(r =>
        String(r?.Season || '').trim() === SEASON &&
        parseNumber(r?.PF || 0) > 0 &&
        parseNumber(r?.PA || 0) > 0
      )

      const highestGame = seasonGames.reduce((best, g) => {
        const score = parseNumber(g?.PF || 0)
        return score > (best?.score ?? 0)
          ? { score, team: String(g?.Team || '').trim(), week: g?.Week, opponent: String(g?.Opponent || '').trim() }
          : best
      }, null)

      const lowestGame = seasonGames.reduce((worst, g) => {
        const score = parseNumber(g?.PF || 0)
        if (score === 0) return worst
        return score < (worst?.score ?? 9999)
          ? { score, team: String(g?.Team || '').trim(), week: g?.Week, opponent: String(g?.Opponent || '').trim() }
          : worst
      }, null)

      const closestGame = seasonGames.reduce((closest, g) => {
        const score = parseNumber(g?.PF || 0)
        const opp = parseNumber(g?.PA || 0)
        if (score === 0 || opp === 0) return closest
        const margin = Math.abs(score - opp)
        return margin < (closest?.margin ?? 9999)
          ? { margin, team: String(g?.Team || '').trim(), score, opp, week: g?.Week, opponent: String(g?.Opponent || '').trim() }
          : closest
      }, null)

      const biggestWin = seasonGames.reduce((best, g) => {
        const score = parseNumber(g?.PF || 0)
        const opp = parseNumber(g?.PA || 0)
        if (score <= opp) return best
        const margin = score - opp
        return margin > (best?.margin ?? 0)
          ? { margin, team: String(g?.Team || '').trim(), score, opp, week: g?.Week, opponent: String(g?.Opponent || '').trim() }
          : best
      }, null)

      setSeasonSummary({
        season: SEASON,
        champion,
        finalist,
        bestRecord,
        worstRecord,
        highestScorer,
        lowestScorer,
        unicorn,
        highestGame,
        lowestGame,
        closestGame,
        biggestWin,
      })
    }

    loadSummary()
  }, [open, selectedSeason])

  const s = seasonSummary
  const wl = (r, w = 'RS_W', l = 'RS_L') => `${parseNumber(r?.[w])}–${parseNumber(r?.[l])}`
  const seasonOptions = (playedSeasons.length > 0 ? playedSeasons : (allSeasons || [])).slice().sort((a, b) => b - a)
  const gameSub = g => `vs ${g.opponent} · Week ${g.week}`

  return (
    <>
      {/* OVERLAY */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50"
        />
      )}

      {/* DRAWER */}
      <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-[#EDEEF0] shadow-xl transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}>

        {/* HEADER */}
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between bg-[#02275F] pl-4 pr-1">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="text-[15px] font-bold text-white">Season Summary</h2>
            <label className="relative">
              <span className="sr-only">Season</span>
              <select
                value={selectedSeason || ''}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="cursor-pointer appearance-none rounded-full bg-white/10 py-1 pl-3 pr-7 text-[13px] font-semibold text-white outline-none hover:bg-white/15"
              >
                {seasonOptions.map((season) => (
                  <option key={season} value={season} className="text-[#111]">
                    {season}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70" />
            </label>
            {s && !s.champion && (
              <span className="rounded bg-[#F5C518] px-1.5 py-0.5 text-[10px] font-semibold text-[#111]">
                In progress
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center text-white transition-opacity hover:opacity-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONTEÚDO */}
        <div className="p-2">
          {!s ? (
            <div className="py-20 text-center text-[13px] text-[#6B7280]">Loading...</div>
          ) : (
            <>
              {!s.champion && (
                <div className="mb-2 rounded-xl bg-[#FFF9E5] px-4 py-3">
                  <div className="mb-0.5 text-[13px] font-semibold text-[#111]">⏳ Temporada em andamento</div>
                  <div className="text-[12px] text-[#6B7280]">Dados parciais. Champion, Finalist e Unicórnio só aparecem quando a temporada terminar.</div>
                </div>
              )}

              {s.champion && (
                <SummaryCard title="Final standings">
                  <SummaryRow
                    team={teamOf(s.champion)} label="🏆 Champion" size="h-10 w-10" strong
                    sub={`${wl(s.champion)} reg season • ${wl(s.champion, 'PO_W', 'PO_L')} playoffs`}
                  />
                  {s.finalist && (
                    <SummaryRow
                      team={teamOf(s.finalist)} label="🥈 2nd place" size="h-10 w-10"
                      sub={`${wl(s.finalist)} reg season • ${wl(s.finalist, 'PO_W', 'PO_L')} playoffs`}
                    />
                  )}
                  {s.unicorn && (
                    <SummaryRow
                      team={teamOf(s.unicorn)} label="🦄 Unicórnio" size="h-10 w-10"
                      sub={`${wl(s.unicorn)} reg season`}
                    />
                  )}
                </SummaryCard>
              )}

              <SummaryCard title="Regular season">
                {s.bestRecord && <SummaryRow team={teamOf(s.bestRecord)} label="🚀 Best record" value={wl(s.bestRecord)} />}
                {s.worstRecord && <SummaryRow team={teamOf(s.worstRecord)} label="💩 Worst record" value={wl(s.worstRecord)} />}
                {s.highestScorer && <SummaryRow team={teamOf(s.highestScorer)} label="💯 Top scorer" value={`${Math.round(parseNumber(s.highestScorer.RS_PF))} pts`} />}
                {s.lowestScorer && <SummaryRow team={teamOf(s.lowestScorer)} label="😵‍💫 Lowest scorer" value={`${Math.round(parseNumber(s.lowestScorer.RS_PF))} pts`} />}
              </SummaryCard>

              <SummaryCard title="Notable games">
                {s.highestGame && (
                  <SummaryRow team={s.highestGame.team} label="🔥 Highest score" sub={gameSub(s.highestGame)} value={s.highestGame.score.toFixed(2)} />
                )}
                {s.closestGame && (
                  <SummaryRow
                    team={s.closestGame.team} label="⚔️ Closest game"
                    sub={`${gameSub(s.closestGame)} · margin ${s.closestGame.margin.toFixed(2)}`}
                    value={`${s.closestGame.score.toFixed(2)}–${s.closestGame.opp.toFixed(2)}`}
                  />
                )}
                {s.biggestWin && (
                  <SummaryRow
                    team={s.biggestWin.team} label="💥 Biggest win"
                    sub={`${gameSub(s.biggestWin)} · margin ${s.biggestWin.margin.toFixed(2)}`}
                    value={`${s.biggestWin.score.toFixed(2)}–${s.biggestWin.opp.toFixed(2)}`}
                  />
                )}
                {s.lowestGame && (
                  <SummaryRow team={s.lowestGame.team} label="😬 Lowest score" sub={gameSub(s.lowestGame)} value={s.lowestGame.score.toFixed(2)} />
                )}
              </SummaryCard>
            </>
          )}
        </div>
      </div>
    </>
  )
}
