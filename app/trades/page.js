'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, UserPlus, Zap, Info } from 'lucide-react'
import { BrandBackdrop, PageShell, PageBar, BarTab, CardShell, FilterBar, FilterPill, TeamLogo, Pager, usePager } from '../components/ui'
import PlayerProfileModal from '../components/PlayerProfileModal'
import { useTransactions, TradeCard, MoveRow } from '../components/Transactions'
import { buildFactsNameIndex, resolveFactsName } from '../lib/factsNames'

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
  const [team, setTeam] = useState('All')
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
          {/* Faixa de números no azul da marca */}
          <div className="relative mb-2 overflow-hidden rounded-xl text-white">
            <BrandBackdrop />
            <div className="relative grid grid-cols-2 lg:grid-cols-4">
              {[
                { icon: ArrowLeftRight, label: 'Trades', value: count('trade'), sub: season === 'All' ? 'All seasons on Sleeper' : `${season} season` },
                { icon: UserPlus, label: 'Waivers & free agents', value: count('waiver') + count('free_agent'), sub: `${count('waiver')} waivers · ${count('free_agent')} free agents` },
                { icon: Zap, label: 'Most active GM', value: mostActive ? <span className="flex items-center gap-2"><span className="rounded-full bg-white p-0.5"><TeamLogo name={mostActive[0]} size={26} /></span><span className="truncate text-[18px]">{mostActive[0]}</span></span> : '—', sub: mostActive ? `${mostActive[1]} moves` : '' },
                { icon: UserPlus, label: 'Most added player', value: mostAdded ? <span className="truncate text-[18px] text-[#E8C766]">{mostAdded.p.name}</span> : '—', sub: mostAdded ? `Picked up ${mostAdded.n} times · ${mostAdded.p.pos} ${mostAdded.p.nflTeam}` : '' },
              ].map((k, i) => (
                <div key={k.label} className={`min-w-0 px-4 py-4 sm:px-5 ${i % 2 === 1 ? 'border-l border-white/10' : ''} ${i >= 2 ? 'border-t border-white/10 lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
                  <div className="flex items-center gap-1.5 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65"><k.icon className="h-3.5 w-3.5" />{k.label}</div>
                  <div className={`mt-1.5 min-w-0 text-[28px] font-bold leading-none tabular-nums ${k.accent || 'text-white'}`}>{k.value}</div>
                  <div className="mt-1.5 truncate text-[12px] text-white/65">{k.sub}</div>
                </div>
              ))}
            </div>
          </div>

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
              <div {...listProps} className="grid content-start gap-2 p-3 lg:grid-cols-2 lg:p-4">
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
