'use client'

import { useState } from 'react'
import { CardShell, Segmented, Tag, PositionBadge, Pager, usePager, normalizeTeamKey } from '../ui'
import { useLeagueStatus } from './useNflData'
import { PlayerThumb, EmptyNote, injuryTone, injuryLabel } from './shared'

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
const posRank = pos => {
  const i = POSITION_ORDER.indexOf(String(pos || '').toUpperCase())
  return i < 0 ? POSITION_ORDER.length : i
}
// Ordem: posição (QB → DEF), titulares primeiro e depois nome
const byPosition = (a, b) => posRank(a.pos) - posRank(b.pos) || Number(b.starter) - Number(a.starter) || a.name.localeCompare(b.name)

// Status do elenco de uma franquia (coluna da esquerda da página Teams):
// lesionados e jogadores de folga (bye), 5 por página.
export default function TeamNflNotice({ team, onOpenPlayer }) {
  const { data } = useLeagueStatus()
  const [tab, setTab] = useState('injuries')
  const roster = (data?.teams || []).find(t => normalizeTeamKey(t.team) === normalizeTeamKey(team))

  const injured = (roster?.players || []).filter(p => p.injury).sort(byPosition)
  const byes = (roster?.players || [])
    .filter(p => p.byeThisWeek || p.byeNextWeek)
    .map(p => ({ ...p, byeLabel: p.byeThisWeek ? `Week ${data.week}` : `Week ${data.week + 1}` }))
    .sort((a, b) => Number(b.byeThisWeek) - Number(a.byeThisWeek) || byPosition(a, b))
  const list = tab === 'injuries' ? injured : byes
  const { visible, totalPages, pagerProps } = usePager(list, 5, `${team}|${tab}`)

  if (!roster) return null

  return (
    <CardShell
      title="Roster status"
      subtitle={`${data.week ? `NFL week ${data.week} · ` : ''}${roster.source === 'sleeper' ? 'live Sleeper roster' : `lineup from week ${roster.lineupWeek}`}`}
      sidebar
    >
      <div className="px-3 pt-2.5 lg:px-4">
        <Segmented options={[['injuries', `Injuries (${injured.length})`], ['byes', `Byes (${byes.length})`]]} value={tab} onChange={setTab} />
      </div>
      {list.length === 0 ? (
        <EmptyNote>{tab === 'injuries' ? 'No injuries. All clear!' : 'Nobody on bye this week or next.'}</EmptyNote>
      ) : (
        <div className="pb-1 pt-1">
          {visible.map(p => (
            <button
              key={p.id || p.name}
              type="button"
              onClick={() => onOpenPlayer?.(tab === 'injuries' ? { ...p, focus: 'news' } : p)}
              className="group flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-black/[0.03] lg:px-4"
            >
              <PlayerThumb id={p.id} name={p.name} pos={p.pos} nflTeam={p.nflTeam} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className={`truncate text-[13px] group-hover:text-[#D01F2D] ${p.starter ? 'font-semibold text-[#111]' : 'text-[#3F4757]'}`}>{p.name}</span>
                  <PositionBadge position={p.pos} />
                </div>
                <div className="truncate text-[11px] text-[#6B7280]">
                  {[p.nflTeam, tab === 'injuries' ? p.injury.bodyPart : null, p.starter ? 'Starter' : 'Bench'].filter(Boolean).join(' · ')}
                </div>
              </div>
              {tab === 'injuries'
                ? <Tag tone={injuryTone(p.injury.status)}>{injuryLabel(p.injury.status)}</Tag>
                : <Tag tone={p.byeThisWeek ? 'red' : 'gold'}>{p.byeLabel}</Tag>}
            </button>
          ))}
          {totalPages > 1 && <Pager {...pagerProps} />}
        </div>
      )}
    </CardShell>
  )
}
