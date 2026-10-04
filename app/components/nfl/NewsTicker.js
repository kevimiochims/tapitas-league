'use client'

import { useEffect, useRef, useState } from 'react'
import { TeamLogo } from '../ui'
import NewsReader from './NewsReader'

// Tira o nome do jogador do começo da manchete (ele já aparece em negrito)
function cleanHeadline(n) {
  const name = String(n.player?.name || '').trim()
  const h = String(n.headline || '').trim()
  return name && h.toLowerCase().startsWith(name.toLowerCase()) ? h.slice(name.length).replace(/^[\s:,-]+/, '') || h : h
}

// Faixa de manchetes rolando ("Tapitas wire"): últimas notícias da NFL sobre
// jogadores dos elencos da liga. Pausa com o mouse (ou o dedo) em cima.
// Toque numa manchete abre a prévia da notícia (NewsReader), como no resto do site
export default function NewsTicker({ onOpenPlayer }) {
  const [news, setNews] = useState([])
  const [reading, setReading] = useState(null)
  const trackRef = useRef(null)
  const pausedRef = useRef(false)
  // Posição da faixa (px) e arraste com o dedo/mouse
  const xRef = useRef(0)
  const dragRef = useRef(null)
  const resumeRef = useRef(null)
  const movedRef = useRef(false)
  // Mantém a posição dentro de uma volta da faixa (ela é duplicada)
  const place = x => {
    const track = trackRef.current
    if (!track) return
    const half = track.scrollWidth / 2
    if (half > 0) { while (x > 0) x -= half; while (-x >= half) x += half }
    xRef.current = x
    track.style.transform = `translate3d(${x}px, 0, 0)`
  }

  // Rolagem em JS (pixels por segundo): pausa de verdade com o mouse em cima,
  // sem voltar ao início, e mais rápida no desktop.
  useEffect(() => {
    const track = trackRef.current
    if (!track || !news.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let last = performance.now()
    let frame
    const step = now => {
      const dt = Math.min(now - last, 100) / 1000
      last = now
      if (!pausedRef.current && !dragRef.current) {
        const speed = window.innerWidth >= 1024 ? 58 : 40
        place(xRef.current - speed * dt)
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
    <button
      type="button"
      key={`${copy}-${n.id || n.headline}-${i}`}
      aria-hidden={copy === 'b' || undefined}
      tabIndex={copy === 'b' ? -1 : undefined}
      onClick={() => { pausedRef.current = true; setReading(n) }}
      className="inline-flex flex-shrink-0 items-center gap-2 px-5 text-left text-[13px] text-white/85 hover:text-white"
    >
      {n.player?.fantasyTeam && <span className="rounded-full bg-white p-px"><TeamLogo name={n.player.fantasyTeam} size={16} /></span>}
      {n.player?.name && <span className="font-semibold text-white">{n.player.name}</span>}
      <span className="whitespace-nowrap">{cleanHeadline(n)}</span>
      <span className="pl-3 text-[#E8C766]">●</span>
    </button>
  ))

  return (
    <div className="relative mb-2 flex items-stretch overflow-hidden rounded-xl bg-[#02275F] text-white">
      <div className="relative z-10 flex flex-shrink-0 items-center gap-1.5 bg-[#C8102E] px-3 text-[11px] font-bold uppercase tracking-[0.12em]">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        Tapitas wire
      </div>
      <div
        className="relative min-w-0 flex-1 cursor-grab select-none overflow-hidden py-2.5 active:cursor-grabbing"
        style={{ touchAction: 'pan-y' }}
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
        // Arrastar para os lados: a faixa segue o dedo e volta a andar sozinha depois
        onPointerDown={e => {
          clearTimeout(resumeRef.current)
          pausedRef.current = true
          movedRef.current = false
          dragRef.current = { startX: e.clientX, x: xRef.current, id: e.pointerId }
        }}
        onPointerMove={e => {
          const d = dragRef.current
          if (!d) return
          const dx = e.clientX - d.startX
          if (Math.abs(dx) > 5) movedRef.current = true
          if (movedRef.current) place(d.x + dx)
        }}
        onPointerUp={() => {
          dragRef.current = null
          if (window.matchMedia('(hover: none)').matches) resumeRef.current = setTimeout(() => { pausedRef.current = false }, 2500)
        }}
        onPointerCancel={() => { dragRef.current = null; resumeRef.current = setTimeout(() => { pausedRef.current = false }, 2500) }}
        // Trackpad / roda horizontal também movem a faixa
        onWheel={e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) place(xRef.current - e.deltaX) }}
        // Depois de arrastar, soltar não conta como toque na manchete
        onClickCapture={e => { if (movedRef.current) { e.preventDefault(); e.stopPropagation(); movedRef.current = false } }}
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          {renderItems('a')}
          {renderItems('b')}
        </div>
      </div>
      {reading && <NewsReader item={reading} onClose={() => { setReading(null); pausedRef.current = false }} onOpenPlayer={onOpenPlayer} />}
    </div>
  )
}
