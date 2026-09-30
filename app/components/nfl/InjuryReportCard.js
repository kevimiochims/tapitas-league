'use client'

import { useState } from 'react'
import { CardShell, Segmented, Tag, TeamLogo, PositionBadge, ShowMore, SkeletonRows } from '../ui'
import { useLeagueStatus } from './useNflData'
import { PlayerThumb, EmptyNote, injuryRank, injuryTone } from './shared'

// Relatório de lesões dos jogadores nos elencos da liga (Sleeper)
export default function InjuryReportCard({ onOpenPlayer }) {
  const { data, loading, error } = useLeagueStatus()
  const [filter, setFilter] = useState('starters')
  const [limit, setLimit] = useState(8)

  const all = (data?.teams || []).flatMap(t => t.players.filter(p => p.injury).map(p => ({ ...p, fantasyTeam: t.team })))
  const list = all
    .filter(p => filter === 'all' || p.starter)
    .sort((a, b) => injuryRank(a.injury.status) - injuryRank(b.injury.status) || Number(b.starter) - Number(a.starter) || a.name.localeCompare(b.name))

  if (error && !data) return null
  const lineupWeek = data?.teams?.[0]?.lineupWeek

  return (
    <CardShell
      title="Injury report"
      subtitle={`${all.length} Tapitas players on the report${lineupWeek ? ` · rosters from week ${lineupWeek}` : ''}`}
      action={<Segmented options={[['starters', 'Starters'], ['all', 'All']]} value={filter} onChange={v => { setFilter(v); setLimit(8) }} />}
    >
      {loading ? <div className="py-2"><SkeletonRows rows={4} /></div> : list.length === 0 ? (
        <EmptyNote>{filter === 'starters' ? 'No injured starters. Clean bill of health!' : 'No Tapitas players on the injury report.'}</EmptyNote>
      ) : (
        <div className="py-1">
          {list.slice(0, limit).map(p => (
            <button
              key={`${p.id || p.name}-${p.fantasyTeam}`}
              type="button"
              onClick={() => onOpenPlayer?.(p, p.fantasyTeam)}
              className="group flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-black/[0.03] lg:gap-3 lg:px-4"
            >
              <PlayerThumb id={p.id} name={p.name} pos={p.pos} nflTeam={p.nflTeam} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">{p.name}</span>
                  <PositionBadge position={p.pos} />
                </div>
                <div className="truncate text-[11px] text-[#6B7280]">
                  {[p.nflTeam, p.injury.bodyPart, p.starter ? 'Starter' : 'Bench'].filter(Boolean).join(' · ')}
                </div>
              </div>
              <Tag tone={injuryTone(p.injury.status)}>{p.injury.status}</Tag>
              <TeamLogo name={p.fantasyTeam} size={22} />
            </button>
          ))}
          <ShowMore remaining={list.length - limit} onClick={() => setLimit(l => l + 10)} noun="players" />
        </div>
      )}
    </CardShell>
  )
}
