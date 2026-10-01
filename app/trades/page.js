'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, UserPlus, Zap, Info } from 'lucide-react'
import { HighlightCards, HighlightIcon, PageShell, PageBar, BarTab, CardShell, FilterBar, FilterPill, TeamLogo, PositionBadge, Pager, usePager } from '../components/ui'
import PlayerProfileModal from '../components/PlayerProfileModal'
import { useTransactions, TradeCard, MoveRow } from '../components/Transactions'
import { PlayerThumb } from '../components/nfl/shared'
import { buildFactsNameIndex, resolveFactsName } from '../lib/factsNames'
import { useFocusFilter } from '../context/TeamFocus'

const TABS = [
  ['trade', 'Trades'],
  ['waiver', 'Waivers'],
  ['free_agent', 'Free agents'],
  ['all', 'All moves'],
]

// Histórico de transações da liga (Sleeper): trades, waivers e free agents
export default function TradesPage() {
  const { data, loading, error } = useTransactions()
  const [tab, setTab] = useState('trade')
  const [season, setSeason] = useState('All')
  const [team, setTeam] = useFocusFilter('All')
  const [games, setGames] = useState([])
  const [profile, setProfile] = useState(null)

  // Jogos da planilha, para a carreira no Player Profile
  useEffect(() => {
    fetch('/api/sheet/GAME_FACTS_ALL').then(r => r.json()).then(d => setGames(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])
  const factsIndex = useMemo(() => buildFactsNameIndex(games), [games])

  const all = useMemo(() => data?.transactions || [], [data])
  const seasons = data?.seasons?.filter(s => all.some(t => t.season === s)) || []
  const teams = useMemo(() => [...new Set(all.flatMap(t => t.teams))].sort((a, b) => a.localeCompare(b)), [all])

  const scoped = all.filter(t => (season === 'All' || t.season === season) && (team === 'All' || t.teams.includes(team)))
  const count = type => scoped.filter(t => type === 'all' || t.type === type).length
  const list = scoped.filter(t => tab === 'all' || t.type === tab)
  const { visible, totalPages, pagerProps, listProps } = usePager(list, tab === 'trade' ? 6 : 12, `${tab}|${season}|${team}`)

  // Números do topo (respeitam os filtros de temporada e time)
  const activity = {}
  scoped.forEach(t => t.teams.forEach(tm => { activity[tm] = (activity[tm] || 0) + 1 }))
  const mostActive = Object.entries(activity).sort((a, b) => b[1] - a[1])[0]
  // Jogador mais adicionado (waivers + free agents)
  const addCount = {}
  scoped.filter(t => t.type !== 'trade').forEach(t => t.moves.forEach(m => m.adds.forEach(p => {
    if (!addCount[p.id]) addCount[p.id] = { p, n: 0 }
    addCount[p.id].n++
  })))
  const mostAdded = Object.values(addCount).sort((a, b) => b.n - a.n)[0]
  const firstSeason = all.length ? Math.min(...all.map(t => Number(t.season))) : null

  const openPlayer = p => p && setProfile(p)

  // Coluna lateral: movimento por time, mais adicionados e parceiros de trade
  // (respeitam a temporada, não o filtro de time)
  const seasonScoped = all.filter(t => season === 'All' || t.season === season)
  const byTeam = teams.map(tm => {
    const mine = seasonScoped.filter(t => t.teams.includes(tm))
    return { team: tm, trade: mine.filter(t => t.type === 'trade').length, waiver: mine.filter(t => t.type === 'waiver').length, fa: mine.filter(t => t.type === 'free_agent').length, total: mine.length }
  }).sort((a, b) => b.total - a.total)
  const maxTotal = Math.max(1, ...byTeam.map(r => r.total))
  const topAdded = Object.values(seasonScoped.filter(t => t.type !== 'trade').reduce((acc, t) => {
    t.moves.forEach(m => m.adds.forEach(p => { acc[p.id] = acc[p.id] || { p, n: 0, teams: new Set() }; acc[p.id].n++; acc[p.id].teams.add(m.team) }))
    return acc
  }, {})).sort((a, b) => b.n - a.n).slice(0, 5)
  const partners = Object.values(seasonScoped.filter(t => t.type === 'trade').reduce((acc, t) => {
    const key = [...t.teams].sort().join('|')
    acc[key] = acc[key] || { teams: [...t.teams].sort(), n: 0 }
    acc[key].n++
    return acc
  }, {})).sort((a, b) => b.n - a.n).slice(0, 5)

  return (
    <PageShell loading={loading}>
      <PageBar title="Transactions">
        {TABS.map(([key, label]) => (
          <BarTab key={key} active={tab === key} onClick={() => setTab(key)}>
            {label}
            {data && <span className="text-[11px] font-normal text-[#9CA3AF]">{count(key)}</span>}
          </BarTab>
        ))}
      </PageBar>

      {error && <div className="rounded-xl bg-white py-16 text-center text-[13px] text-[#6B7280]">Could not load transactions from Sleeper right now.</div>}

      {data && (
        <>
          {/* Números do topo: quatro cards no padrão da Draft */}
          <HighlightCards items={[
            { label: 'Most active GM', left: mostActive ? <TeamLogo name={mostActive[0]} size={32} /> : null, title: mostActive?.[0] || '—', subtitle: season === 'All' ? 'All seasons on Sleeper' : `${season} season`, value: mostActive ? `${mostActive[1]} moves` : '—' },
            { label: 'Trades', left: <HighlightIcon icon={ArrowLeftRight} />, title: season === 'All' ? 'All seasons' : `${season} season`, subtitle: team === 'All' ? 'Whole league' : team, value: count('trade') },
            { label: 'Waivers & free agents', left: <HighlightIcon icon={UserPlus} tone="green" />, title: `${count('waiver')} waivers`, subtitle: `${count('free_agent')} free agents`, value: count('waiver') + count('free_agent'), valueClass: 'text-[#1E8E3E]' },
            { label: 'Most added player', left: <HighlightIcon icon={Zap} tone="gold" />, title: mostAdded?.p.name || '—', subtitle: mostAdded ? `${mostAdded.p.pos} · ${mostAdded.p.nflTeam}` : '', value: mostAdded ? `${mostAdded.n}× added` : '—', valueClass: 'text-[#B8860B]' },
          ]} />

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-5">
          <div className="min-w-0">
          <CardShell
            title={TABS.find(([k]) => k === tab)[1]}
            subtitle={`${list.length} ${list.length === 1 ? 'move' : 'moves'} · newest first`}
            withMenus
          >
            <FilterBar>
              <FilterPill value={season} onChange={setSeason} options={['All', ...seasons]} label="Season" allLabel="All seasons" />
              <FilterPill value={team} onChange={setTeam} options={['All', ...teams]} label="Team" allLabel="All teams" />
            </FilterBar>

            {list.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-[#6B7280]">No {tab === 'trade' ? 'trades' : 'moves'} for these filters.</div>
            ) : tab === 'trade' ? (
              <div {...listProps} className="grid content-start gap-2 p-3 lg:p-4 2xl:grid-cols-2">
                {visible.map(t => <TradeCard key={t.id} t={t} onOpenPlayer={openPlayer} />)}
              </div>
            ) : (
              <div {...listProps}>
                {visible.map(t => t.type === 'trade'
                  ? <div key={t.id} className="border-b border-[#F1F2F4] p-3 lg:px-4"><TradeCard t={t} onOpenPlayer={openPlayer} /></div>
                  : <MoveRow key={t.id} t={t} onOpenPlayer={openPlayer} />)}
              </div>
            )}
            {totalPages > 1 && <Pager {...pagerProps} />}
          </CardShell>
          </div>

          <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC]">
            <CardShell title="Activity by team" subtitle={`${season === 'All' ? 'All seasons' : season} · tap a team to filter`} sidebar>
              <div className="py-1.5">
                {byTeam.map(r => (
                  <button key={r.team} type="button" onClick={() => setTeam(team === r.team ? 'All' : r.team)} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors lg:px-4 ${team === r.team ? 'bg-white shadow-[inset_3px_0_0_#02275F]' : 'hover:bg-black/[0.03]'}`}>
                    <TeamLogo name={r.team} size={20} />
                    <span className="w-[92px] flex-shrink-0 truncate text-[12px] font-medium text-[#111]">{r.team}</span>
                    <span className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-[#EEF0F2]">
                      <span className="bg-[#B8860B]" style={{ width: `${(r.trade / maxTotal) * 100}%` }} />
                      <span className="bg-[#02275F]" style={{ width: `${(r.waiver / maxTotal) * 100}%` }} />
                      <span className="bg-[#8DA3D1]" style={{ width: `${(r.fa / maxTotal) * 100}%` }} />
                    </span>
                    <span className="w-7 flex-shrink-0 text-right text-[12px] font-semibold tabular-nums text-[#111]">{r.total}</span>
                  </button>
                ))}
                <div className="flex gap-3 px-3 pt-2 text-[11px] text-[#6B7280] lg:px-4">
                  {[['#B8860B', 'Trades'], ['#02275F', 'Waivers'], ['#8DA3D1', 'Free agents']].map(([c, l]) => <span key={l} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: c }} />{l}</span>)}
                </div>
              </div>
            </CardShell>

            {topAdded.length > 0 && (
              <CardShell title="Most added players" subtitle="Waiver and free-agent pickups" sidebar>
                <div className="py-1">
                  {topAdded.map(({ p, n, teams: tms }, i) => (
                    <button key={p.id} type="button" onClick={() => openPlayer(p)} className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-black/[0.03] lg:px-4">
                      <span className="w-4 flex-shrink-0 text-[12px] font-semibold tabular-nums text-[#9CA3AF]">{i + 1}</span>
                      <PlayerThumb id={p.id} name={p.name} pos={p.pos} nflTeam={p.nflTeam} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">{p.name}</span><PositionBadge position={p.pos} /></span>
                        <span className="mt-0.5 flex -space-x-1">{[...tms].map(tm => <span key={tm} className="rounded-full ring-2 ring-white"><TeamLogo name={tm} size={14} /></span>)}</span>
                      </span>
                      <span className="flex-shrink-0 text-right"><span className="block text-[16px] font-bold leading-none tabular-nums text-[#111]">{n}</span><span className="text-[10px] text-[#6B7280]">adds</span></span>
                    </button>
                  ))}
                </div>
              </CardShell>
            )}

            {partners.length > 0 && (
              <CardShell title="Trading partners" subtitle="Franchises that dealt with each other" sidebar>
                <div className="py-1">
                  {partners.map(pr => (
                    <div key={pr.teams.join('|')} className="flex items-center gap-2 px-3 py-2 lg:px-4">
                      <span className="flex -space-x-1.5">{pr.teams.map(tm => <span key={tm} className="rounded-full ring-2 ring-white"><TeamLogo name={tm} size={22} /></span>)}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#111]">{pr.teams.join(' ⇄ ')}</span>
                      <span className="flex-shrink-0 text-[12px] font-semibold tabular-nums text-[#02275F]">{pr.n} trade{pr.n === 1 ? '' : 's'}</span>
                    </div>
                  ))}
                </div>
              </CardShell>
            )}
          </aside>
          </div>

          <div className="flex items-start gap-2 px-1 text-[12px] text-[#6B7280]">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>Transactions come from Sleeper, which has the league&apos;s moves recorded from {firstSeason || 'the current season'} on. Earlier seasons have no transaction history available.</span>
          </div>
        </>
      )}

      {profile && (
        <PlayerProfileModal
          key={`tx-${profile.id}`}
          rawName={resolveFactsName(factsIndex, profile)}
          displayName={profile.name}
          position={profile.pos}
          playerId={profile.id}
          games={games}
          onClose={() => setProfile(null)}
        />
      )}
    </PageShell>
  )
}
