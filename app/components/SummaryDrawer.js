'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, X } from 'lucide-react'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

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

  // define a temporada mais recente ao abrir
  useEffect(() => {
    if (open && allSeasons?.length > 0 && !selectedSeason) {
      setSelectedSeason(allSeasons[allSeasons.length - 1])
    }
  }, [open, allSeasons])

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
        String(r?.Season || '').trim() === SEASON
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
      {/* OVERLAY */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      {/* DRAWER */}
      <div className={`fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-[#080f1e] border-l border-white/10 transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}>

        {/* HEADER */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#080f1e] px-6 py-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
              Season Summary
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="text-xl font-black text-white">
                Season{' '}
                <select
                  value={selectedSeason || ''}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1 text-sm font-bold text-white outline-none"
                >
                  {allSeasons
                    ?.slice()
                    .sort((a, b) => b - a)
                    .map((season) => (
                      <option key={season} value={season} className="bg-[#080f1e]">
                        {season}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* CONTEÚDO */}
        <div className="p-6">
          {!seasonSummary ? (
            <div className="flex items-center justify-center py-20 text-slate-500 font-bold">
              Loading...
            </div>
          ) : (
            <div className="flex flex-col gap-4">

              {seasonSummary.champion && (
                <div className="rounded-[24px] border border-cyan-400/30 bg-cyan-400/[0.06] p-5">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">🏆 Champion</div>
                  <div className="text-2xl font-black text-white">{seasonSummary.champion.Team || seasonSummary.champion.team}</div>
                  <div className="mt-1 text-sm text-slate-400">
                    {parseNumber(seasonSummary.champion.RS_W)}–{parseNumber(seasonSummary.champion.RS_L)} reg season
                    {' • '}
                    {parseNumber(seasonSummary.champion.PO_W)}–{parseNumber(seasonSummary.champion.PO_L)} playoffs
                  </div>
                </div>
              )}

              {seasonSummary.finalist && (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">🥈 2nd Place</div>
                  <div className="text-xl font-black text-white">{seasonSummary.finalist.Team || seasonSummary.finalist.team}</div>
                  <div className="mt-1 text-sm text-slate-400">
                    {parseNumber(seasonSummary.finalist.RS_W)}–{parseNumber(seasonSummary.finalist.RS_L)} reg season
                    {' • '}
                    {parseNumber(seasonSummary.finalist.PO_W)}–{parseNumber(seasonSummary.finalist.PO_L)} playoffs
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {seasonSummary.bestRecord && (
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">🚀 Best Record</div>
                    <div className="text-lg font-black text-white">{seasonSummary.bestRecord.Team || seasonSummary.bestRecord.team}</div>
                    <span className="text-sm text-cyan-300">{parseNumber(seasonSummary.bestRecord.RS_W)}–{parseNumber(seasonSummary.bestRecord.RS_L)}</span>
                    <span className="text-sm text-slate-400"> (reg season)</span>
                  </div>
                )}
                {seasonSummary.worstRecord && (
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">💩 Worst Record</div>
                    <div className="text-lg font-black text-white">{seasonSummary.worstRecord.Team || seasonSummary.worstRecord.team}</div>
                    <span className="text-sm text-red-400">{parseNumber(seasonSummary.worstRecord.RS_W)}–{parseNumber(seasonSummary.worstRecord.RS_L)}</span>
                    <span className="text-sm text-slate-400"> (reg season)</span>
                  </div>
                )}
                {seasonSummary.highestScorer && (
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">💯 Top Scorer</div>
                    <div className="text-lg font-black text-white">{seasonSummary.highestScorer.Team || seasonSummary.highestScorer.team}</div>
                    <span className="text-sm text-cyan-300">{Math.round(parseNumber(seasonSummary.highestScorer.RS_PF))} pts</span>
                    <span className="text-sm text-slate-400"> (reg season)</span>
                  </div>
                )}
                {seasonSummary.lowestScorer && (
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">😵‍💫 Lowest Scorer</div>
                    <div className="text-lg font-black text-white">{seasonSummary.lowestScorer.Team || seasonSummary.lowestScorer.team}</div>
                    <span className="text-sm text-red-400">{Math.round(parseNumber(seasonSummary.lowestScorer.RS_PF))} pts</span>
                    <span className="text-sm text-slate-400"> (reg season)</span>
                  </div>
                )}
              </div>

              {seasonSummary.unicorn && (
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">🦄 Unicórnio</div>
                  <div className="text-xl font-black text-white">{seasonSummary.unicorn.Team || seasonSummary.unicorn.team}</div>
                  <div className="text-sm text-slate-400">
                    {parseNumber(seasonSummary.unicorn.RS_W)}–{parseNumber(seasonSummary.unicorn.RS_L)} reg season
                  </div>
                </div>
              )}

              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2">Notable Games</div>

              {seasonSummary.highestGame && (
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">🔥 Highest Score</div>
                  <div className="text-lg font-black text-white">{seasonSummary.highestGame.team}</div>
                  <div className="text-sm text-cyan-300">{seasonSummary.highestGame.score.toFixed(2)} pts</div>
                  <div className="text-xs text-slate-500">vs {seasonSummary.highestGame.opponent} · Week {seasonSummary.highestGame.week}</div>
                </div>
              )}

              {seasonSummary.closestGame && (
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">⚔️ Closest Game</div>
                  <div className="text-lg font-black text-white">{seasonSummary.closestGame.team}</div>
                  <div className="text-sm text-cyan-300">{seasonSummary.closestGame.score.toFixed(2)} vs {seasonSummary.closestGame.opp.toFixed(2)}</div>
                  <div className="text-xs text-slate-500">vs {seasonSummary.closestGame.opponent} · Week {seasonSummary.closestGame.week} · Margin: {seasonSummary.closestGame.margin.toFixed(2)}</div>
                </div>
              )}

              {seasonSummary.biggestWin && (
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">💥 Biggest Win</div>
                  <div className="text-lg font-black text-white">{seasonSummary.biggestWin.team}</div>
                  <div className="text-sm text-cyan-300">{seasonSummary.biggestWin.score.toFixed(2)} vs {seasonSummary.biggestWin.opp.toFixed(2)}</div>
                  <div className="text-xs text-slate-500">vs {seasonSummary.biggestWin.opponent} · Week {seasonSummary.biggestWin.week} · Margin: {seasonSummary.biggestWin.margin.toFixed(2)}</div>
                </div>
              )}

              {seasonSummary.lowestGame && (
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">😬 Lowest Score</div>
                  <div className="text-lg font-black text-white">{seasonSummary.lowestGame.team}</div>
                  <div className="text-sm text-red-400">{seasonSummary.lowestGame.score.toFixed(2)} pts</div>
                  <div className="text-xs text-slate-500">vs {seasonSummary.lowestGame.opponent} · Week {seasonSummary.lowestGame.week}</div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  )
}