'use client'

import { useEffect, useRef, useState } from 'react'
import { CardShell, FilterPill, ToggleChip, TeamLogo, PositionBadge, Pager, usePager, SkeletonRows } from '../ui'
import { EmptyNote, NewsImage } from './shared'
import { useFocusFilter } from '../../context/TeamFocus'
import { useEspnId } from '../PlayerCutout'
import NewsReader from './NewsReader'

function timeAgo(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const ROW_H = 92 // altura fixa de cada linha (manchete em 2 linhas + jogador + fonte)

// Últimas notícias sobre jogadores dos elencos da liga. O formato acompanha a
// largura do card:
//   - estreito (coluna lateral, celular): lista de linhas, `initialLimit` por página;
//   - médio: a notícia em destaque à esquerda, da mesma altura das 4 ao lado;
//   - largo: destaque + 8 notícias em duas colunas ao lado.
// Sem filtro de time, todas as páginas têm a mesma altura (a de uma página
// cheia); filtrando um time, o card encolhe para o que houver.
export default function LeagueNewsCard({ onOpenPlayer, initialLimit = 5, sidebar = true }) {
  const [state, setState] = useState({ news: [], loading: true, failed: false })
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const layout = width >= 1100 ? 'wide' : width >= 640 ? 'medium' : 'narrow'
  const SIDE_ROWS = 4
  const sideCols = layout === 'wide' ? 2 : 1
  const pageSize = layout === 'narrow' ? initialLimit : 1 + SIDE_ROWS * sideCols

  useEffect(() => {
    let cancelled = false
    fetch('/api/nfl/league-news')
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then(d => { if (!cancelled) setState({ news: d?.news || [], loading: false, failed: false }) })
      .catch(() => { if (!cancelled) setState({ news: [], loading: false, failed: true }) })
    return () => { cancelled = true }
  }, [])

  // Mesmos filtros do Injury report: titulares/todos e franquia
  const [team, setTeam] = useFocusFilter('All')
  const [filter, setFilter] = useState('all')
  // Uma notícia pode citar vários jogadores da liga (ex.: relatório de lesões):
  // ela entra no filtro de todos os times envolvidos, e o jogador mostrado é o
  // do time filtrado (ou o primeiro citado); os outros viram logos ao lado
  const playersOf = n => (n.players?.length ? n.players : [n.player]).filter(Boolean)
  const teams = Array.from(new Set(state.news.flatMap(n => playersOf(n).map(p => p.fantasyTeam)).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  const news = state.news
    .map(n => {
      const all = playersOf(n)
      const inTeam = team === 'All' ? all : all.filter(p => p.fantasyTeam === team)
      const pool = filter === 'starters' ? inTeam.filter(p => p.starter) : inTeam
      if (!pool.length) return null
      const main = pool[0]
      return { ...n, player: main, others: all.filter(p => p !== main) }
    })
    .filter(Boolean)
  const teamCount = team === 'All' ? state.news.length : state.news.filter(n => playersOf(n).some(p => p.fantasyTeam === team)).length
  const { visible, totalPages, pagerProps, listProps } = usePager(news, pageSize, `${team}|${filter}|${pageSize}`)
  const fixedHeight = team === 'All' // sem filtro de time: altura de uma página cheia

  // Notícias sem foto: foto de jogo do jogador (Drive → ESPN → Commons), buscada
  // só para as linhas visíveis; enquanto não chega, fica o recorte do jogador
  const [playerPhotos, setPlayerPhotos] = useState({})
  // Notícia aberta no leitor (pop-up dentro do site)
  const [reading, setReading] = useState(null)
  // (inclui o destaque das telas maiores, que também precisa de foto)
  const missingIds = visible.filter(n => !n.image && n.player?.id && !(n.player.id in playerPhotos)).map(n => n.player.id)
  const missingKey = Array.from(new Set(missingIds)).join(',')
  useEffect(() => {
    if (!missingKey) return
    let cancelled = false
    fetch(`/api/nfl/player-photos?ids=${missingKey}`)
      .then(r => (r.ok ? r.json() : {}))
      .then(map => { if (!cancelled) setPlayerPhotos(prev => ({ ...prev, ...Object.fromEntries(missingKey.split(',').map(id => [id, map?.[id] || null])) })) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [missingKey])
  if (state.failed) return null

  return (
    <CardShell
      title="Player news"
      subtitle="Headlines on Tapitas players"
      sidebar={sidebar}
      withMenus
    >
      {!state.loading && (
        <div className="flex items-center gap-1.5 px-3 pb-1 pt-2.5 lg:px-4">
          <ToggleChip active={filter === 'starters'} onClick={() => setFilter('starters')}>Starters</ToggleChip>
          <ToggleChip active={filter === 'all'} onClick={() => setFilter('all')}>All ({teamCount})</ToggleChip>
          {teams.length > 0 && <div className="ml-auto min-w-0"><FilterPill value={team} onChange={setTeam} options={['All', ...teams]} label="Team" allLabel="All teams" align="right" /></div>}
        </div>
      )}
      <div ref={wrapRef}>
      {state.loading ? <div className="py-2"><SkeletonRows rows={4} /></div> : news.length === 0 ? <EmptyNote>{team === 'All' ? 'No recent news on Tapitas players.' : `No recent news on ${team} players.`}</EmptyNote> : (
        <div className="pb-1">
          {(() => {
            const photoOf = n => n.image || (n.player?.id ? playerPhotos[n.player.id]?.url : null) || null
            const openPlayer = p => onOpenPlayer?.(p && { ...p, focus: 'news' }, p?.fantasyTeam)
            const thumb = n => (
              <button type="button" onClick={() => setReading(n)} className="relative flex-shrink-0" aria-label={n.headline}>
                {n.image
                  ? <span className="block h-[50px] w-[74px] overflow-hidden rounded-md bg-[#F4F5F7]"><NewsImage src={n.image} className="h-full w-full" /></span>
                  : n.player?.id && playerPhotos[n.player.id]?.url
                    ? <span className="block h-[50px] w-[74px] overflow-hidden rounded-md bg-[#F4F5F7]"><img src={playerPhotos[n.player.id].url} alt={n.player.name || ''} className="h-full w-full object-cover object-[50%_25%]" /></span>
                    : n.player?.id ? <PlayerTile id={n.player.id} name={n.player.name} /> : null}
              </button>
            )
            // Linha: manchete (2 linhas) / jogador, posição e times / fonte e horário
            const row = (n, pad = 'px-3 lg:px-4') => (
              <div key={n.id || n.url || n.headline} className={`flex items-center gap-2.5 py-2 ${pad}`} style={{ height: ROW_H }}>
                {thumb(n)}
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => setReading(n)} className="line-clamp-2 text-left text-[13px] font-semibold leading-snug text-[#111] hover:text-[#02275F]">{n.headline}</button>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]">
                    <button type="button" onClick={() => openPlayer(n.player)} className="min-w-0 truncate font-medium text-[#3F4757] hover:text-[#D01F2D]">{n.player?.name}</button>
                    <span className="flex-shrink-0"><PositionBadge position={n.player?.pos} /></span>
                    {n.player?.fantasyTeam && <span className="flex-shrink-0"><TeamLogo name={n.player.fantasyTeam} size={14} /></span>}
                    {n.others?.length > 0 && (
                      // Outros jogadores da liga na notícia: só os logos dos times, sobrepostos
                      <span className="flex flex-shrink-0 items-center rounded-full bg-[#F1F2F4] py-px pl-0.5 pr-1" title={n.others.map(p => `${p.name} (${p.fantasyTeam})`).join(', ')}>
                        {n.others.slice(0, 3).map((p, i) => (
                          <span key={p.id || p.name} className={`rounded-full bg-white ring-1 ring-white ${i ? '-ml-1' : ''}`}><TeamLogo name={p.fantasyTeam} size={12} /></span>
                        ))}
                        <span className="ml-0.5 text-[10px] font-semibold text-[#6B7280]">+{n.others.length}</span>
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-[#9CA3AF]">{[n.source, n.published && timeAgo(n.published)].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            )

            if (layout === 'narrow') {
              return (
                <div {...listProps} style={fixedHeight ? { minHeight: pageSize * ROW_H } : undefined}>
                  {visible.map(n => row(n))}
                </div>
              )
            }

            // Médio/largo: destaque (primeira notícia da página) da altura da lista ao lado
            const [hero, ...rest] = visible
            const sideHeight = SIDE_ROWS * ROW_H
            const heroPhoto = photoOf(hero)
            return (
              <div {...listProps} className="flex gap-3 px-3 pt-2 lg:px-4" style={{ minHeight: fixedHeight ? sideHeight + 8 : undefined }}>
                <button
                  type="button"
                  onClick={() => setReading(hero)}
                  className={`group relative flex-shrink-0 overflow-hidden rounded-lg bg-[#16274F] text-left ${layout === 'wide' ? 'w-[36%]' : 'w-[46%]'}`}
                  style={{ height: fixedHeight ? sideHeight : Math.max(ROW_H * 2, Math.ceil(rest.length / sideCols) * ROW_H) }}
                >
                  {heroPhoto && <img src={heroPhoto} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover object-[50%_25%] transition-transform duration-300 group-hover:scale-[1.03]" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="line-clamp-3 text-[17px] font-extrabold leading-tight text-white">{hero.headline}</div>
                    <div className="mt-1 truncate text-[11px] font-medium text-white/75">{[hero.player?.name, hero.source, hero.published && timeAgo(hero.published)].filter(Boolean).join(' · ')}</div>
                  </div>
                </button>
                <div className={`min-w-0 flex-1 ${sideCols === 2 ? 'grid grid-cols-2 content-start' : ''}`}>
                  {rest.map(n => row(n, sideCols === 2 ? 'pr-3' : 'pr-0'))}
                </div>
              </div>
            )
          })()}
          {totalPages > 1 && <Pager {...pagerProps} />}
        </div>
      )}
      </div>
      {reading && (
        <NewsReader
          item={reading}
          photo={reading.player?.id ? playerPhotos[reading.player.id]?.url : null}
          photoCredit={reading.player?.id ? playerPhotos[reading.player.id]?.credit || '' : ''}
          onClose={() => setReading(null)}
          onOpenPlayer={onOpenPlayer}
        />
      )}
    </CardShell>
  )
}

// Retângulo do jogador para notícia sem foto: recorte da ESPN sobre o azul da
// marca; sem recorte, a foto do Sleeper preenchendo o retângulo
function PlayerTile({ id, name }) {
  const espnId = useEspnId(id)
  const [failed, setFailed] = useState(false)
  const cutout = espnId && !failed
  return (
    <span className="relative block h-[50px] w-[74px] overflow-hidden rounded-md bg-[#02275F]">
      <span className="pointer-events-none absolute -bottom-3 left-1/2 h-10 w-14 -translate-x-1/2 rounded-full bg-white/15 blur-md" />
      <img
        src={cutout ? `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png` : `https://sleepercdn.com/content/nfl/players/${id}.jpg`}
        alt={name || ''}
        onError={() => cutout && setFailed(true)}
        className={cutout ? 'absolute bottom-0 left-1/2 h-[48px] w-auto max-w-none -translate-x-1/2 object-contain' : 'h-full w-full object-cover object-top'}
        draggable={false}
      />
    </span>
  )
}
