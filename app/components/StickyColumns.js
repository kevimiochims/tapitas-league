'use client'

import { useEffect } from 'react'

// Colunas que acompanham a rolagem (desktop). Em toda grade marcada com
// `data-sticky-cols`, cada coluna mais curta que a grade fica "presa":
// descendo, ela rola até o fim do último card aparecer e para ali; subindo,
// rola de volta até o topo aparecer. Vale para laterais e para o centro.
const HEADER = 52 // header fixo (44px) + respiro
const BOTTOM = 12
const MIN_WIDTH = 1024

export default function StickyColumns() {
  useEffect(() => {
    const tops = new WeakMap()
    let lastY = window.scrollY
    let frame = null

    const reset = el => {
      el.style.position = ''
      el.style.top = ''
      el.style.alignSelf = ''
      tops.delete(el)
    }

    let needScan = true
    const ro = new ResizeObserver(() => schedule())
    const scan = () => {
      needScan = false
      document.querySelectorAll('[data-sticky-cols]').forEach(grid => {
        ro.observe(grid)
        Array.from(grid.children).forEach(c => ro.observe(c))
      })
    }

    const update = () => {
      frame = null
      if (needScan) scan()
      const y = window.scrollY
      const delta = y - lastY
      lastY = y
      const desktop = window.innerWidth >= MIN_WIDTH
      const vh = window.innerHeight
      document.querySelectorAll('[data-sticky-cols]').forEach(grid => {
        const gridH = grid.getBoundingClientRect().height
        Array.from(grid.children).forEach(col => {
          if (!desktop || !col.offsetParent) { reset(col); return }
          const h = col.getBoundingClientRect().height
          if (h >= gridH - 1) { reset(col); return } // a coluna mais alta rola normalmente
          col.style.position = 'sticky'
          col.style.alignSelf = 'start'
          const minTop = Math.min(HEADER, vh - h - BOTTOM)
          // Coluna cabe na tela: fica presa logo abaixo do header
          if (minTop === HEADER) { col.style.top = `${HEADER}px`; tops.set(col, HEADER); return }
          const prev = tops.has(col) ? tops.get(col) : HEADER
          const top = Math.max(minTop, Math.min(HEADER, prev - delta))
          tops.set(col, top)
          col.style.top = `${top}px`
        })
      })
    }

    const schedule = () => { if (frame == null) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // Conteúdo carregando/mudando de altura (dados, abas, paginação)
    const mo = new MutationObserver(() => { needScan = true; schedule() })
    mo.observe(document.body, { childList: true, subtree: true })
    schedule()
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      ro.disconnect()
      mo.disconnect()
      if (frame != null) cancelAnimationFrame(frame)
    }
  }, [])
  return null
}
