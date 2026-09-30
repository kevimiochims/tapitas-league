'use client'

// Peças visuais compartilhadas pelo site (padrão das páginas Matchups/Teams).
// Mantém cards, filtros e etiquetas iguais em todas as páginas.

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Check, Trophy } from 'lucide-react'
import Header from './Header'

// ── Estrutura da página ─────────────────────────────────────────────
// `topBar`: faixas de largura total logo abaixo do header, sem espaçamento
// (ex.: placares da Home). O espaço volta só antes do conteúdo principal.
export function PageShell({ children, loading = false, headerProps, topBar }) {
  return (
    <main className="mx-root flex min-h-screen flex-col bg-[#EDEEF0] text-[#111]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .mx-root { font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; text-rendering:optimizeLegibility; font-variant-numeric:tabular-nums; }
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <Header {...headerProps} flush={Boolean(topBar)} />
      {topBar && <div className="mb-2">{topBar}</div>}
      <section className="mx-auto w-full max-w-[1400px] px-0 pb-6 pt-0 sm:px-2 lg:px-4">
        {loading ? <PageSkeleton /> : children}
      </section>
      <SiteFooter />
    </main>
  )
}

// Rodapé branco em todas as páginas: o fim da página (e a área que aparece
// ao "arrastar" no celular) fica branco, igual ao topo com o header.
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#E6E8EB] bg-white">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-5 text-[12px] text-[#6B7280]">
        <span className="font-semibold text-[#111]">Tapitas League</span>
        <span>Est. 2014 · Fantasy Football</span>
      </div>
    </footer>
  )
}

// Botão "Season summary" (header no desktop, barra do topo no mobile).
export function SummaryButton({ onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#D6DCE8] bg-white px-3 text-[13px] font-semibold text-[#02275F] transition-colors hover:border-[#02275F] hover:bg-[#EEF3FF]"
    >
      <Trophy className="h-3.5 w-3.5 text-[#B8860B]" />
      {compact ? 'Summary' : 'Season summary'}
    </button>
  )
}

// ── Carregamento (skeleton) ─────────────────────────────────────────
// Blocos cinza pulsando no formato do conteúdo, no lugar de "Loading...".
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-[#E6E8EB] ${className.includes('rounded') ? '' : 'rounded-md'} ${className}`} />
}

export function SkeletonRows({ rows = 6, avatar = true }) {
  return (
    <div className="space-y-3 px-3 py-3 lg:px-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {avatar && <Skeleton className="h-7 w-7 flex-shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3" />
            <Skeleton className={`h-2.5 ${i % 3 === 0 ? 'w-1/2' : i % 3 === 1 ? 'w-2/3' : 'w-2/5'}`} />
          </div>
          <Skeleton className="h-3 w-10 flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

// Carregamento dentro de um card.
export function LoadingState({ label = 'Loading', rows = 5 }) {
  return (
    <div role="status" aria-label={label}>
      <SkeletonRows rows={rows} />
    </div>
  )
}

function SkeletonCard({ rows = 6, tall = false }) {
  return (
    <div className="mb-2 overflow-hidden rounded-xl bg-white">
      <div className="space-y-2 px-3 pb-3 pt-4 lg:px-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="mx-3 border-t border-[#EEF0F2] lg:mx-4" />
      {tall ? <div className="p-3 lg:p-4"><Skeleton className="h-[220px] w-full rounded-lg" /></div> : <SkeletonRows rows={rows} />}
    </div>
  )
}

// Página inteira carregando: faixa do topo + layout em 3 colunas.
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className="mb-2 flex items-center gap-2 rounded-xl bg-white p-2">
        <Skeleton className="h-9 w-20 flex-shrink-0" />
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-[10.5rem] flex-shrink-0 rounded-lg" />)}
      </div>
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)_260px] lg:items-start lg:gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px] xl:gap-5">
        <div className="hidden lg:block"><SkeletonCard rows={8} /></div>
        <div className="min-w-0">
          <SkeletonCard tall />
          <SkeletonCard rows={5} />
        </div>
        <div className="hidden lg:block"><SkeletonCard rows={8} /></div>
      </div>
    </div>
  )
}

// Título de página discreto (quando a página precisa de um cabeçalho próprio).
export function PageTitle({ title, subtitle, right }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 sm:px-4">
      <div className="min-w-0">
        <h1 className="truncate text-[20px] font-bold leading-tight tracking-tight text-[#111] sm:text-[24px]">{title}</h1>
        {subtitle && <div className="mt-0.5 text-[12px] text-[#6B7280] sm:text-[13px]">{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}

// Barra da página: nome à esquerda + controles da página (temporadas, abas,
// categorias) + ações à direita. Todas as páginas começam com ela.
export function PageBar({ title, children, right, className = '' }) {
  return (
    <div className={`relative z-20 mb-2 flex items-stretch rounded-xl bg-white ${className}`}>
      {title && <h1 className="flex flex-shrink-0 items-center border-r border-[#EEF0F2] px-3 text-[14px] font-bold text-[#111]">{title}</h1>}
      <div className="scroll-hide flex min-w-0 flex-1 items-stretch overflow-x-auto">{children}</div>
      {right && <div className="flex flex-shrink-0 items-center gap-1.5 border-l border-[#EEF0F2] px-2">{right}</div>}
    </div>
  )
}

// Item da PageBar (sublinhado vermelho quando ativo).
export function BarTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] tabular-nums transition-colors ${active ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280] hover:text-[#111]'}`}
    >
      {children}
    </button>
  )
}

// ── Cards ───────────────────────────────────────────────────────────
// `withMenus`: cards com dropdowns não podem cortar o overflow, então o
// corpo arredonda os próprios cantos de baixo.
export function CardShell({ title, subtitle, action, sidebar = false, withMenus = false, className = '', children }) {
  return (
    <section className={`mb-2 rounded-xl bg-white ${withMenus ? '' : 'overflow-hidden'} ${sidebar ? 'lg:bg-[#F6F7F9]' : ''} ${className}`}>
      {(title || action) && (
        <>
          <div className="flex items-end justify-between gap-3 px-3 pb-2 pt-3 lg:px-4 lg:pb-3 lg:pt-4">
            <div className="min-w-0">
              {title && <h2 className="truncate text-[15px] font-bold leading-tight text-[#111]">{title}</h2>}
              {subtitle && <div className="mt-0.5 text-[12px] text-[#6B7280]">{subtitle}</div>}
            </div>
            {action}
          </div>
          <div className="mx-3 border-t border-[#E6E8EB] lg:mx-4" />
        </>
      )}
      {children}
    </section>
  )
}

export function CardGroup({ label, first = false, children }) {
  return (
    <div className={first ? 'pt-2 lg:pt-3' : 'mt-1 border-t border-[#F1F2F4] pt-2 lg:mt-2 lg:border-[#E6E8EB] lg:pt-3'}>
      {label && <div className="px-3 pb-1 text-[11px] font-medium text-[#6B7280] lg:px-4">{label}</div>}
      {children}
    </div>
  )
}

export function StatRow({ left, eyebrow, title, subtitle, value, valueClass = 'text-[#111]', href, onClick }) {
  const interactive = Boolean(href || onClick)
  const className = `flex w-full items-center gap-2 px-3 py-2 text-left lg:gap-3 lg:px-4 lg:py-2.5 ${interactive ? 'group transition-colors hover:bg-black/[0.03]' : ''}`
  const inner = (
    <>
      {left}
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="truncate text-[11px] text-[#6B7280]">{eyebrow}</div>}
        <div className={`truncate text-[13px] font-medium leading-tight text-[#111] ${interactive ? 'group-hover:text-[#D01F2D]' : ''}`}>{title}</div>
        {subtitle && <div className="truncate text-[11px] text-[#6B7280]">{subtitle}</div>}
      </div>
      {value !== undefined && value !== null && <div className={`flex-shrink-0 text-[13px] font-semibold tabular-nums ${valueClass}`}>{value}</div>}
    </>
  )
  if (href) return <a href={href} className={className}>{inner}</a>
  if (onClick) return <button type="button" onClick={onClick} className={className}>{inner}</button>
  return <div className={className}>{inner}</div>
}

// Número em destaque (rótulo em cima, valor, detalhe embaixo).
// Com `href`, o número vira link para a página relacionada.
export function StatTile({ label, value, sub, valueClass = 'text-[#111]', href }) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-1 truncate text-[11px] text-[#6B7280]">
        <span className="truncate">{label}</span>
        {href && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[#9CA3AF] transition-colors group-hover:text-[#D01F2D]" />}
      </div>
      <div className={`mt-1 whitespace-nowrap text-[20px] font-bold leading-none tabular-nums sm:text-[22px] ${valueClass}`}>{value}</div>
      {sub && <div className="mt-1 truncate text-[11px] text-[#6B7280]">{sub}</div>}
    </>
  )
  if (href) return <a href={href} className="group block min-w-0 bg-white px-3 py-3 transition-colors hover:bg-[#F7F8FA] sm:px-4">{inner}</a>
  return <div className="min-w-0 bg-white px-3 py-3 sm:px-4">{inner}</div>
}

// Grade de StatTiles separadas por linhas finas.
export function StatGrid({ children, className = 'grid-cols-2 sm:grid-cols-4' }) {
  return <div className={`grid gap-px bg-[#EEF0F2] ${className}`}>{children}</div>
}

// ── Abas ────────────────────────────────────────────────────────────
export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`scroll-hide mb-2 flex overflow-x-auto rounded-xl bg-white ${className}`}>
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] transition-colors ${value === key ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280] hover:text-[#111]'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// Controle segmentado (troca de visão dentro de um card).
export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex flex-shrink-0 rounded-full bg-[#F1F2F4] p-0.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`h-7 whitespace-nowrap rounded-full px-3 text-[12px] transition-colors ${value === key ? 'bg-white font-semibold text-[#111] shadow-sm' : 'text-[#6B7280] hover:text-[#111]'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Filtros ─────────────────────────────────────────────────────────
function useClickOutside(onOutside) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onOutside() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onOutside])
  return ref
}

// `neutral`: sempre mostra o valor escolhido (seletor), sem destacar em azul.
// `hideLabel`: mostra só o valor ("Week 3") em vez de "Label: valor".
// `tone="dark"`: versão para fundos escuros (cards estilo hero).
export function FilterPill({ value, onChange, options, label, displayOption, neutral = false, hideLabel = false, allLabel, tone = 'light', align = 'left' }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const format = displayOption || (opt => opt)
  const active = !neutral && value !== 'All'
  const display = neutral ? (hideLabel ? format(value) : `${label}: ${format(value)}`) : active ? format(value) : label
  const dark = tone === 'dark'
  const buttonClass = dark
    ? 'bg-white/10 font-semibold text-white hover:bg-white/20'
    : active ? 'bg-[#02275F] font-semibold text-white'
      : neutral ? 'bg-[#F4F5F7] font-semibold text-[#111] hover:bg-[#ECEEF1]'
      : 'bg-[#F4F5F7] text-[#3F4757] hover:bg-[#ECEEF1]'

  return (
    <div ref={ref} className="relative min-w-0 flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`inline-flex h-8 max-w-full items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors ${buttonClass}`}
      >
        <span className="max-w-[160px] truncate">{display}</span>
        <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${dark || active ? 'text-white/70' : 'text-[#6B7280]'}`} />
      </button>
      {open && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-[calc(100%+4px)] z-[70] w-[210px] overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5`}>
          <div className="max-h-64 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[#F4F5F7] ${opt === value ? 'font-semibold text-[#111]' : 'text-[#3F4757]'}`}
              >
                <span className="truncate">{opt === 'All' ? (allLabel || 'All') : format(opt)}</span>
                {opt === value && <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#D01F2D]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Filtro com várias opções marcadas ao mesmo tempo (valor = array; ['All'] = todos).
export function MultiFilterPill({ value, onChange, options, label, displayOption }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const format = displayOption || (opt => opt)
  const selected = (Array.isArray(value) ? value : []).filter(v => v !== 'All')
  const active = selected.length > 0
  const display = !active ? label : selected.length === 1 ? format(selected[0]) : `${label} · ${selected.length}`

  const toggle = opt => {
    if (opt === 'All') return onChange(['All'])
    const next = selected.includes(opt) ? selected.filter(v => v !== opt) : [...selected, opt]
    onChange(next.length ? next : ['All'])
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors ${active ? 'bg-[#02275F] font-semibold text-white' : 'bg-[#F4F5F7] text-[#3F4757] hover:bg-[#ECEEF1]'}`}
      >
        <span className="max-w-[160px] truncate">{display}</span>
        <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${active ? 'text-white/70' : 'text-[#6B7280]'}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[70] w-[220px] overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
          <div className="max-h-64 overflow-y-auto">
            {options.map(opt => {
              const checked = opt === 'All' ? !active : selected.includes(opt)
              return (
                <button key={opt} type="button" onClick={() => toggle(opt)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#3F4757] transition-colors hover:bg-[#F4F5F7]">
                  <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${checked ? 'border-[#02275F] bg-[#02275F] text-white' : 'border-[#C9CDD4] bg-white'}`}>
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className={`truncate ${checked ? 'font-semibold text-[#111]' : ''}`}>{opt === 'All' ? `All ${label.toLowerCase()}s` : format(opt)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Paginação simples (anterior / próxima).
export function Pager({ page, totalPages, total, pageSize, onPrev, onNext }) {
  if (!total) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#EEF0F2] px-3 py-2.5 lg:px-4">
      <div className="text-[12px] tabular-nums text-[#6B7280]">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onPrev} disabled={page === 0} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F5F7] text-[#111] transition-colors hover:bg-[#ECEEF1] disabled:cursor-not-allowed disabled:opacity-30">
          <ChevronDown className="h-4 w-4 rotate-90" />
        </button>
        <div className="min-w-[64px] text-center text-[12px] tabular-nums text-[#3F4757]">{page + 1} / {totalPages}</div>
        <button type="button" onClick={onNext} disabled={page >= totalPages - 1} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F5F7] text-[#111] transition-colors hover:bg-[#ECEEF1] disabled:cursor-not-allowed disabled:opacity-30">
          <ChevronDown className="h-4 w-4 -rotate-90" />
        </button>
      </div>
    </div>
  )
}

export function ToggleChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors ${active ? 'bg-[#02275F] font-semibold text-white' : 'bg-[#F4F5F7] text-[#3F4757] hover:bg-[#ECEEF1]'}`}
    >
      {children}
    </button>
  )
}

// Linha de filtros dentro de um card.
export function FilterBar({ children }) {
  return <div className="flex flex-wrap items-center gap-1.5 border-b border-[#EEF0F2] px-3 py-2.5 lg:px-4">{children}</div>
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = 'sm:w-52' }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-8 w-full min-w-0 rounded-full bg-[#F4F5F7] px-3 text-[12px] text-[#111] outline-none placeholder:text-[#9CA3AF] focus:bg-white focus:ring-1 focus:ring-[#02275F] ${className}`}
    />
  )
}

// Filtro compacto para cabeçalho de coluna de tabela.
export function HeaderFilter({ value, onChange, options, label, displayOption }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const format = displayOption || (opt => opt)
  const active = value !== 'All'
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(p => !p)} className={`inline-flex items-center gap-1 hover:text-[#111] ${active ? 'font-semibold text-[#D01F2D]' : ''}`}>
        {active ? format(value) : label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''} ${active ? 'text-[#D01F2D]' : 'text-[#9CA3AF]'}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[180px] overflow-hidden rounded-lg bg-white py-1 text-left shadow-lg ring-1 ring-black/5">
          <div className="max-h-56 overflow-y-auto">
            {options.map(opt => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false) }} className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-normal hover:bg-[#F4F5F7] ${opt === value ? 'font-semibold text-[#111]' : 'text-[#3F4757]'}`}>
                <span className="truncate">{opt === 'All' ? 'All' : format(opt)}</span>
                {opt === value && <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#D01F2D]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Cabeçalho de coluna ordenável.
export function SortHeader({ label, active, dir, onClick, align = 'left' }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 hover:text-[#111] ${align === 'right' ? 'flex-row-reverse' : ''} ${active ? 'font-semibold text-[#111]' : ''}`}>
      {label}
      <span className={active ? 'text-[#D01F2D]' : 'text-[#C4C7CC]'}>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  )
}

// ── Etiquetas ───────────────────────────────────────────────────────
export function Tag({ tone, children }) {
  const tones = {
    gold: 'bg-[#FFF2B8] text-[#6B5A00]',
    navy: 'bg-[#EEF3FF] text-[#16274F]',
    green: 'bg-[#E8F5EC] text-[#1E8E3E]',
    red: 'bg-[#FDECEE] text-[#B3171F]',
  }
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${tones[tone] || 'bg-[#F1F2F4] text-[#4B5563]'}`}>
      {children}
    </span>
  )
}

export function ResultBadge({ result }) {
  const r = String(result || '').toUpperCase()
  if (!r) return <span className="text-[12px] text-[#9CA3AF]">—</span>
  const color = r === 'W' ? 'bg-[#1E8E3E]' : r === 'L' ? 'bg-[#D01F2D]' : 'bg-[#6B7280]'
  return <span className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[11px] font-semibold text-white ${color}`}>{r}</span>
}

// Sequência (W3 / L2) no padrão da página Matchups.
export function StreakBadge({ streak }) {
  const s = String(streak || '').trim()
  if (!s) return <span className="text-[12px] text-[#9CA3AF]">—</span>
  const up = s.toUpperCase().startsWith('W')
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white ${up ? 'bg-[#1E8E3E]' : 'bg-[#D01F2D]'}`}>{s}</span>
}

export const POSITION_BADGE_CLASSES = {
  QB: 'bg-[#D01F2D] text-white',
  RB: 'bg-[#1E8E3E] text-white',
  WR: 'bg-[#16274F] text-white',
  TE: 'bg-[#B8860B] text-white',
  FLEX: 'bg-[#3F4757] text-white',
  K: 'bg-[#6B7280] text-white',
  DEF: 'bg-[#3F4757] text-white',
}

export function PositionBadge({ position }) {
  const pos = String(position || '').toUpperCase()
  if (!pos) return null
  return <span className={`inline-flex flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${POSITION_BADGE_CLASSES[pos] || 'bg-[#F4F5F7] text-[#3F4757]'}`}>{pos}</span>
}

// ── Botão "mostrar mais" para listas longas ─────────────────────────
export function ShowMore({ remaining, onClick, noun = 'items' }) {
  if (remaining <= 0) return null
  return (
    <button type="button" onClick={onClick} className="w-full py-3 text-[13px] font-semibold text-[#D01F2D] transition-colors hover:bg-[#F7F8FA]">
      Show more {noun} ({remaining} remaining)
    </button>
  )
}

// ── Avatares de times da liga ───────────────────────────────────────
const TEAM_IMAGES = {
  'howmuch': '/images/howmuch.png',
  'i am megatron': '/images/megatron.png',
  'moneyball': '/images/moneyball.png',
  'ocupa e resiste': '/images/ocupa.png',
  'oldbrady': '/images/oldbrady.png',
  'patrolao squad': '/images/patrolao.png',
  'pequers verde': '/images/pequers.png',
  'peytao da massa': '/images/peytao.png',
  'rincao settlers': '/images/rincao.png',
  'h-lera do mahl': '/images/hlera.png',
}

// Siglas de três letras das franquias (placares compactos)
const TEAM_ABBR = {
  'howmuch': 'HOW',
  'i am megatron': 'MEG',
  'moneyball': 'MON',
  'ocupa e resiste': 'O&R',
  'oldbrady': 'OLD',
  'patrolao squad': 'PAT',
  'pequers verde': 'PEQ',
  'peytao da massa': 'PEY',
  'rincao settlers': 'SET',
  'h-lera do mahl': 'HLE',
}

export function getTeamAbbr(name) {
  const key = normalizeTeamKey(name)
  return TEAM_ABBR[key] || key.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase() || '—'
}

export function normalizeTeamKey(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function getTeamImage(name) {
  return TEAM_IMAGES[normalizeTeamKey(name)] || null
}

export function TeamLogo({ name, size = 22 }) {
  const src = getTeamImage(name)
  if (src) return <img src={src} alt={name} className="flex-shrink-0 object-contain" style={{ width: size, height: size }} />
  const initials = String(name || '?').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex flex-shrink-0 items-center justify-center rounded-full bg-[#16274F] font-semibold text-white" style={{ width: size, height: size, fontSize: Math.max(8, size * 0.34) }}>
      {initials}
    </div>
  )
}


// ── Versus (rivalidades) ────────────────────────────────────────────
// Pôster dividido na diagonal: time da esquerda no azul da marca, time da
// direita no vermelho do logo.
export function VersusPoster({ label, badge, left, right, leftControl, rightControl }) {
  const side = (t, control) => (
    <div className="flex min-w-0 flex-col items-center gap-2">
      {control}
      {t?.team && (
        <a href={t.href || `/teams?team=${encodeURIComponent(t.team)}`} className="flex min-w-0 flex-col items-center gap-1.5">
          <span className="rounded-full bg-white p-1.5 shadow-lg"><TeamLogo name={t.team} size={52} /></span>
          {!control && <span className="max-w-full truncate text-center text-[13px] font-semibold">{t.team}</span>}
          <span className="text-[56px] font-bold leading-none tabular-nums">{t.value}</span>
        </a>
      )}
    </div>
  )
  return (
    <div className="relative z-10 text-white">
      {/* Fundo recortado à parte para que os menus dos seletores possam sair do pôster */}
      <div className="absolute inset-0 overflow-hidden rounded-t-xl">
        <div className="absolute inset-0 bg-[#02275F]" />
        <div className="absolute inset-0 bg-[#C8102E]" style={{ clipPath: 'polygon(56% 0, 100% 0, 100% 100%, 44% 100%)' }} />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'repeating-linear-gradient(115deg, #fff 0 2px, transparent 2px 14px)' }} />
      </div>
      <div className="relative flex items-center justify-between gap-2 px-3 pt-3 lg:px-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">{label}</span>
        {badge && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">{badge}</span>}
      </div>
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 pb-5 pt-3 lg:px-4">
        {side(left, leftControl)}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[15px] font-black italic text-[#111] shadow-lg">VS</div>
        {side(right, rightControl)}
      </div>
    </div>
  )
}

// "Tale of the tape": comparação lado a lado com barra nas cores do pôster.
// rows: { label, a, b, shareA, shareB, subA, subB }
export function TaleOfTape({ leftName, rightName, rows }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 px-3 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] lg:px-4">
        <span className="truncate text-[#02275F]">{leftName}</span>
        <span className="flex-shrink-0">Tale of the tape</span>
        <span className="truncate text-right text-[#C8102E]">{rightName}</span>
      </div>
      <div className="space-y-3 px-3 py-3 lg:px-4">
        {rows.map(row => {
          const total = (row.shareA || 0) + (row.shareB || 0)
          const pctA = total > 0 ? (row.shareA / total) * 100 : 50
          return (
            <div key={row.label}>
              <div className="flex items-baseline justify-between gap-2 text-[14px] font-bold tabular-nums">
                <span className={total > 0 && row.shareA >= row.shareB ? 'text-[#02275F]' : 'text-[#9CA3AF]'}>{row.a}</span>
                <span className="text-center text-[11px] font-medium text-[#6B7280]">{row.label}</span>
                <span className={total > 0 && row.shareB >= row.shareA ? 'text-[#C8102E]' : 'text-[#9CA3AF]'}>{row.b}</span>
              </div>
              <div className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                {total > 0 ? (
                  <>
                    <div className="rounded-l-full bg-[#02275F]" style={{ width: `${pctA}%` }} />
                    <div className="flex-1 rounded-r-full bg-[#C8102E]" />
                  </>
                ) : <div className="flex-1 rounded-full bg-[#E6E8EB]" />}
              </div>
              {(row.subA || row.subB) && (
                <div className="mt-1 flex justify-between gap-2 text-[11px] text-[#6B7280]">
                  <span className="truncate">{row.subA}</span>
                  <span className="truncate text-right">{row.subB}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Card de líderes (estilo "stat leaders") ─────────────────────────
// Líder em destaque + 2º ao 5º em lista compacta.
// entry: { key, avatar, name, badge, sub, value, href, onClick }
export function LeaderCard({ title, icon: Icon, accentClass = 'bg-[#EEF3FF] text-[#02275F]', leader, others = [], className = '' }) {
  const Wrap = ({ entry, className: cls, children }) => entry?.href
    ? <a href={entry.href} className={cls}>{children}</a>
    : entry?.onClick ? <button type="button" onClick={entry.onClick} className={`w-full text-left ${cls}`}>{children}</button>
      : <div className={cls}>{children}</div>
  return (
    <div className={`flex flex-col overflow-hidden rounded-xl bg-white ${className}`}>
      <div className="flex items-center gap-2 px-3 pt-3 sm:px-4">
        {Icon && <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${accentClass}`}><Icon className="h-3.5 w-3.5" /></span>}
        <span className="text-[13px] font-semibold leading-tight text-[#111]">{title}</span>
      </div>
      {leader ? (
        <Wrap entry={leader} className="group flex items-center gap-3 px-3 pb-3 pt-3 transition-colors hover:bg-[#F7F8FA] sm:px-4">
          <span className="flex-shrink-0">{leader.avatar}</span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[14px] font-semibold text-[#111] group-hover:text-[#D01F2D]">{leader.name}</span>
              {leader.badge}
            </span>
            {leader.sub && <span className="mt-0.5 block truncate text-[11px] text-[#6B7280]">{leader.sub}</span>}
          </span>
          <span className="flex-shrink-0 text-[26px] font-bold leading-none tabular-nums text-[#111]">{leader.value}</span>
        </Wrap>
      ) : (
        <div className="px-3 py-6 text-center text-[12px] text-[#9CA3AF] sm:px-4">No data</div>
      )}
      {others.length > 0 && (
        <div className="mt-auto border-t border-[#F1F2F4]">
          {others.map((o, i) => (
            <Wrap key={o.key || i} entry={o} className="group flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-[#F7F8FA] sm:px-4">
              <span className="w-4 flex-shrink-0 text-[12px] font-semibold tabular-nums text-[#9CA3AF]">{i + 2}</span>
              {o.avatar}
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#3F4757] group-hover:text-[#D01F2D]">{o.name}</span>
              <span className="flex-shrink-0 text-[12px] font-semibold tabular-nums text-[#111]">{o.value}</span>
            </Wrap>
          ))}
        </div>
      )}
    </div>
  )
}
