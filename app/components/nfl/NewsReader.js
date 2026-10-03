'use client'

import { useEffect } from 'react'
import { X, ExternalLink, ChevronRight } from 'lucide-react'
import { TeamLogo, PositionBadge } from '../ui'

function timeAgo(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Leitor da notícia dentro do site (pop-up no estilo do Player Profile): foto,
// manchete, o resumo que o site de origem publica no feed e os jogadores da
// liga envolvidos (cada um abre o perfil). O texto completo continua no site
// de origem (botão no fim), já que o artigo é deles.
export default function NewsReader({ item, photo, photoCredit = '', onClose, onOpenPlayer }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  if (!item) return null
  const players = (item.players?.length ? item.players : [item.player]).filter(Boolean)
  const summary = String(item.description || '')
    .replace(/\s*Visit RotoWire\.com for more analysis on this update\.?\s*$/i, '')
    .trim()
  const image = item.image || photo || null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.headline}
        onClick={e => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-[560px] sm:rounded-2xl"
      >
        <div className="relative flex-shrink-0">
          {image
            ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#16274F]">
                <img src={image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover object-[50%_25%]" />
                {!item.image && photoCredit && <div className="absolute bottom-2 left-2 max-w-[70%] truncate rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-white/80">{photoCredit}</div>}
              </div>
            )
            : <div className="h-14 bg-[#02275F]" />}
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 sm:px-5">
          <div className="text-[12px] font-medium text-[#6B7280]">
            {[item.source, item.published && timeAgo(item.published)].filter(Boolean).join(' · ')}
          </div>
          <h2 className="mt-1 text-[19px] font-bold leading-snug text-[#111]">{item.headline}</h2>
          {summary && <p className="mt-2 text-justify text-[14px] leading-relaxed text-[#2F3542]">{summary}</p>}

          {players.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">{players.length > 1 ? 'Tapitas players in this story' : 'Tapitas player'}</div>
              <div className="overflow-hidden rounded-xl border border-[#EEF0F2]">
                {players.map(p => (
                  <button
                    key={p.id || p.name}
                    type="button"
                    onClick={() => { onClose(); onOpenPlayer?.({ ...p, focus: 'news' }, p.fantasyTeam) }}
                    className="flex w-full items-center gap-2.5 border-b border-[#F1F2F4] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[#F6F7F9]"
                  >
                    {p.fantasyTeam && <TeamLogo name={p.fantasyTeam} size={24} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[14px] font-semibold text-[#111]">{p.name}</span>
                        <PositionBadge position={p.pos} />
                      </div>
                      <div className="truncate text-[12px] text-[#6B7280]">{[p.fantasyTeam, p.starter ? 'Starter' : 'Bench', p.nflTeam].filter(Boolean).join(' · ')}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#A0A5AD]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#02275F] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[#0A3577]"
            >
              Read the full story{item.source ? ` on ${item.source}` : ''}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
