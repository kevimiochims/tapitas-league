'use client'

import { useEffect, useState } from 'react'

// Busca compartilhada: vários cards usam /api/nfl/league, então a mesma
// requisição é reaproveitada enquanto a página estiver aberta.
const shared = new Map()

function loadShared(url) {
  if (!shared.has(url)) {
    shared.set(url, fetch(url)
      .then(r => { if (!r.ok) throw new Error(`${url} → ${r.status}`); return r.json() })
      .catch(err => { shared.delete(url); throw err }))
  }
  return shared.get(url)
}

function useSharedJson(url) {
  const [state, setState] = useState({ data: null, loading: Boolean(url), error: null })
  useEffect(() => {
    if (!url) return
    let cancelled = false
    loadShared(url)
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch(error => { if (!cancelled) setState({ data: null, loading: false, error }) })
    return () => { cancelled = true }
  }, [url])
  return state
}

export const useLeagueStatus = () => useSharedJson('/api/nfl/league')
export const useTrending = () => useSharedJson('/api/nfl/trending')
export const usePlayerNews = id => useSharedJson(id ? `/api/nfl/player-news?id=${encodeURIComponent(id)}` : null)
