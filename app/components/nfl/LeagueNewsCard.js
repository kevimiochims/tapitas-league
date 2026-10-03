'use client'

import { useEffect, useState } from 'react'
import { CardShell, FilterPill, ToggleChip, TeamLogo, PositionBadge, Pager, usePager, SkeletonRows } from '../ui'
import { EmptyNote, NewsImage, NewsHero } from './shared'
import { useFocusFilter } from '../../context/TeamFocus'
import { useEspnId } from '../PlayerCutout'

function timeAgo(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Últimas notícias sobre jogadores dos elencos da liga. A primeira com foto
// aparece em destaque (foto grande com o título por cima); as outras com miniatura.
export default function LeagueNewsCard({ onOpenPlayer, initialLimit = 5, sidebar = true }) {
  const [state, setState] = useState({ news: [], loading: true, failed: false })

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
  const { visible, totalPages, pagerProps, listProps } = usePager(news, initialLimit, `${team}|${filter}`)
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
      {state.loading ? <div className="py-2"><SkeletonRows rows={4} /></div> : news.length === 0 ? <EmptyNote>{team === 'All' ? 'No recent news on Tapitas players.' : `No recent news on ${team} players.`}</EmptyNote> : (
        <div className="pb-1">
          {(() => {
            const firstPage = pagerProps.page === 0
            const hero = firstPage ? visible.find(n => n.image) : null
            const meta = n => [n.player?.name, n.source, n.published && timeAgo(n.published)].filter(Boolean).join(' · ')
            // Card largo (aba Player News): destaque + 3 manchetes ao lado e, embaixo,
            // o resto em duas colunas (sem vão embaixo da foto).
            // Card estreito (coluna lateral, celular): tudo empilhado.
            const rest = visible.filter(n => n !== hero)
            const side = hero ? rest.slice(0, 3) : []
            const more = hero ? rest.slice(3) : rest
            const row = n => (
              <div key={n.id || n.url || n.headline} className={`flex h-[76px] items-center gap-2.5 px-3 py-2.5 lg:px-4 ${n === hero ? '@3xl:hidden' : ''}`}>
                {/* Foto da notícia; sem ela, o jogador recortado sobre o fundo da
                    marca, no mesmo retângulo (todas as linhas no mesmo formato) */}
                {(n.image || n.player?.id) && (
                  <button type="button" onClick={() => onOpenPlayer?.(n.player && { ...n.player, focus: 'news' }, n.player?.fantasyTeam)} className="relative flex-shrink-0" aria-label={n.player?.name}>
                    {n.image
                      ? <span className="block h-[46px] w-[68px] overflow-hidden rounded-md bg-[#F4F5F7]"><NewsImage src={n.image} className="h-full w-full" /></span>
                      : <PlayerTile id={n.player.id} name={n.player.name} />}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  {n.url
                    ? <a href={n.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#111] hover:text-[#02275F]">{n.headline}</a>
                    : <div className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#111]">{n.headline}</div>}
                  <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-[#6B7280]">
                    <button type="button" onClick={() => onOpenPlayer?.(n.player && { ...n.player, focus: 'news' }, n.player?.fantasyTeam)} className="truncate font-medium text-[#3F4757] hover:text-[#D01F2D]">{n.player?.name}</button>
                    <PositionBadge position={n.player?.pos} />
                    {n.player?.fantasyTeam && <TeamLogo name={n.player.fantasyTeam} size={14} />}
                    {n.others?.length > 0 && (
                      // Outros jogadores da liga na notícia: só os logos dos times, sobrepostos
                      <span className="flex flex-shrink-0 items-center rounded-full bg-[#F1F2F4] py-px pl-0.5 pr-1" title={n.others.map(p => `${p.name} (${p.fantasyTeam})`).join(', ')}>
                        {n.others.slice(0, 3).map((p, i) => (
                          <span key={p.id || p.name} className={`rounded-full bg-white ring-1 ring-white ${i ? '-ml-1' : ''}`}><TeamLogo name={p.fantasyTeam} size={12} /></span>
                        ))}
                        <span className="ml-0.5 text-[10px] font-semibold text-[#6B7280]">+{n.others.length}</span>
                      </span>
                    )}
                    <span className="ml-auto flex-shrink-0">{[n.source, n.published && timeAgo(n.published)].filter(Boolean).join(' · ')}</span>
                  </div>
                </div>
              </div>
            )
            return (
              // Card lateral: sempre o espaço de uma página cheia (linhas de 76px),
              // então a última página não encolhe o card
              <div {...listProps} style={sidebar ? { minHeight: initialLimit * 76 } : listProps.style} className="@container">
                <div className={hero ? '@3xl:grid @3xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] @3xl:items-center' : ''}>
                  {/* Destaque com foto só no card largo; no estreito ele vira uma linha
                      comum, para todas as páginas terem a mesma altura */}
                  {hero && <div className="hidden px-3 pb-2.5 pt-2.5 lg:px-4 @3xl:block @3xl:pr-0"><NewsHero item={hero} meta={meta(hero)} /></div>}
                  {hero && row(hero)}
                  {side.length > 0 && <div>{side.map(row)}</div>}
                </div>
                {more.length > 0 && <div className={`grid grid-cols-1 @3xl:grid-cols-2 ${hero ? '@3xl:border-t @3xl:border-[#F1F2F4]' : ''}`}>{more.map(row)}</div>}
              </div>
            )
          })()}
          {totalPages > 1 && <Pager {...pagerProps} />}
        </div>
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
    <span className="relative block h-[46px] w-[68px] overflow-hidden rounded-md bg-[#02275F]">
      <span className="pointer-events-none absolute -bottom-3 left-1/2 h-10 w-14 -translate-x-1/2 rounded-full bg-white/15 blur-md" />
      <img
        src={cutout ? `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png` : `https://sleepercdn.com/content/nfl/players/${id}.jpg`}
        alt={name || ''}
        onError={() => cutout && setFailed(true)}
        className={cutout ? 'absolute bottom-0 left-1/2 h-[44px] w-auto max-w-none -translate-x-1/2 object-contain' : 'h-full w-full object-cover object-top'}
        draggable={false}
      />
    </span>
  )
}
