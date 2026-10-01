'use client'

import { useEffect, useState } from 'react'

// Foto recortada (fundo transparente) do jogador, da ESPN. O ID da ESPN vem
// do Sleeper (rota /api/nfl/espn-ids, baixada uma vez por página).
let idsPromise = null
function loadEspnIds() {
  if (!idsPromise) {
    idsPromise = fetch('/api/nfl/espn-ids')
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => { idsPromise = null; return {} })
  }
  return idsPromise
}

export function useEspnId(sleeperId) {
  const [ids, setIds] = useState(null)
  useEffect(() => {
    let cancelled = false
    loadEspnIds().then(map => { if (!cancelled) setIds(map) })
    return () => { cancelled = true }
  }, [])
  return sleeperId && ids ? ids[String(sleeperId)] || null : null
}

// Mostra o recorte da ESPN; sem ele, cai para a foto do Sleeper (ou nada).
// `className` define o tamanho (ex.: "h-[150px]"); a largura acompanha.
export default function PlayerCutout({ sleeperId, name, className = 'h-[140px]', fallback = true }) {
  const espnId = useEspnId(sleeperId)
  const [failed, setFailed] = useState(false)
  const src = espnId && !failed
    ? `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`
    : fallback && sleeperId ? `https://sleepercdn.com/content/nfl/players/${sleeperId}.jpg` : null
  if (!src) return null
  const isCutout = espnId && !failed
  return (
    <img
      src={src}
      alt={name || ''}
      onError={() => (isCutout ? setFailed(true) : null)}
      className={`pointer-events-none select-none object-contain object-bottom ${isCutout ? '' : 'rounded-full'} ${className}`}
      draggable={false}
    />
  )
}
