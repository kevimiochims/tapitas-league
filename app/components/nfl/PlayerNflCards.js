'use client'

import { useEffect, useState } from 'react'
import { usePlayerNews } from './useNflData'
import { NewsImage, NewsHero } from './shared'
import NewsReader from './NewsReader'

function Card({ title, subtitle, children }) {
  return (
    <section className="overflow-hidden rounded-xl bg-white">
      <div className="px-3 pb-2 pt-3 sm:px-4">
        <h3 className="text-[15px] font-bold leading-tight text-[#111]">{title}</h3>
        {subtitle && <div className="mt-0.5 text-[12px] text-[#6B7280]">{subtitle}</div>}
      </div>
      <div className="mx-3 border-t border-[#E6E8EB] sm:mx-4" />
      {children}
    </section>
  )
}

function Empty({ children }) {
  return <div className="px-3 py-8 text-center text-[13px] text-[#6B7280] sm:px-4">{children}</div>
}

function timeAgo(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Últimas manchetes do jogador. Celular: destaque + lista. Telas médias e
// grandes: grade de cards do mesmo tamanho (2 ou 3 por linha), sem vãos.
// Tocar numa notícia abre o leitor dentro do site.
export function PlayerNewsCard({ playerId, emptyText }) {
  const { data, loading, error } = usePlayerNews(playerId)
  const news = data?.news || []
  const [reading, setReading] = useState(null)
  // Foto de jogo do jogador para as notícias sem foto
  const [playerPhoto, setPlayerPhoto] = useState(null)
  const needsPhoto = news.slice(0, 12).some((n, i, arr) => !n.image || arr.findIndex(x => x.image === n.image) !== i)
  useEffect(() => {
    if (!playerId || !needsPhoto) return
    let cancelled = false
    fetch(`/api/nfl/player-photos?ids=${encodeURIComponent(playerId)}`)
      .then(r => (r.ok ? r.json() : {}))
      .then(map => { if (!cancelled) setPlayerPhoto(map?.[playerId] || null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [playerId, needsPhoto])

  if (!playerId || error || (!loading && !news.length)) {
    return emptyText ? <Card title="Latest news" subtitle="ESPN, RotoWire, RotoBaller, FantasyPros and more"><Empty>{emptyText}</Empty></Card> : null
  }
  // Foto repetida em várias notícias (a ESPN usa a mesma em vários textos)
  // só vale na primeira; nas outras entra uma foto alternativa do jogador
  const seenImages = new Set()
  // Sempre da mais nova para a mais antiga (data inválida vai para o fim) e
  // com chave única: duas notícias com o mesmo id faziam o React trocar a
  // ordem dos cards na grade
  const time = n => { const t = new Date(n.published || 0).getTime(); return Number.isNaN(t) ? 0 : t }
  const list = [...news].sort((a, b) => time(b) - time(a)).slice(0, 12).map((n, i) => ({ ...n, key: `${n.id || n.headline}|${i}` })).map(n => {
    if (!n.image) return n
    if (seenImages.has(n.image)) return { ...n, image: null }
    seenImages.add(n.image)
    return n
  })
  const meta = n => [n.source, n.published && timeAgo(n.published)].filter(Boolean).join(' · ')
  // Notícias sem foto recebem fotos diferentes do jogador, em rodízio
  const alts = playerPhoto?.alts?.length ? playerPhoto.alts : playerPhoto ? [playerPhoto] : []
  const noImage = list.filter(n => !n.image)
  const altOf = n => (alts.length ? alts[noImage.indexOf(n) % alts.length] : null)
  const imageOf = n => n.image || altOf(n)?.url || null
  // Destaque do celular: sempre a notícia mais recente (com a foto dela ou,
  // sem foto, a do jogador). Antes era a primeira com foto própria, e uma
  // matéria antiga da ESPN passava na frente das notas mais novas
  const hero = list[0] && imageOf(list[0]) ? list[0] : null
  return (
    <Card title="Latest news" subtitle="ESPN, RotoWire, RotoBaller, FantasyPros and more">
      {loading ? <div className="px-3 py-4 text-[13px] text-[#6B7280] sm:px-4">Loading…</div> : (
        <div className="@container">
          {/* Celular: destaque em cima */}
          {hero && <div className="px-3 pb-1 pt-3 sm:px-4 @2xl:hidden"><NewsHero item={{ ...hero, image: imageOf(hero) }} meta={meta(hero)} onClick={e => { e.preventDefault(); setReading(hero) }} /></div>}
          {/* Telas maiores: grade alinhada; todo card tem a área da foto (sem foto,
              entra a do jogador sobre o azul), então nenhum fica mais baixo */}
          <div className="divide-y divide-[#F1F2F4] @2xl:grid @2xl:grid-cols-2 @2xl:gap-3 @2xl:divide-y-0 @2xl:p-3 @4xl:grid-cols-3">
            {list.map(n => (
              <button
                key={n.key}
                type="button"
                onClick={() => setReading(n)}
                className={`group flex w-full gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#F7F8FA] sm:px-4 @2xl:h-full @2xl:flex-col @2xl:gap-0 @2xl:overflow-hidden @2xl:rounded-xl @2xl:bg-[#F6F7F9] @2xl:p-0 @2xl:hover:bg-[#EEF0F2] ${n === hero ? 'hidden @2xl:flex' : ''}`}
              >
                {imageOf(n) ? (
                  <span className="block h-[54px] w-[80px] flex-shrink-0 overflow-hidden rounded-md bg-[#E6E8EB] @2xl:aspect-[16/9] @2xl:h-auto @2xl:w-full @2xl:rounded-none">
                    <NewsImage src={imageOf(n)} className="h-full w-full object-[50%_25%]" />
                  </span>
                ) : (
                  // Sem foto: só nas telas maiores, a foto do jogador no azul da marca
                  <span className="hidden aspect-[16/9] w-full items-end justify-center overflow-hidden bg-[#02275F] @2xl:flex">
                    <img src={`https://sleepercdn.com/content/nfl/players/${encodeURIComponent(playerId)}.jpg`} alt="" className="h-[85%] object-contain" onError={e => { e.currentTarget.style.display = 'none' }} />
                  </span>
                )}
                <div className="min-w-0 flex-1 @2xl:px-3 @2xl:pb-3 @2xl:pt-2.5">
                  <div className="text-[13px] font-semibold leading-snug text-[#111] group-hover:text-[#02275F] @2xl:line-clamp-3">{n.headline}</div>
                  {n.description && <div className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-[#6B7280]">{n.description}</div>}
                  <div className="mt-1 text-[11px] text-[#9CA3AF]">{meta(n)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {reading && <NewsReader item={reading} photo={reading.image ? null : altOf(reading)?.url} photoCredit={reading.image ? '' : altOf(reading)?.credit || ''} onClose={() => setReading(null)} />}
    </Card>
  )
}
