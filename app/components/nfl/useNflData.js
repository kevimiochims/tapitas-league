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
export const usePlayerAdvanced = id => useSharedJson(id ? `/api/nfl/player-advanced?id=${encodeURIComponent(id)}` : null)

// Placar da NFL: uma única busca compartilhada entre a faixa e os cards,
// atualizada a cada 60s enquanto houver jogo em andamento.
const board = { state: { data: null, loading: true, error: null }, listeners: new Set(), timer: null, started: false }

function setBoard(next) {
  board.state = next
  board.listeners.forEach(fn => fn(next))
}

function pollBoard() {
  fetch('/api/nfl/scoreboard', { cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error(`scoreboard → ${r.status}`); return r.json() })
    .then(data => {
      setBoard({ data, loading: false, error: null })
      if (data?.live && board.listeners.size) board.timer = setTimeout(pollBoard, 60000)
      else board.started = false
    })
    .catch(error => {
      setBoard({ data: board.state.data, loading: false, error })
      board.started = false
    })
}

export function useScoreboard() {
  const [state, setState] = useState(board.state)
  useEffect(() => {
    board.listeners.add(setState)
    if (!board.started) { board.started = true; pollBoard() }
    return () => {
      board.listeners.delete(setState)
      if (!board.listeners.size) { clearTimeout(board.timer); board.started = false }
    }
  }, [])
  return state
}
