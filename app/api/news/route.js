// Notícias vêm do Apps Script da planilha (aba MEMES). Cache curto para que
// uma notícia publicada pelo Form apareça no site em cerca de 1 minuto.

const NEWS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQ0H5cbeMhSM8OXKTkoNoqEwZkMG93EiUcJNyNOsK6e-JoRRhQ13OuqhUDpJMq8zB0/exec'
const NEWS_TTL = 60

let lastGood = null

async function fetchNews() {
  const res = await fetch(NEWS_SCRIPT_URL, { cache: 'no-store', signal: AbortSignal.timeout(20000) })
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
