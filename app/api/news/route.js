// Notícias vêm do Apps Script da planilha (aba MEMES). A resposta fica no
// cache de dados do Next por até 1 dia (etiqueta NEWS_TAG), então o Apps Script
// (doGet) só é chamado quando o cache vence ou quando o Apps Script avisa que
// entrou notícia nova (/api/news/refresh limpa a etiqueta).

import { NEWS_TAG } from '@/app/lib/newsTag'

const NEWS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQ0H5cbeMhSM8OXKTkoNoqEwZkMG93EiUcJNyNOsK6e-JoRRhQ13OuqhUDpJMq8zB0/exec'
const NEWS_TTL = 60 // cache do CDN; o dado em si fica no cache do Next

let lastGood = null

async function fetchNews() {
  const res = await fetch(NEWS_SCRIPT_URL, { next: { revalidate: 86400, tags: [NEWS_TAG] }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`Apps Script ${res.status}`)
  const json = await res.json()
  if (!Array.isArray(json)) throw new Error('Apps Script returned a non-array')
  return json
    // Ignora linhas vazias da planilha
    .filter(post => post && (post.title || post.slug))
}

export async function GET() {
  try {
    if (!lastGood || Date.now() - lastGood.at >= NEWS_TTL * 1000) {
      lastGood = { posts: await fetchNews(), at: Date.now() }
    }
  } catch (err) {
    console.error('[api/news]', err)
    if (!lastGood) return Response.json({ error: 'Failed to load news' }, { status: 502 })
  }

  return Response.json(lastGood.posts, {
    headers: {
      'Cache-Control': `public, s-maxage=${NEWS_TTL}, stale-while-revalidate=86400, stale-if-error=86400`,
    },
  })
}
