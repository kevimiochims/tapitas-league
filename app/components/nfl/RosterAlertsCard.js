'use client'

import { useState } from 'react'
import { CardShell, FilterPill, ToggleChip, Tag, TeamLogo, PositionBadge, Pager, usePager, SkeletonRows } from '../ui'
import { useLeagueStatus } from './useNflData'
import { PlayerThumb, EmptyNote, injuryRank, injuryTone, injuryLabel } from './shared'

// Lesões dos elencos da liga (Sleeper), com filtro por franquia
export default function RosterAlertsCard({ onOpenPlayer }) {
  const { data, loading, error } = useLeagueStatus()
  const [filter, setFilter] = useState('starters')
  const [team, setTeam] = useState('All')

  const teams = (data?.teams || []).map(t => t.team).sort((a, b) => a.localeCompare(b))
  const all = (data?.teams || [])
    .filter(t => team === 'All' || t.team === team)
    .flatMap(t => t.players.filter(p => p.injury).map(p => ({ ...p, fantasyTeam: t.team })))
  const list = all
    .filter(p => filter === 'all' || p.starter)
    .sort((a, b) => injuryRank(a.injury.status) - injuryRank(b.injury.status) || Number(b.starter) - Number(a.starter) || a.name.localeCompare(b.name))
  const { visible, totalPages, pagerProps } = usePager(list, 8, `${filter}|${team}`)

  if (error && !data) return null

  const injured = all.filter(p => p.starter).length
  const subtitle = `${data?.week ? `NFL week ${data.week} · ` : ''}${injured} injured starter${injured === 1 ? '' : 's'}`

  return (
    <CardShell
      title="Injury report"
      subtitle={loading ? 'Loading…' : subtitle}
      sidebar
      withMenus
    >
      {loading ? <div className="py-2"><SkeletonRows rows={4} /></div> : (
        <>
          <div className="flex items-center gap-1.5 px-3 pb-1 pt-2.5 lg:px-4">
            <ToggleChip active={filter === 'starters'} onClick={() => setFilter('starters')}>Starters</ToggleChip>
            <ToggleChip active={filter === 'all'} onClick={() => setFilter('all')}>All ({all.length})</ToggleChip>
            {teams.length > 0 && <div className="ml-auto min-w-0"><FilterPill value={team} onChange={setTeam} options={['All', ...teams]} label="Team" allLabel="All teams" align="right" /></div>}
          </div>
          {list.length === 0 ? (
            <EmptyNote>{filter === 'starters' ? 'No injured starters. Clean bill of health!' : 'No Tapitas players on the injury report.'}</EmptyNote>
          ) : (
            <div className="pb-1">
              {visible.map(p => (
                <button
                  key={`${p.id || p.name}-${p.fantasyTeam}`}
                  type="button"
                  onClick={() => onOpenPlayer?.({ ...p, focus: 'news' }, p.fantasyTeam)}
                  className="group flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-black/[0.03] lg:px-4"
                >
                  <PlayerThumb id={p.id} name={p.name} pos={p.pos} nflTeam={p.nflTeam} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">{p.name}</span>
                      <PositionBadge position={p.pos} />
                    </div>
                    <div className="truncate text-[11px] text-[#6B7280]">
                      {[p.nflTeam, p.injury.bodyPart, p.reserve ? 'IR slot' : p.starter ? 'Starter' : 'Bench'].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <Tag tone={injuryTone(p.injury.status)}>{injuryLabel(p.injury.status)}</Tag>
                    <TeamLogo name={p.fantasyTeam} size={18} />
                  </div>
                </button>
              ))}
              {totalPages > 1 && <Pager {...pagerProps} />}
            </div>
          )}
        </>
      )}
    </CardShell>
  )
}
