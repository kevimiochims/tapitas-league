'use client'

import { useEffect } from 'react'

// Rolagem lateral com mouse comum (desktop sem touchpad).
// Em qualquer faixa com rolagem lateral do site (chips, cards, tabelas largas),
// ao passar o mouse aparecem setas nas bordas para avançar/voltar, e dá para
// arrastar a faixa com o botão do mouse. Vale para o site inteiro, sem precisar
// mexer em cada lista. Só em telas com mouse (pointer: fine); no celular e no
// touchpad nada muda.
//
// As setas ficam numa camada própria presa ao <body> (fora do React), por cima
// da faixa, então não mexem no layout das páginas.

const scrollableX = el => {
  if (!(el instanceof HTMLElement)) return false
  if (el.scrollWidth <= el.clientWidth + 2) return false
  const ox = getComputedStyle(el).overflowX
  return ox === 'auto' || ox === 'scroll'
}

const findScroller = start => {
  for (let el = start; el && el !== document.body; el = el.parentElement) {
    if (el.dataset?.desktopScrollUi) return null
    if (scrollableX(el)) return el
  }
  return null
}

function makeButton(dir) {
  const b = document.createElement('button')
  b.type = 'button'
  b.dataset.desktopScrollUi = '1'
  b.setAttribute('aria-label', dir < 0 ? 'Scroll left' : 'Scroll right')
  b.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${dir < 0 ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}"/></svg>`
  Object.assign(b.style, {
    position: 'fixed', zIndex: '60', width: '32px', height: '32px', borderRadius: '9999px',
    display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    background: 'rgba(255,255,255,0.96)', color: '#111', border: '1px solid #E6E8EB',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: '0',
  })
  return b
}

export default function DesktopScroll() {
  useEffect(() => {
    if (!window.matchMedia?.('(pointer: fine)').matches) return undefined
    const left = makeButton(-1)
    const right = makeButton(1)
    document.body.append(left, right)
    let current = null
    let hideTimer = null

    const place = () => {
      if (!current || !document.body.contains(current) || !scrollableX(current)) { hide(); return }
      const r = current.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight || r.width < 80) { hide(); return }
      const top = Math.max(r.top + 4, Math.min(r.top + r.height / 2 - 16, r.bottom - 36))
      const canLeft = current.scrollLeft > 2
      const canRight = current.scrollLeft + current.clientWidth < current.scrollWidth - 2
      left.style.display = canLeft ? 'flex' : 'none'
      right.style.display = canRight ? 'flex' : 'none'
      left.style.top = right.style.top = `${top}px`
      left.style.left = `${Math.max(4, r.left + 6)}px`
      right.style.left = `${Math.min(window.innerWidth - 36, r.right - 38)}px`
    }
    const hide = () => { left.style.display = right.style.display = 'none'; current = null }
    const show = el => { clearTimeout(hideTimer); if (current !== el) { current?.removeEventListener('scroll', place); current = el; el.addEventListener('scroll', place, { passive: true }) } place() }
    const scheduleHide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => { current?.removeEventListener('scroll', place); hide() }, 250) }

    let raf = 0
    const onMove = e => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (e.target?.dataset?.desktopScrollUi || e.target?.closest?.('[data-desktop-scroll-ui]')) { clearTimeout(hideTimer); return }
        const el = findScroller(e.target)
        if (el) show(el)
        else if (current) scheduleHide()
      })
    }
    const go = dir => () => { if (current) current.scrollBy({ left: dir * Math.max(120, current.clientWidth * 0.8), behavior: 'smooth' }) }
    left.addEventListener('click', go(-1))
    right.addEventListener('click', go(1))

    // Arrastar com o mouse (botão esquerdo). Depois de arrastar, o clique que
    // viria ao soltar é ignorado, para não abrir o card sem querer
    let drag = null
    let suppressClick = false
    const onDown = e => {
      if (e.button !== 0 || e.target?.closest?.('input, textarea, select, [contenteditable="true"], [data-desktop-scroll-ui]')) return
      const el = findScroller(e.target)
      if (!el) return
      drag = { el, x: e.clientX, start: el.scrollLeft, moved: false }
    }
    const onDrag = e => {
      if (!drag) return
      const dx = e.clientX - drag.x
      if (!drag.moved && Math.abs(dx) < 6) return
      if (!drag.moved) { drag.moved = true; drag.el.style.scrollSnapType = 'none'; drag.el.style.cursor = 'grabbing'; document.body.style.userSelect = 'none' }
      drag.el.scrollLeft = drag.start - dx
      e.preventDefault()
    }
    const onUp = () => {
      if (!drag) return
      if (drag.moved) {
        suppressClick = true
        setTimeout(() => { suppressClick = false }, 0)
        drag.el.style.scrollSnapType = ''
        drag.el.style.cursor = ''
        document.body.style.userSelect = ''
      }
      drag = null
    }
    const onClick = e => { if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false } }
    const onDragStart = e => { if (drag?.moved) e.preventDefault() }

    document.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', onUp)
    document.addEventListener('click', onClick, true)
    document.addEventListener('dragstart', onDragStart, true)
    window.addEventListener('scroll', () => place(), { passive: true, capture: true })
    window.addEventListener('resize', place)
    left.addEventListener('mouseleave', scheduleHide)
    right.addEventListener('mouseleave', scheduleHide)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onDrag)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('dragstart', onDragStart, true)
      window.removeEventListener('resize', place)
      left.remove()
      right.remove()
    }
  }, [])
  return null
}
