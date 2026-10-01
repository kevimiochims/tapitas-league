'use client'

import { useEffect, useRef, useState } from 'react'
import { TeamLogo } from '../ui'

// Tira o nome do jogador do começo da manchete (ele já aparece em negrito)
function cleanHeadline(n) {
  const name = String(n.player?.name || '').trim()
  const h = String(n.headline || '').trim()
  return name && h.toLowerCase().startsWith(name.toLowerCase()) ? h.slice(name.length).replace(/^[\s:,-]+/, '') || h : h
}

// Faixa de manchetes rolando ("Tapitas wire"): últimas notícias da NFL sobre
// jogadores dos elencos da liga. Pausa com o mouse (ou o dedo) em cima.
export default function NewsTicker() {
  const [news, setNews] = useState([])
  const trackRef = useRef(null)
  const pausedRef = useRef(false)

  // Rolagem em JS (pixels por segundo): pausa de verdade com o mouse em cima,
  // sem voltar ao início, e mais rápida no desktop.
  useEffect(() => {
    const track = trackRef.current
    if (!track || !news.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let x = 0
    let last = performance.now()
    let frame
    const step = now => {
      const dt = Math.min(now - last, 100) / 1000
      last = now
      if (!pausedRef.current) {
        const speed = window.innerWidth >= 1024 ? 70 : 45
        const half = track.scrollWidth / 2
        x -= speed * dt
        if (half > 0 && -x >= half) x += half
        track.style.transform = `translate3d(${x}px, 0, 0)`
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [news])

  useEffect(() => {
    let cancelled = false
    fetch('/api/nfl/league-news')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled) setNews((d?.news || []).slice(0, 14)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!news.length) return null

  const renderItems = copy => news.map((n, i) => (
    <a
      key={`${copy}-${n.id || n.headline}-${i}`}
      aria-hidden={copy === 'b' || undefined}
      tabIndex={copy === 'b' ? -1 : undefined}
      href={n.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex flex-shrink-0 items-center gap-2 px-5 text-[13px] text-white/85 hover:text-white"
    >
      {n.player?.fantasyTeam && <span className="rounded-full bg-white p-px"><TeamLogo name={n.player.fantasyTeam} size={16} /></span>}
      {n.player?.name && <span className="font-semibold text-white">{n.player.name}</span>}
      <span className="whitespace-nowrap">{cleanHeadline(n)}</span>
      <span className="pl-3 text-[#E8C766]">●</span>
    </a>
  ))

  return (
    <div className="relative mb-2 flex items-stretch overflow-hidden rounded-xl bg-[#02275F] text-white">
      <div className="relative z-10 flex flex-shrink-0 items-center gap-1.5 bg-[#C8102E] px-3 text-[11px] font-bold uppercase tracking-[0.12em]">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        Tapitas wire
      </div>
      <div
        className="relative min-w-0 flex-1 overflow-hidden py-2.5"
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
        onTouchStart={() => { pausedRef.current = true }}
        onTouchEnd={() => { setTimeout(() => { pausedRef.current = false }, 2500) }}
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          {renderItems('a')}
          {renderItems('b')}
        </div>
      </div>
    </div>
  )
}
