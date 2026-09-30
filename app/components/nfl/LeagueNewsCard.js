'use client'

import { useEffect, useState } from 'react'
import { CardShell, TeamLogo, PositionBadge, ShowMore, SkeletonRows } from '../ui'
import { PlayerThumb, EmptyNote } from './shared'

function timeAgo(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Últimas notícias da ESPN sobre jogadores dos elencos da liga
export default function LeagueNewsCard({ onOpenPlayer }) {
  const [state, setState] = useState({ news: [], loading: true, failed: false })
  const [limit, setLimit] = useState(6)

  useEffect(() => {
    let cancelled = false
    fetch('/api/nfl/league-news')
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then(d => { if (!cancelled) setState({ news: d?.news || [], loading: false, failed: false }) })
      .catch(() => { if (!cancelled) setState({ news: [], loading: false, failed: true }) })
    return () => { cancelled = true }
  }, [])

  if (state.failed) return null
  const news = state.news

  return (
    <CardShell title="Player news" subtitle="Latest ESPN headlines on Tapitas players" sidebar>
      {state.loading ? <div className="py-2"><SkeletonRows rows={4} /></div> : news.length === 0 ? <EmptyNote>No recent news on Tapitas players.</EmptyNote> : (
        <div className="py-1">
          {news.slice(0, limit).map(n => (
            <div key={n.id || n.url || n.headline} className="flex gap-2 px-3 py-2.5 lg:px-4">
              <button type="button" onClick={() => onOpenPlayer?.(n.player, n.player?.fantasyTeam)} className="flex-shrink-0" aria-label={n.player?.name}>
                <PlayerThumb id={n.player?.id} name={n.player?.name} pos={n.player?.pos} nflTeam={n.player?.nflTeam} size={32} />
              </button>
              <div className="min-w-0 flex-1">
                {n.url
                  ? <a href={n.url} target="_blank" rel="noopener noreferrer" className="block text-[13px] font-semibold leading-snug text-[#111] hover:text-[#02275F]">{n.headline}</a>
                  : <div className="text-[13px] font-semibold leading-snug text-[#111]">{n.headline}</div>}
                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-[#6B7280]">
                  <button type="button" onClick={() => onOpenPlayer?.(n.player, n.player?.fantasyTeam)} className="truncate font-medium text-[#3F4757] hover:text-[#D01F2D]">{n.player?.name}</button>
                  <PositionBadge position={n.player?.pos} />
                  {n.player?.fantasyTeam && <TeamLogo name={n.player.fantasyTeam} size={14} />}
                  {n.published && <span className="ml-auto flex-shrink-0">{timeAgo(n.published)}</span>}
                </div>
              </div>
            </div>
          ))}
          <ShowMore remaining={news.length - limit} onClick={() => setLimit(l => l + 8)} noun="headlines" />
        </div>
      )}
    </CardShell>
  )
}
