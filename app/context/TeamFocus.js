'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

// Time "em foco" do site inteiro (o filtro geral do header). Fica salvo no
// navegador e vira o padrão dos filtros de time das páginas. '' = todos.
const KEY = 'tapitas.team'
const listeners = new Set()

export function getTeamFocus() {
  try { return (typeof window !== 'undefined' && window.localStorage.getItem(KEY)) || '' } catch { return '' }
}

export function setTeamFocus(team) {
  try {
    if (team) window.localStorage.setItem(KEY, team)
    else window.localStorage.removeItem(KEY)
  } catch {}
  listeners.forEach(l => l())
}

function subscribe(listener) {
  listeners.add(listener)
  const onStorage = e => { if (e.key === KEY) listener() }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage) }
}

export function useTeamFocus() {
  const team = useSyncExternalStore(subscribe, getTeamFocus, () => '')
  return [team, setTeamFocus]
}

// Filtro de time local que começa no time em foco. Se o usuário mudar o
// filtro na página, vale a escolha dele até o time em foco mudar de novo.
export function useFocusFilter(allValue = 'All') {
  const [focus] = useTeamFocus()
  const [local, setLocal] = useState({ focus: null, value: null })
  const value = local.focus === focus && local.value != null ? local.value : (focus || allValue)
  const set = useCallback(v => setLocal({ focus: getTeamFocus(), value: v }), [])
  return [value, set]
}
