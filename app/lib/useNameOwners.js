'use client'

import { useEffect, useState } from 'react'
import { buildNameOwners } from './factsNames'

// _PLAYER_CACHE buscada uma vez por página, para separar homônimos no perfil
let ownersPromise = null

export function useNameOwners() {
  const [owners, setOwners] = useState(null)
  useEffect(() => {
    let cancelled = false
    if (!ownersPromise) {
      ownersPromise = fetch('/api/sheet/_PLAYER_CACHE')
        .then(r => (r.ok ? r.json() : []))
        .then(rows => buildNameOwners(Array.isArray(rows) ? rows : []))
        .catch(() => { ownersPromise = null; return new Map() })
    }
    ownersPromise.then(map => { if (!cancelled) setOwners(map) })
    return () => { cancelled = true }
  }, [])
  return owners
}
