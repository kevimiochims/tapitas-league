'use client'

import { useEffect, useState } from 'react'
import { ArrowLeftRight, Plus, Minus, ClipboardList } from 'lucide-react'
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
  const two = t.moves.length === 2
  const tint = i => (i === 0 ? { band: 'bg-[#EEF3FF]', dot: 'bg-[#02275F]', text: 'text-[#02275F]' } : i === 1 ? { band: 'bg-[#FDF2F3]', dot: 'bg-[#C8102E]', text: 'text-[#C8102E]' } : { band: 'bg-[#FFF8E6]', dot: 'bg-[#B8860B]', text: 'text-[#8D6A00]' })
  return (
    <div className="overflow-hidden rounded-xl border border-[#E6E8EB] bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-[#EEF0F2] px-3 py-2">
        <span className="inline-flex flex-shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#02275F]"><ArrowLeftRight className="h-3.5 w-3.5" /> Trade</span>
        <span className="truncate text-[11px] text-[#6B7280]">{txMeta(t)}</span>
      </div>
      <div className={`relative grid gap-px bg-[#EEF0F2] ${compact ? '' : t.moves.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {/* Ícone de troca entre os dois lados */}
        {two && !compact && (
          <span className="absolute left-1/2 top-[18px] z-10 hidden h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-white text-[#3F4757] shadow ring-1 ring-[#E6E8EB] sm:flex">
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </span>
        )}
        {t.moves.map((m, i) => {
          const c = tint(i)
          return (
            <div key={m.team} className="bg-white">
              <div className={`flex items-center gap-2 px-3 py-2 ${c.band} ${two && i === 1 && !compact ? 'sm:pl-6' : ''}`}>
                <span className="flex-shrink-0 rounded-full bg-white p-px"><TeamLogo name={m.team} size={24} /></span>
                <span className="min-w-0 truncate text-[13px] font-bold text-[#111]">{m.team}</span>
                {!compact && <span className={`ml-auto flex-shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] ${c.text} ${two && i === 0 ? 'sm:mr-3' : ''}`}>receives</span>}
                {compact && <span className={`ml-auto h-2 w-2 flex-shrink-0 rounded-full ${c.dot}`} />}
              </div>
              <div className="px-3 py-1.5">
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
            </div>
          )
        })}
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
    <CardShell title="Transactions" subtitle={loading ? 'Loading…' : `From Sleeper · ${mine.length} moves`} sidebar action={<a href="/transactions" className="flex-shrink-0 text-[12px] font-medium text-[#D01F2D] hover:underline">All</a>}>
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

// Aba do Player Profile: todas as movimentações do jogador na liga (Sleeper),
// da mais recente para a mais antiga.
// Draft da liga (planilha DRAFT_BOARD), buscado uma vez por página
let draftPromise = null
function useDraftBoard() {
  const [state, setState] = useState({ rows: [], loading: true })
  useEffect(() => {
    let cancelled = false
    if (!draftPromise) {
      draftPromise = fetch('/api/sheet/DRAFT_BOARD')
        .then(r => (r.ok ? r.json() : []))
        .then(d => (Array.isArray(d) ? d : []))
        .catch(() => { draftPromise = null; return [] })
    }
    draftPromise.then(rows => { if (!cancelled) setState({ rows, loading: false }) })
    return () => { cancelled = true }
  }, [])
  return state
}

// Nome normalizado ("Josh Allen Jr." → "josh allen") e abreviado ("j allen")
const normName = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[.'’]/g, '').replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const abbrName = n => { const parts = n.split(' '); return parts.length > 1 ? `${parts[0][0]} ${parts.slice(1).join(' ')}` : n }

// Linha do tempo do jogador na liga: escolhas no draft (planilha) e todas as
// transações do Sleeper (trades, waivers, free agents, dispensas).
export function PlayerTransactionsCard({ playerId, names = [] }) {
  const { data, loading: txLoading } = useTransactions()
  const { rows: draftRows, loading: draftLoading } = useDraftBoard()
  const loading = txLoading || draftLoading
  const id = String(playerId || '')
  const events = []
  ;(data?.transactions || []).forEach(t => {
    if (!id) return
    const into = t.moves.find(m => m.adds.some(p => p.id === id))
    const out = t.moves.find(m => m.drops.some(p => p.id === id))
    if (!into && !out) return
    if (t.type === 'trade') {
      events.push({ t, at: t.date || 0, kind: 'trade', team: into?.team, from: out?.team, text: `Traded to ${into?.team || '—'}`, sub: out ? `from ${out.team}` : '' })
      return
    }
    if (into) events.push({ t, at: t.date || 0, kind: 'add', team: into.team, text: t.type === 'waiver' ? `Claimed off waivers by ${into.team}` : `Signed as a free agent by ${into.team}`, sub: t.type === 'waiver' && t.bid ? `$${t.bid} bid` : '' })
    if (out) events.push({ t, at: (t.date || 0) - 1, kind: 'drop', team: out.team, text: `Released by ${out.team}`, sub: '' })
  })
  // Draft: casa pelo nome completo; só com o nome abreviado ("J. Allen"), pela abreviação
  const normed = names.map(normName).filter(Boolean)
  const fulls = new Set(normed.filter(n => n.split(' ')[0]?.length > 1))
  const abbrs = new Set(normed.map(abbrName))
  draftRows
    .filter(r => {
      const n = normName(r?.Player)
      if (!n) return false
      return fulls.size ? fulls.has(n) : abbrs.has(abbrName(n))
    })
    .sort((x, y) => Number(y?.Season) - Number(x?.Season))
    .forEach(r => {
      const team = String(r?.Team || '').trim()
      const round = String(r?.Round || '').trim()
      const pick = String(r?.Pick || '').trim()
      // Data do draft: a do Sleeper quando existir; antes do Sleeper, início de
      // setembro da temporada (época do draft da liga)
      const season = String(r?.Season || '').trim()
      const at = data?.draftDates?.[season] || Date.UTC(Number(season) || 0, 8, 1)
      events.push({
        t: { id: `draft-${r?.Season}-${pick}` },
        at,
        kind: 'draft',
        team,
        text: `Drafted by ${team}`,
        sub: [round && `Round ${round}`, pick && `Pick #${pick}`].filter(Boolean).join(' · '),
        meta: `${String(r?.Season || '').trim()} draft`,
      })
    })
  // Ordem cronológica decrescente: o mais recente em cima (draft incluído)
  events.sort((x, y) => (y.at || 0) - (x.at || 0))
  const style = {
    trade: { icon: ArrowLeftRight, cls: 'bg-[#EEF3FF] text-[#02275F]', tag: 'Trade' },
    add: { icon: Plus, cls: 'bg-[#E8F5EC] text-[#1E8E3E]', tag: 'Added' },
    drop: { icon: Minus, cls: 'bg-[#FDECEE] text-[#D01F2D]', tag: 'Dropped' },
    draft: { icon: ClipboardList, cls: 'bg-[#FFF2B8] text-[#6B5A00]', tag: 'Draft' },
  }
  return (
    <section className="overflow-hidden rounded-xl bg-white">
      <div className="px-3 pb-2 pt-3 sm:px-4">
        <h3 className="text-[15px] font-bold text-[#111]">Transaction log</h3>
        <div className="mt-0.5 text-[12px] text-[#6B7280]">Draft picks and every move involving this player in the league · moves from Sleeper (2025 on)</div>
      </div>
      <div className="mx-3 border-t border-[#E6E8EB] sm:mx-4" />
      {loading ? <div className="px-3 py-4 text-[13px] text-[#6B7280] sm:px-4">Loading…</div>
        : !events.length ? <div className="px-3 py-8 text-center text-[13px] text-[#6B7280] sm:px-4">No draft picks, trades, adds or drops for this player.</div>
          : (
            <ol className="relative px-3 py-3 sm:px-4">
              {/* Linha do tempo */}
              <span className="absolute bottom-5 left-[29px] top-5 w-px bg-[#E6E8EB] sm:left-[33px]" />
              {events.map((e, i) => {
                const st = style[e.kind]
                return (
                  <li key={`${e.t.id}-${i}`} className="relative flex items-start gap-3 py-2">
                    <span className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ring-4 ring-white ${st.cls}`}><st.icon className="h-4 w-4" strokeWidth={2.5} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {e.team && <TeamLogo name={e.team} size={18} />}
                        <span className="text-[13px] font-semibold text-[#111]">{e.text}</span>
                        {e.sub && <span className="text-[12px] text-[#6B7280]">{e.sub}</span>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                        <Tag tone={e.kind === 'trade' ? 'navy' : e.kind === 'add' ? 'green' : e.kind === 'draft' ? 'gold' : 'red'}>{st.tag}</Tag>
                        {e.meta || txMeta(e.t)}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
    </section>
  )
}
