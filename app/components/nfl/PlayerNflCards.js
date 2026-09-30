'use client'

import { ExternalLink } from 'lucide-react'
import { usePlayerNews, usePlayerAdvanced } from './useNflData'

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
export function PlayerNewsCard({ playerId }) {
  const { data, loading, error } = usePlayerNews(playerId)
  const news = data?.news || []
  if (!playerId || error || (!loading && !news.length)) return null
  return (
    <Card title="Latest news" subtitle="Headlines from ESPN">
      {loading ? <div className="px-3 py-4 text-[13px] text-[#6B7280] sm:px-4">Loading…</div> : (
        <div className="divide-y divide-[#F1F2F4]">
          {news.slice(0, 5).map(n => {
            const Tag = n.url ? 'a' : 'div'
            return (
              <Tag key={n.id} {...(n.url ? { href: n.url, target: '_blank', rel: 'noopener noreferrer' } : {})} className="group block px-3 py-2.5 transition-colors hover:bg-[#F7F8FA] sm:px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[13px] font-semibold leading-snug text-[#111] group-hover:text-[#02275F]">{n.headline}</div>
                  {n.url && <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#9CA3AF]" />}
                </div>
                {n.description && <div className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-[#6B7280]">{n.description}</div>}
                {n.published && <div className="mt-1 text-[11px] text-[#9CA3AF]">{timeAgo(n.published)}</div>}
              </Tag>
            )
          })}
        </div>
      )}
    </Card>
  )
}

const fmtPct = v => (v == null ? '—' : `${Math.round(v)}%`)
const fmtNum = v => (v == null ? '—' : String(Math.round(v)))

// Uso do jogador na NFL: snaps, participação nos alvos e red zone
export function PlayerAdvancedCard({ playerId, position }) {
  const { data, loading, error } = usePlayerAdvanced(playerId)
  const pos = String(position || '').toUpperCase()
  if (!playerId || pos === 'DEF' || pos === 'K' || error) return null
  const weeks = (data?.weeks || []).filter(w => w.snapPct != null || w.targetShare != null || w.rzTargets != null || w.rzCarries != null)
  if (!loading && !weeks.length) return null
  const s = data?.summary || {}
  const isQb = pos === 'QB'

  const tiles = [
    ['Snap share', fmtPct(s.snapPct), 'avg per game'],
    isQb ? ['RZ passes', fmtNum(s.rzPasses), 'season total'] : ['Target share', fmtPct(s.targetShare), `${fmtNum(s.targets)} targets`],
    isQb ? ['RZ carries', fmtNum(s.rzCarries), 'season total'] : ['Air yards share', fmtPct(s.airYardsShare), 'avg per game'],
    ['Red zone', isQb ? fmtNum((s.rzPasses || 0) + (s.rzCarries || 0)) : fmtNum((s.rzTargets || 0) + (s.rzCarries || 0)), isQb ? 'passes + carries' : 'targets + carries'],
  ]

  return (
    <Card title="NFL usage" subtitle={`${data?.season || ''} season · snaps and target share via nflverse, red zone via Sleeper`}>
      {loading ? <div className="px-3 py-4 text-[13px] text-[#6B7280] sm:px-4">Loading…</div> : (
        <>
          <div className="grid grid-cols-2 gap-px border-b border-[#F1F2F4] bg-[#F1F2F4] sm:grid-cols-4">
            {tiles.map(([label, value, sub]) => (
              <div key={label} className="min-w-0 bg-white px-3 py-3 sm:px-4">
                <div className="truncate text-[11px] text-[#6B7280]">{label}</div>
                <div className="mt-1 text-[20px] font-bold leading-none tabular-nums text-[#111]">{value}</div>
                <div className="mt-1 truncate text-[11px] text-[#6B7280]">{sub}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[12px]">
              <thead>
                <tr className="text-left text-[11px] text-[#6B7280]">
                  <th className="px-3 py-2 font-medium sm:px-4">Week</th>
                  <th className="px-2 py-2 text-right font-medium">Snaps</th>
                  <th className="px-2 py-2 text-right font-medium">Snap %</th>
                  <th className="px-2 py-2 text-right font-medium">Targets</th>
                  <th className="px-2 py-2 text-right font-medium">Tgt share</th>
                  <th className="px-3 py-2 text-right font-medium sm:px-4">RZ opps</th>
                </tr>
              </thead>
              <tbody>
                {[...weeks].reverse().map(w => (
                  <tr key={`${w.seasonType}-${w.week}`} className="border-t border-[#F1F2F4] tabular-nums text-[#111]">
                    <td className="px-3 py-2 sm:px-4">{w.seasonType === 'REG' ? `Wk ${w.week}` : `${w.seasonType} ${w.week}`}{w.opponent ? <span className="ml-1 text-[#9CA3AF]">vs {w.opponent}</span> : null}</td>
                    <td className="px-2 py-2 text-right">{fmtNum(w.snaps)}</td>
                    <td className="px-2 py-2 text-right">{fmtPct(w.snapPct)}</td>
                    <td className="px-2 py-2 text-right">{fmtNum(w.targets)}</td>
                    <td className="px-2 py-2 text-right">{fmtPct(w.targetShare)}</td>
                    <td className="px-3 py-2 text-right sm:px-4">{w.rzTargets == null && w.rzCarries == null && w.rzPasses == null ? '—' : (w.rzTargets || 0) + (w.rzCarries || 0) + (isQb ? (w.rzPasses || 0) : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}
