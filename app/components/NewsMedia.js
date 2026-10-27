import { parseMedia } from '../lib/media'

// Foto, GIF ou vídeo de uma notícia (ver app/lib/media.js). Só usa <span> e
// elementos de texto, porque também aparece dentro de parágrafos do Markdown.
export default function NewsMedia({ url, alt = '', className = '' }) {
  const media = parseMedia(url)
  if (!media) return null
  if (media.kind === 'youtube' || media.kind === 'drive') {
    const src = media.kind === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${media.id}?rel=0&playsinline=1`
      : `https://drive.google.com/file/d/${media.id}/preview`
    return (
      <span className={`relative block aspect-video w-full overflow-hidden bg-black ${className}`}>
        <iframe
          src={src}
          title={alt || 'Vídeo'}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </span>
    )
  }
  if (media.kind === 'video') {
    return <video src={media.src} controls playsInline preload="metadata" className={`block w-full bg-black ${className}`} />
  }
  return <img src={media.src} alt={alt} className={`block h-auto w-full bg-[#F4F5F7] ${className}`} />
}
