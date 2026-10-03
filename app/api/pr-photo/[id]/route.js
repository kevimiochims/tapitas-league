// Foto personalizada de um card do Power Rankings, guardada no Google Drive
// (enviada pelo Google Form; o Apps Script deixa o arquivo público por link).
// O site busca a miniatura do Drive e serve com cache, para não depender do
// visualizador do Drive nem expor o link original.
export async function GET(_request, { params }) {
  const { id } = await params
  if (!/^[\w-]{10,200}$/.test(String(id || ''))) {
    return new Response('Invalid id', { status: 400 })
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
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
      },
    })
  } catch (err) {
    console.error('[api/pr-photo]', err)
    return new Response('Photo not available', { status: 502 })
  }
}
