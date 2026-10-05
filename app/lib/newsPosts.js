'use client'

// Lista de notícias da Tapitas News compartilhada entre a News, a Home e a
// página da matéria: quem carregou primeiro guarda (memória + sessionStorage) e
// a matéria abre na hora com esses dados, atualizando em segundo plano.
const KEY = 'tapitas-news-posts'
let memory = null

const byDate = list => [...list].sort((a, b) => new Date(b.date) - new Date(a.date))

export function cachedNewsPosts() {
  if (memory) return memory
  if (typeof window === 'undefined') return null
  try {
    const saved = window.sessionStorage.getItem(KEY)
    if (saved) memory = JSON.parse(saved)
  } catch {}
  return memory
}

export async function loadNewsPosts() {
  const res = await fetch('/api/news')
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('Unexpected news response')
  memory = byDate(data)
  try { window.sessionStorage.setItem(KEY, JSON.stringify(memory)) } catch {}
  return memory
}
