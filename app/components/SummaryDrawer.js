'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, X } from 'lucide-react'

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
        className={`${size} flex-shrink-0 rounded-[12px] object-cover`}
      />
    )
  }

  return (
    <div className={`flex ${size} flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]`}>
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

  return (
      <>
        {/* Overlay */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-[#16274F]/55 backdrop-blur-[2px]"
            onClick={() => onClose()}
          />
        )}

        {/* Drawer */}
        <div
          className={`fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto border-l-4 border-[#0A0A0A] bg-[#F7F6F2] transition-transform duration-300 ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header do drawer */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-[#0A0A0A] bg-[#16274F] px-5 py-4 sm:px-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#B8C0D0]">
                Season Summary
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="text-xl font-black text-white">
                  Season{' '}
                  <select
                    value={selectedSeason || ''}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="border-2 border-[#0A0A0A] bg-[#F7F6F2] px-3 py-1 text-sm text-[#16274F] outline-none"
                  >
                    {(playedSeasons.length > 0 ? playedSeasons : (allSeasons || []))
                      .slice()
                      .sort((a, b) => b - a)
                      .map((season) => (
                        <option
                          key={season}
                          value={season}
                          className="bg-[#F7F6F2]"
                        >
                          {season}
                        </option>
                      ))}
                  </select>
                </div>
                {seasonSummary && !seasonSummary.champion && (
                  <span className="border-2 border-[#0A0A0A] bg-[#F5C518] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#0A0A0A]">
                    In Progress
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onClose()}
              className="flex h-10 w-10 items-center justify-center border-2 border-white/20 bg-white/10 text-[#16274F] transition-all hover:bg-white/20"
              aria-label="Close Summary"
            >
              ✕
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-4 sm:p-6">
            {!seasonSummary ? (
              <div className="flex items-center justify-center py-20 text-[#6B7280] font-bold">
                Loading...
              </div>
            ) : (
              <div className="flex flex-col gap-6">

                {/* In-progress warning */}
                {!seasonSummary.champion && (
                  <div className="border-2 border-[#0A0A0A] bg-[#FFF9E5] p-4 tp-shadow-navy-sm">
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-[#0A0A0A]">
                      ⏳ Temporada em andamento
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      Dados parciais. Champion, Finalist e Unicórnio só aparecem quando a temporada terminar.
                    </div>
                  </div>
                )}

                {/* Campeão */}
                {seasonSummary.champion && (
                  <div className="border-2 border-[#0A0A0A] bg-white p-5 tp-shadow-navy">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#D01F2D]">
                      🏆 Champion
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      {(() => {
                        const team = seasonSummary.champion.Team || seasonSummary.champion.team
                        const avatar = getTeamAvatar(team)
                        return avatar ? (
                          <img src={avatar} alt={team} className="h-12 w-12 flex-shrink-0 rounded-[14px] object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]">
                            {String(team || '').slice(0, 2).toUpperCase()}
                          </div>
                        )
                      })()}
                      <div className="min-w-0">
                        <div className="truncate text-2xl font-black text-[#16274F]">
                          {seasonSummary.champion.Team || seasonSummary.champion.team}
                        </div>
                        <div className="mt-1 text-sm text-[#3F4757]">
                          {parseNumber(seasonSummary.champion.RS_W)}–{parseNumber(seasonSummary.champion.RS_L)} reg season
                          {' • '}
                          {parseNumber(seasonSummary.champion.PO_W)}–{parseNumber(seasonSummary.champion.PO_L)} playoffs
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Finalista */}
                {seasonSummary.finalist && (
                  <div className="border-2 border-[#0A0A0A]/20 bg-white p-5 tp-shadow-navy-sm">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#D01F2D]">
                      🥈 Finalist
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      {(() => {
                        const team = seasonSummary.finalist.Team || seasonSummary.finalist.team
                        const avatar = getTeamAvatar(team)
                        return avatar ? (
                          <img src={avatar} alt={team} className="h-10 w-10 flex-shrink-0 rounded-[12px] object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]">
                            {String(team || '').slice(0, 2).toUpperCase()}
                          </div>
                        )
                      })()}
                      <div className="min-w-0">
                        <div className="truncate text-xl font-black text-[#16274F]">
                          {seasonSummary.finalist.Team || seasonSummary.finalist.team}
                        </div>
                        <div className="text-sm text-[#3F4757]">
                          {parseNumber(seasonSummary.finalist.RS_W)}–{parseNumber(seasonSummary.finalist.RS_L)} reg season
                          {' • '}
                          {parseNumber(seasonSummary.finalist.PO_W)}–{parseNumber(seasonSummary.finalist.PO_L)} playoffs
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recordes */}
                <div className="grid grid-cols-2 gap-3">
                  {seasonSummary.bestRecord && (
                    <div className="border-2 border-[#0A0A0A]/15 bg-white p-4">
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">🏅 Best Record</div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const team = seasonSummary.bestRecord.Team || seasonSummary.bestRecord.team
                          const avatar = getTeamAvatar(team)
                          return avatar ? (
                            <img src={avatar} alt={team} className="h-7 w-7 flex-shrink-0 rounded-[10px] object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]">
                              {String(team || '').slice(0, 2).toUpperCase()}
                            </div>
                          )
                        })()}
                        <div className="min-w-0 truncate text-lg font-black text-[#16274F]">{seasonSummary.bestRecord.Team || seasonSummary.bestRecord.team}</div>
                      </div>
                      <span className="text-sm text-[#16274F]">
                        {parseNumber(seasonSummary.bestRecord.RS_W)}–{parseNumber(seasonSummary.bestRecord.RS_L)}
                      </span>
                    </div>
                  )}

                  {seasonSummary.worstRecord && (
                    <div className="border-2 border-[#0A0A0A]/15 bg-white p-4">
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">📉 Worst Record</div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const team = seasonSummary.worstRecord.Team || seasonSummary.worstRecord.team
                          const avatar = getTeamAvatar(team)
                          return avatar ? (
                            <img src={avatar} alt={team} className="h-7 w-7 flex-shrink-0 rounded-[10px] object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]">
                              {String(team || '').slice(0, 2).toUpperCase()}
                            </div>
                          )
                        })()}
                        <div className="min-w-0 truncate text-lg font-black text-[#16274F]">{seasonSummary.worstRecord.Team || seasonSummary.worstRecord.team}</div>
                      </div>
                      <span className="text-sm font-black text-[#D01F2D]">
                        {parseNumber(seasonSummary.worstRecord.RS_W)}–{parseNumber(seasonSummary.worstRecord.RS_L)}
                      </span>
                    </div>
                  )}

                  {seasonSummary.highestScorer && (
                    <div className="border-2 border-[#0A0A0A]/15 bg-white p-4">
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">🔥 Highest Scorer</div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const team = seasonSummary.highestScorer.Team || seasonSummary.highestScorer.team
                          const avatar = getTeamAvatar(team)
                          return avatar ? (
                            <img src={avatar} alt={team} className="h-7 w-7 flex-shrink-0 rounded-[10px] object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]">
                              {String(team || '').slice(0, 2).toUpperCase()}
                            </div>
                          )
                        })()}
                        <div className="min-w-0 truncate text-lg font-black text-[#16274F]">{seasonSummary.highestScorer.Team || seasonSummary.highestScorer.team}</div>
                      </div>
                      <span className="text-sm text-[#16274F]">{Math.round(parseNumber(seasonSummary.highestScorer.RS_PF))} pts</span>
                      <span className="text-sm text-[#6B7280]"> (reg season)</span>
                    </div>
                  )}

                  {seasonSummary.lowestScorer && (
                    <div className="border-2 border-[#0A0A0A]/15 bg-white p-4">
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">😵‍💫 Lowest Scorer</div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const team = seasonSummary.lowestScorer.Team || seasonSummary.lowestScorer.team
                          const avatar = getTeamAvatar(team)
                          return avatar ? (
                            <img src={avatar} alt={team} className="h-7 w-7 flex-shrink-0 rounded-[10px] object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]">
                              {String(team || '').slice(0, 2).toUpperCase()}
                            </div>
                          )
                        })()}
                        <div className="min-w-0 truncate text-lg font-black text-[#16274F]">{seasonSummary.lowestScorer.Team || seasonSummary.lowestScorer.team}</div>
                      </div>
                      <span className="text-sm font-black text-[#D01F2D]">{Math.round(parseNumber(seasonSummary.lowestScorer.RS_PF))} pts</span>
                      <span className="text-sm text-[#6B7280]"> (reg season)</span>
                    </div>
                  )}
                </div>

                {/* Unicórnio */}
                {seasonSummary.unicorn && seasonSummary.champion && (
                  <div className="border-2 border-[#0A0A0A]/15 bg-white p-4">
                    <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">🦄 Unicórnio</div>
                    <div className="mt-2 flex items-center gap-3">
                      {(() => {
                        const team = seasonSummary.unicorn.Team || seasonSummary.unicorn.team
                        const avatar = getTeamAvatar(team)
                        return avatar ? (
                          <img src={avatar} alt={team} className="h-9 w-9 flex-shrink-0 rounded-[12px] object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]">
                            {String(team || '').slice(0, 2).toUpperCase()}
                          </div>
                        )
                      })()}
                      <div className="min-w-0">
                        <div className="truncate text-xl font-black text-[#16274F]">{seasonSummary.unicorn.Team || seasonSummary.unicorn.team}</div>
                        <div className="text-sm text-[#3F4757]">
                          {parseNumber(seasonSummary.unicorn.RS_W)}–{parseNumber(seasonSummary.unicorn.RS_L)} reg season
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Jogos notáveis */}
                <div className="mt-1 flex items-center gap-3 border-t-2 border-[#0A0A0A]/10 pt-5">
                  <span className="h-2.5 w-2.5 bg-[#D01F2D]" />
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6B7280]">Notable Games</div>
                </div>

                {seasonSummary.highestGame && (
                  <div className="border-2 border-[#0A0A0A]/15 bg-white p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">🔥 Highest Score</div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const team = seasonSummary.highestGame.team
                        const avatar = getTeamAvatar(team)
                        return avatar ? (
                          <img src={avatar} alt={team} className="h-7 w-7 flex-shrink-0 rounded-[10px] object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]">
                            {String(team || '').slice(0, 2).toUpperCase()}
                          </div>
                        )
                      })()}
                      <div className="min-w-0 truncate text-lg font-black text-[#16274F]">{seasonSummary.highestGame.team}</div>
                    </div>
                    <div className="text-sm text-[#16274F]">{seasonSummary.highestGame.score.toFixed(2)} pts</div>
                    <div className="text-xs text-[#6B7280]">vs {seasonSummary.highestGame.opponent} · Week {seasonSummary.highestGame.week}</div>
                  </div>
                )}

                {seasonSummary.closestGame && (
                  <div className="border-2 border-[#0A0A0A]/15 bg-white p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">⚔️ Closest Game</div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const team = seasonSummary.closestGame.team
                        const avatar = getTeamAvatar(team)
                        return avatar ? (
                          <img src={avatar} alt={team} className="h-7 w-7 flex-shrink-0 rounded-[10px] object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]">
                            {String(team || '').slice(0, 2).toUpperCase()}
                          </div>
                        )
                      })()}
                      <div className="min-w-0 truncate text-lg font-black text-[#16274F]">{seasonSummary.closestGame.team}</div>
                    </div>
                    <div className="text-sm text-[#16274F]">{seasonSummary.closestGame.score.toFixed(2)} vs {seasonSummary.closestGame.opp.toFixed(2)}</div>
                    <div className="text-xs text-[#6B7280]">vs {seasonSummary.closestGame.opponent} · Week {seasonSummary.closestGame.week} · Margin: {seasonSummary.closestGame.margin.toFixed(2)}</div>
                  </div>
                )}

                {seasonSummary.biggestWin && (
                  <div className="border-2 border-[#0A0A0A]/15 bg-white p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">💥 Biggest Win</div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const team = seasonSummary.biggestWin.team
                        const avatar = getTeamAvatar(team)
                        return avatar ? (
                          <img src={avatar} alt={team} className="h-7 w-7 flex-shrink-0 rounded-[10px] object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]">
                            {String(team || '').slice(0, 2).toUpperCase()}
                          </div>
                        )
                      })()}
                      <div className="min-w-0 truncate text-lg font-black text-[#16274F]">{seasonSummary.biggestWin.team}</div>
                    </div>
                    <div className="text-sm text-[#16274F]">{seasonSummary.biggestWin.score.toFixed(2)} vs {seasonSummary.biggestWin.opp.toFixed(2)}</div>
                    <div className="text-xs text-[#6B7280]">vs {seasonSummary.biggestWin.opponent} · Week {seasonSummary.biggestWin.week} · Margin: {seasonSummary.biggestWin.margin.toFixed(2)}</div>
                  </div>
                )}

                {seasonSummary.lowestGame && (
                  <div className="border-2 border-[#0A0A0A]/15 bg-white p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">😬 Lowest Score</div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const team = seasonSummary.lowestGame.team
                        const avatar = getTeamAvatar(team)
                        return avatar ? (
                          <img src={avatar} alt={team} className="h-7 w-7 flex-shrink-0 rounded-[10px] object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/8 text-[10px] font-black text-[#16274F]">
                            {String(team || '').slice(0, 2).toUpperCase()}
                          </div>
                        )
                      })()}
                      <div className="min-w-0 truncate text-lg font-black text-[#16274F]">{seasonSummary.lowestGame.team}</div>
                    </div>
                    <div className="text-sm font-black text-[#D01F2D]">{seasonSummary.lowestGame.score.toFixed(2)} pts</div>
                    <div className="text-xs text-[#6B7280]">vs {seasonSummary.lowestGame.opponent} · Week {seasonSummary.lowestGame.week}</div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </>
  )
}
