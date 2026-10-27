// Mídia das notícias da Tapitas News (capa e imagens dentro do texto): foto,
// GIF ou vídeo. Tudo é exibido direto da origem (YouTube, Drive, Giphy...),
// nunca passando o vídeo pelo servidor do site.
//
// Formatos aceitos:
//   - YouTube (watch, youtu.be, shorts, live): player do YouTube.
//   - Google Drive (link de compartilhamento): player do próprio Drive.
//   - /api/pr-photo/ID: foto do Drive servida pelo site; ?gif=1 = GIF animado;
//     ?video=1 = vídeo (ou GIF grande) no player do Drive.
//   - Giphy (página ou link do GIF): o GIF em si.
//   - Arquivo de vídeo (.mp4, .webm, .mov, .m4v): player do navegador.
//   - Qualquer outro link: imagem (foto ou GIF).

const YOUTUBE = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i
const DRIVE = /(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?(?:[^#]*&)?id=|uc\?(?:[^#]*&)?id=)([\w-]{10,})/i
const SITE_DRIVE = /\/api\/pr-photo\/([\w-]{10,})(?:\?([^#]*))?/
const GIPHY_PAGE = /^https?:\/\/(?:www\.)?giphy\.com\/(?:gifs|clips|embed)\/([\w-]+)/i
const VIDEO_FILE = /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i

export function parseMedia(raw) {
  const url = String(raw || '').trim()
  if (!url) return null
  let m = url.match(YOUTUBE)
  if (m) return { kind: 'youtube', id: m[1], thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` }
  m = url.match(SITE_DRIVE)
  if (m) {
    const thumb = url.replace(/\?.*$/, '')
    if (/(?:^|&)video=1/.test(m[2] || '')) return { kind: 'drive', id: m[1], thumb }
    return { kind: 'image', src: url, thumb }
  }
  m = url.match(DRIVE)
  if (m) return { kind: 'drive', id: m[1], thumb: `/api/pr-photo/${m[1]}` }
  m = url.match(GIPHY_PAGE)
  if (m) {
    const src = `https://media.giphy.com/media/${m[1].split('-').pop()}/giphy.gif`
    return { kind: 'image', src, thumb: src }
  }
  if (VIDEO_FILE.test(url)) return { kind: 'video', src: url, thumb: '' }
  return { kind: 'image', src: url, thumb: url }
}

// Miniatura para listas e cards (primeira mídia da célula imageUrl). Vídeo
// solto (.mp4) não tem miniatura: devolve ''.
export const mediaThumb = raw => parseMedia(String(raw || '').split('|')[0])?.thumb || ''
