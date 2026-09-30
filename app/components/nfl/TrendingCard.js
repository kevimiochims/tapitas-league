'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { CardShell, Segmented, Tag, TeamLogo, PositionBadge, SkeletonRows } from '../ui'
import { useTrending } from './useNflData'
import { PlayerThumb, EmptyNote, injuryTone } from './shared'

function compact(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

// Mais adicionados / cortados em todas as ligas do Sleeper (24h)
export default function TrendingCard({ onOpenPlayer }) {
  const { data, loading, error } = useTrending()
  const [mode, setMode] = useState('adds')
  if (error && !data) return null
  const list = (data?.[mode] || []).slice(0, 10)
  const up = mode === 'adds'

  return (
    <CardShell
      title="Trending on Sleeper"
      subtitle="Most added and dropped across all Sleeper leagues · last 24h"
      action={<Segmented options={[['adds', 'Adds'], ['drops', 'Drops']]} value={mode} onChange={setMode} />}
    >
      {loading ? <div className="py-2"><SkeletonRows rows={5} /></div> : list.length === 0 ? <EmptyNote>No trending players right now.</EmptyNote> : (
        <div className="py-1">
          {list.map((p, i) => (
            <button key={p.id} type="button" onClick={() => onOpenPlayer?.(p, p.leagueTeams[0])} className="group flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-black/[0.03] lg:gap-3 lg:px-4">
              <span className="w-4 flex-shrink-0 text-right text-[12px] font-semibold tabular-nums text-[#9CA3AF]">{i + 1}</span>
              <PlayerThumb id={p.id} name={p.name} pos={p.pos} nflTeam={p.nflTeam} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">{p.name}</span>
                  <PositionBadge position={p.pos} />
                  {p.injury && <Tag tone={injuryTone(p.injury)}>{p.injury}</Tag>}
                </div>
                <div className="flex items-center gap-1 truncate text-[11px] text-[#6B7280]">
                  {p.nflTeam || 'FA'}
                  <span className="text-[#D1D5DB]">·</span>
                  {p.leagueTeams.length
                    ? <span className="flex items-center gap-1">On {p.leagueTeams.map(t => <TeamLogo key={t} name={t} size={14} />)}</span>
                    : <span className="font-medium text-[#1E8E3E]">Not on a Tapitas lineup</span>}
                </div>
              </div>
              <span className={`flex flex-shrink-0 items-center gap-1 text-[13px] font-semibold tabular-nums ${up ? 'text-[#1E8E3E]' : 'text-[#D01F2D]'}`}>
                {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {compact(p.count)}
              </span>
            </button>
          ))}
        </div>
      )}
    </CardShell>
  )
}
