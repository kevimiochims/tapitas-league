'use client'

import { useEffect, useState } from 'react'
import { ArrowLeftRight, Plus, Minus } from 'lucide-react'
import { CardShell, Segmented, Pager, usePager, Tag, TeamLogo, PositionBadge } from './ui'
import { PlayerThumb } from './nfl/shared'

// Busca o histórico de transações da liga (uma vez por página)
let transactionsPromise = null
export function useTransactions() {
  const [state, setState] = useState({ data: null, loading: true, error: false })
  useEffect(() => {
    let cancelled = false
    if (!transactionsPromise) {
      transactionsPromise = fetch('/api/league/transactions')
        .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
        .catch(err => { transactionsPromise = null; throw err })
    }
    transactionsPromise
      .then(data => { if (!cancelled) setState({ data, loading: false, error: false }) })
      .catch(() => { if (!cancelled) setState({ data: null, loading: false, error: true }) })
    return () => { cancelled = true }
  }, [])
  return state
}

export function formatTxDate(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
}

const txMeta = t => `${t.season}${t.week ? ` · Week ${t.week}` : ' · Preseason'}${t.date ? ` · ${formatTxDate(t.date)}` : ''}`

function PlayerLine({ p, onOpenPlayer, tone, compact = false }) {
  return (
    <button type="button" onClick={() => onOpenPlayer?.(p)} className="group flex w-full min-w-0 items-center gap-2 py-1 text-left">
      <PlayerThumb id={p.id} name={p.name} pos={p.pos} nflTeam={p.nflTeam} size={28} />
      <span className={`min-w-0 truncate text-[13px] font-medium group-hover:text-[#D01F2D] ${tone === 'out' ? 'text-[#6B7280] line-through decoration-[#D01F2D]/40' : 'text-[#111]'}`}>{p.name}</span>
      <PositionBadge position={p.pos} />
      {p.nflTeam && !compact && <span className="flex-shrink-0 text-[11px] text-[#9CA3AF]">{p.nflTeam}</span>}
    </button>
  )
}

// Card de uma trade: cada franquia com o que recebeu, lado a lado
export function TradeCard({ t, onOpenPlayer, compact = false }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E6E8EB] bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-[#EEF0F2] bg-[#F7F8FA] px-3 py-2">
        <span className="inline-flex flex-shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#02275F]"><ArrowLeftRight className="h-3.5 w-3.5" /> Trade</span>
        <span className="truncate text-[11px] text-[#6B7280]">{txMeta(t)}</span>
      </div>
      <div className={`grid gap-px bg-[#EEF0F2] ${compact ? '' : t.moves.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {t.moves.map((m, i) => (
          <div key={m.team} className="bg-white px-3 py-2.5">
            <div className="mb-1.5 flex items-center gap-2">
              <TeamLogo name={m.team} size={24} />
              <span className="min-w-0 truncate text-[13px] font-bold text-[#111]">{m.team}</span>
              {compact
                ? <span className={`ml-auto h-2 w-2 flex-shrink-0 rounded-full ${i === 0 ? 'bg-[#02275F]' : 'bg-[#C8102E]'}`} />
                : <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${i === 0 ? 'bg-[#02275F]' : 'bg-[#C8102E]'}`}>receives</span>}
            </div>
            {m.adds.map(p => <PlayerLine key={p.id} p={p} onOpenPlayer={onOpenPlayer} compact={compact} />)}
            {m.picksIn.map((pk, j) => (
              <div key={`pk-${j}`} className="flex items-center gap-2 py-1 text-[13px] text-[#111]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF2B8] text-[10px] font-bold text-[#6B5A00]">R{pk.round}</span>
                {pk.season} round {pk.round} pick{pk.from !== m.team ? <span className="text-[11px] text-[#9CA3AF]">(via {pk.from})</span> : null}
              </div>
            ))}
            {m.faabIn > 0 && <div className="py-1 text-[12px] font-semibold text-[#1E8E3E]">+ ${m.faabIn} FAAB</div>}
            {!m.adds.length && !m.picksIn.length && !m.faabIn && <div className="py-1 text-[12px] text-[#9CA3AF]">Nothing received</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// Linha de waiver / free agent: quem entrou (+) e quem saiu (−)
export function MoveRow({ t, onOpenPlayer, showTeam = true }) {
  const m = t.moves[0]
  if (!m) return null
  return (
    <div className="flex items-start gap-3 border-b border-[#F1F2F4] px-3 py-2.5 last:border-b-0 lg:px-4">
      {showTeam && <span className="mt-0.5 flex-shrink-0"><TeamLogo name={m.team} size={28} /></span>}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {showTeam && <span className="text-[13px] font-semibold text-[#111]">{m.team}</span>}
          {t.type === 'waiver' ? <Tag tone="navy">Waiver{t.bid ? ` · $${t.bid}` : ''}</Tag> : <Tag>Free agent</Tag>}
          <span className="text-[11px] text-[#9CA3AF]">{txMeta(t)}</span>
        </div>
        <div className={`mt-1 grid gap-x-4 ${showTeam ? 'sm:grid-cols-2' : ''}`}>
          {m.adds.map(p => (
            <div key={`a-${p.id}`} className="flex min-w-0 items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 flex-shrink-0 text-[#1E8E3E]" strokeWidth={3} />
              <PlayerLine p={p} onOpenPlayer={onOpenPlayer} compact={!showTeam} />
            </div>
          ))}
          {m.drops.map(p => (
            <div key={`d-${p.id}`} className="flex min-w-0 items-center gap-1.5">
              <Minus className="h-3.5 w-3.5 flex-shrink-0 text-[#D01F2D]" strokeWidth={3} />
              <PlayerLine p={p} onOpenPlayer={onOpenPlayer} tone="out" compact={!showTeam} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Card da página Teams: trades e adds/drops de uma franquia, com paginação
export function TeamTransactionsCard({ team, onOpenPlayer }) {
  const { data, loading } = useTransactions()
  const [tab, setTab] = useState('trade')
  const mine = (data?.transactions || []).filter(t => t.teams.includes(team))
  const trades = mine.filter(t => t.type === 'trade')
  const moves = mine.filter(t => t.type !== 'trade')
  const list = tab === 'trade' ? trades : moves
  const { visible, totalPages, pagerProps, listProps } = usePager(list, tab === 'trade' ? 2 : 5, `${team}|${tab}`)
  if (!loading && !mine.length) return null
  return (
    <CardShell title="Transactions" subtitle={loading ? 'Loading…' : `From Sleeper · ${mine.length} moves`} sidebar action={<a href="/trades" className="flex-shrink-0 text-[12px] font-medium text-[#D01F2D] hover:underline">All</a>}>
      <div className="px-3 pt-2.5 lg:px-4">
        <Segmented options={[['trade', `Trades ${trades.length}`], ['moves', `Moves ${moves.length}`]]} value={tab} onChange={setTab} />
      </div>
      {list.length === 0 ? (
        <div className="px-3 py-6 text-center text-[13px] text-[#6B7280] lg:px-4">{tab === 'trade' ? 'No trades yet.' : 'No adds or drops yet.'}</div>
      ) : tab === 'trade' ? (
        <div {...listProps} className="space-y-2 p-3 lg:px-4">{visible.map(t => <TradeCard key={t.id} t={t} onOpenPlayer={onOpenPlayer} compact />)}</div>
      ) : (
        <div {...listProps} className="pt-1">{visible.map(t => <MoveRow key={t.id} t={t} onOpenPlayer={onOpenPlayer} showTeam={false} />)}</div>
      )}
      {totalPages > 1 && <Pager {...pagerProps} />}
    </CardShell>
  )
}
