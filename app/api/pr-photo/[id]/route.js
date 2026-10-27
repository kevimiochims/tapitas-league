// Foto personalizada de um card do Power Rankings, guardada no Google Drive
// (enviada pelo Google Form; o Apps Script deixa o arquivo público por link).
// O site busca a miniatura do Drive e serve com cache, para não depender do
// visualizador do Drive nem expor o link original.
//
// ?gif=1: GIF animado das notícias. A miniatura do Drive é só o primeiro
// quadro, então aqui vai o arquivo original, repassado direto (sem processar)
// e guardado no CDN. Só para GIF de até GIF_MAX_BYTES; maior que isso, ou se o
// Drive não devolver um GIF, cai na miniatura parada. GIF grande ou vídeo vão
// pelo player do Drive (?video=1, tratado na página, nunca por aqui).

const GIF_MAX_BYTES = 4 * 1024 * 1024
const CACHE = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800'

async function originalGif(id) {
  try {
    const res = await fetch(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`, {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
    const type = res.headers.get('content-type') || ''
    const declared = Number(res.headers.get('content-length') || 0)
    if (res.ok && type.startsWith('image/gif') && declared <= GIF_MAX_BYTES) {
      // Lê no máximo GIF_MAX_BYTES (o Drive nem sempre informa o tamanho)
      const chunks = []
      let size = 0
      const reader = res.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > GIF_MAX_BYTES) { reader.cancel(); break }
        chunks.push(value)
      }
      if (size > 0 && size <= GIF_MAX_BYTES) {
        return new Response(new Blob(chunks, { type: 'image/gif' }), { headers: { 'Content-Type': 'image/gif', 'Cache-Control': CACHE } })
      }
    } else {
      res.body?.cancel()
    }
    console.warn('[api/pr-photo] GIF original indisponível, usando a miniatura', id, type, declared)
  } catch (err) {
    console.warn('[api/pr-photo] GIF original falhou, usando a miniatura', id, err?.message)
  }
  return null
}

export async function GET(request, { params }) {
  const { id } = await params
  if (!/^[\w-]{10,200}$/.test(String(id || ''))) {
    return new Response('Invalid id', { status: 400 })
  }
  if (new URL(request.url).searchParams.get('gif') === '1') {
    const gif = await originalGif(id)
    if (gif) return gif
  }
  try {
    const res = await fetch(`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const type = res.headers.get('content-type') || ''
    if (!res.ok || !type.startsWith('image/')) {
      return new Response('Photo not available', { status: 404 })
    }
    return new Response(await res.arrayBuffer(), {
      headers: {
        'Content-Type': type,
        'Cache-Control': CACHE,
      },
    })
  } catch (err) {
    console.error('[api/pr-photo]', err)
    return new Response('Photo not available', { status: 502 })
  }
}
