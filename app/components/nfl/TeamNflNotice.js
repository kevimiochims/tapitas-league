'use client'

import { AlertTriangle, CalendarOff } from 'lucide-react'
import { Tag, PositionBadge, normalizeTeamKey } from '../ui'
import { useLeagueStatus } from './useNflData'
import { injuryRank, injuryTone } from './shared'

function PlayerChip({ p, children, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen?.(p)} className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F5F7] py-1 pl-1.5 pr-2.5 text-[12px] transition-colors hover:bg-[#ECEEF1]">
      <PositionBadge position={p.pos} />
      <span className={p.starter ? 'font-semibold text-[#111]' : 'text-[#3F4757]'}>{p.name}</span>
      <span className="text-[#9CA3AF]">{p.nflTeam}</span>
      {children}
    </button>
  )
}

// Aviso no elenco de cada franquia: lesionados e jogadores de folga (bye)
export default function TeamNflNotice({ team, onOpenPlayer }) {
  const { data } = useLeagueStatus()
  const roster = (data?.teams || []).find(t => normalizeTeamKey(t.team) === normalizeTeamKey(team))
  if (!roster) return null

  const injured = roster.players.filter(p => p.injury)
    .sort((a, b) => Number(b.starter) - Number(a.starter) || injuryRank(a.injury.status) - injuryRank(b.injury.status))
  const byeNow = roster.players.filter(p => p.byeThisWeek)
  const byeNext = roster.players.filter(p => p.byeNextWeek)
  const clean = !injured.length && !byeNow.length && !byeNext.length

  return (
    <div className="mb-2 overflow-hidden rounded-xl bg-white">
      <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold leading-tight text-[#111]">Roster status</h2>
          <div className="mt-0.5 text-[12px] text-[#6B7280]">
            {data.week ? `NFL week ${data.week}` : 'NFL'} · {roster.source === 'sleeper' ? 'live Sleeper roster' : `lineup from week ${roster.lineupWeek}`} · injuries via Sleeper
          </div>
        </div>
        {clean && <Tag tone="green">All clear</Tag>}
      </div>
      {!clean && (
        <div className="space-y-2.5 border-t border-[#EEF0F2] px-3 py-3 sm:px-5">
          {injured.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-[#B3171F]"><AlertTriangle className="h-3.5 w-3.5" />Injuries ({injured.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {injured.map(p => (
                  <PlayerChip key={p.id || p.name} p={p} onOpen={x => onOpenPlayer?.({ ...x, focus: 'news' })}>
                    <Tag tone={injuryTone(p.injury.status)}>{p.injury.status}{p.injury.bodyPart ? ` · ${p.injury.bodyPart}` : ''}</Tag>
                  </PlayerChip>
                ))}
              </div>
            </div>
          )}
          {[[byeNow, `On bye in week ${data.week}`], [byeNext, `On bye next week (${data.week + 1})`]].map(([list, label]) => list.length > 0 && (
            <div key={label}>
              <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-[#6B5A00]"><CalendarOff className="h-3.5 w-3.5" />{label} ({list.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {list.map(p => <PlayerChip key={p.id || p.name} p={p} onOpen={onOpenPlayer} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
