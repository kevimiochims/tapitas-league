'use client'

import { useState } from 'react'
import { CardShell, Segmented, ToggleChip, Tag, TeamLogo, PositionBadge, ShowMore, SkeletonRows } from '../ui'
import { useLeagueStatus } from './useNflData'
import { PlayerThumb, EmptyNote, injuryRank, injuryTone } from './shared'
import { ByeWeekContent } from './ByeWeek'

function InjuryList({ data, onOpenPlayer }) {
  const [filter, setFilter] = useState('starters')
  const [limit, setLimit] = useState(8)
  const all = (data?.teams || []).flatMap(t => t.players.filter(p => p.injury).map(p => ({ ...p, fantasyTeam: t.team })))
  const list = all
    .filter(p => filter === 'all' || p.starter)
    .sort((a, b) => injuryRank(a.injury.status) - injuryRank(b.injury.status) || Number(b.starter) - Number(a.starter) || a.name.localeCompare(b.name))

  return (
    <>
      <div className="flex items-center gap-1.5 px-3 pb-1 pt-2.5 lg:px-4">
        <ToggleChip active={filter === 'starters'} onClick={() => { setFilter('starters'); setLimit(8) }}>Starters</ToggleChip>
        <ToggleChip active={filter === 'all'} onClick={() => { setFilter('all'); setLimit(8) }}>All ({all.length})</ToggleChip>
      </div>
      {list.length === 0 ? (
        <EmptyNote>{filter === 'starters' ? 'No injured starters. Clean bill of health!' : 'No Tapitas players on the injury report.'}</EmptyNote>
      ) : (
        <div className="pb-1">
          {list.slice(0, limit).map(p => (
            <button
              key={`${p.id || p.name}-${p.fantasyTeam}`}
              type="button"
              onClick={() => onOpenPlayer?.(p, p.fantasyTeam)}
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
                <Tag tone={injuryTone(p.injury.status)}>{p.injury.status}</Tag>
                <TeamLogo name={p.fantasyTeam} size={18} />
              </div>
            </button>
          ))}
          <ShowMore remaining={list.length - limit} onClick={() => setLimit(l => l + 10)} noun="players" />
        </div>
      )}
    </>
  )
}

// Lesões e folgas dos elencos da liga no mesmo card (Sleeper)
export default function RosterAlertsCard({ onOpenPlayer }) {
  const { data, loading, error } = useLeagueStatus()
  const [tab, setTab] = useState('injuries')
  if (error && !data) return null

  const injured = (data?.teams || []).reduce((n, t) => n + t.players.filter(p => p.injury && p.starter).length, 0)
  const byes = (data?.teams || []).reduce((n, t) => n + t.players.filter(p => p.byeThisWeek).length, 0)
  const subtitle = data?.week
    ? `NFL week ${data.week} · ${injured} injured starter${injured === 1 ? '' : 's'}${byes ? ` · ${byes} on bye` : ''}`
    : `${injured} injured starter${injured === 1 ? '' : 's'}`

  return (
    <CardShell title="Injuries & byes" subtitle={loading ? 'Loading…' : subtitle} sidebar>
      <div className="px-3 pt-2.5 lg:px-4">
        <Segmented options={[['injuries', 'Injury report'], ['byes', 'Bye weeks']]} value={tab} onChange={setTab} />
      </div>
      {loading ? <div className="py-2"><SkeletonRows rows={4} /></div>
        : tab === 'injuries' ? <InjuryList data={data} onOpenPlayer={onOpenPlayer} />
          : <ByeWeekContent data={data} />}
    </CardShell>
  )
}
