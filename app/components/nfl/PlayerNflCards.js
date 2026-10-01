'use client'

import { ExternalLink } from 'lucide-react'
import { usePlayerNews } from './useNflData'

function Card({ title, subtitle, children }) {
  return (
    <section className="overflow-hidden rounded-xl bg-white">
      <div className="px-3 pb-2 pt-3 sm:px-4">
        <h3 className="text-[15px] font-bold leading-tight text-[#111]">{title}</h3>
        {subtitle && <div className="mt-0.5 text-[12px] text-[#6B7280]">{subtitle}</div>}
      </div>
      <div className="mx-3 border-t border-[#E6E8EB] sm:mx-4" />
      {children}
    </section>
  )
}

function Empty({ children }) {
  return <div className="px-3 py-8 text-center text-[13px] text-[#6B7280] sm:px-4">{children}</div>
}

function timeAgo(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Últimas manchetes do jogador (ESPN)
export function PlayerNewsCard({ playerId, emptyText }) {
  const { data, loading, error } = usePlayerNews(playerId)
  const news = data?.news || []
  if (!playerId || error || (!loading && !news.length)) {
    return emptyText ? <Card title="Latest news" subtitle="ESPN, RotoWire, RotoBaller, FantasyPros and more"><Empty>{emptyText}</Empty></Card> : null
  }
  return (
    <Card title="Latest news" subtitle="ESPN, RotoWire, RotoBaller, FantasyPros and more">
      {loading ? <div className="px-3 py-4 text-[13px] text-[#6B7280] sm:px-4">Loading…</div> : (
        <div className="divide-y divide-[#F1F2F4]">
          {news.slice(0, 10).map(n => {
            const Tag = n.url ? 'a' : 'div'
            return (
              <Tag key={n.id} {...(n.url ? { href: n.url, target: '_blank', rel: 'noopener noreferrer' } : {})} className="group block px-3 py-2.5 transition-colors hover:bg-[#F7F8FA] sm:px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[13px] font-semibold leading-snug text-[#111] group-hover:text-[#02275F]">{n.headline}</div>
                  {n.url && <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#9CA3AF]" />}
                </div>
                {n.description && <div className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-[#6B7280]">{n.description}</div>}
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                  {n.source && <span className="font-semibold text-[#6B7280]">{n.source}</span>}
                  {n.source && n.published && <span>·</span>}
                  {n.published && <span>{timeAgo(n.published)}</span>}
                </div>
              </Tag>
            )
          })}
        </div>
      )}
    </Card>
  )
}
