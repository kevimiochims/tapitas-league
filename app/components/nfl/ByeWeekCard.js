'use client'

import { CardShell, TeamLogo, PositionBadge, SkeletonRows } from '../ui'
import { useLeagueStatus } from './useNflData'
import { nflLogo, EmptyNote } from './shared'

function ByeTeams({ teams }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {teams.map(t => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#F4F5F7] py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-[#3F4757]">
          <img src={nflLogo(t)} alt="" className="h-4 w-4 object-contain" />{t}
        </span>
      ))}
    </div>
  )
}

function FranchiseByes({ teams, flag }) {
  const rows = teams
    .map(t => ({ team: t.team, players: t.players.filter(p => p[flag]).sort((a, b) => Number(b.starter) - Number(a.starter)) }))
    .filter(r => r.players.length)
    .sort((a, b) => b.players.filter(p => p.starter).length - a.players.filter(p => p.starter).length)
  if (!rows.length) return <div className="px-3 pb-3 text-[12px] text-[#6B7280] lg:px-4">No Tapitas players affected.</div>
  return (
    <div className="pb-1">
      {rows.map(r => (
        <div key={r.team} className="flex items-start gap-2 px-3 py-2 lg:gap-3 lg:px-4">
          <TeamLogo name={r.team} size={24} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-[#111]">{r.team}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {r.players.map(p => (
                <span key={p.id || p.name} className="inline-flex items-center gap-1 text-[12px]">
                  <PositionBadge position={p.pos} />
                  <span className={p.starter ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}>{p.name}</span>
                  <span className="text-[#9CA3AF]">{p.nflTeam}</span>
                </span>
              ))}
            </div>
          </div>
          {(() => {
            const starters = r.players.filter(p => p.starter).length
            return <span className="flex-shrink-0 text-[11px] text-[#6B7280]">{starters ? `${starters} starter${starters > 1 ? 's' : ''}` : 'Bench only'}</span>
          })()}
        </div>
      ))}
    </div>
  )
}

// Quem está de folga (bye) nesta semana e na próxima
export default function ByeWeekCard() {
  const { data, loading, error } = useLeagueStatus()
  if (error && !data) return null
  if (!loading && !data?.week) return null // fora da temporada regular

  const teams = data?.teams || []
  const now = data?.byeTeams || []
  const next = data?.nextWeekByeTeams || []

  return (
    <CardShell title="Bye week watch" subtitle={data?.week ? `Week ${data.week} · NFL teams off this week and next` : 'NFL teams off this week'}>
      {loading ? <div className="py-2"><SkeletonRows rows={3} /></div> : (
        <>
          <div className="px-3 pb-2 pt-3 lg:px-4">
            <div className="mb-1.5 text-[11px] font-medium text-[#6B7280]">Week {data.week}</div>
            {now.length ? <ByeTeams teams={now} /> : <div className="text-[12px] text-[#6B7280]">No byes this week — every NFL team plays.</div>}
          </div>
          {now.length > 0 && <FranchiseByes teams={teams} flag="byeThisWeek" />}
          <div className="border-t border-[#F1F2F4] px-3 pb-2 pt-3 lg:px-4">
            <div className="mb-1.5 text-[11px] font-medium text-[#6B7280]">Next: week {data.week + 1}</div>
            {next.length ? <ByeTeams teams={next} /> : <div className="text-[12px] text-[#6B7280]">No byes next week.</div>}
          </div>
          {next.length > 0 && <FranchiseByes teams={teams} flag="byeNextWeek" />}
          {!now.length && !next.length && <EmptyNote>Plan ahead: byes usually start around week 5.</EmptyNote>}
        </>
      )}
    </CardShell>
  )
}
