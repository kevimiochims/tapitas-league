'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { BrandBackdrop, TeamLogo, StreakBadge, getTeamAbbr } from './ui'
import PlayerCutout from './PlayerCutout'

// Card do Power Rankings no formato dos posts antigos do Instagram: foto no
// topo com a posição, nome do time, campanha, subida/queda, o texto da semana
// e, embaixo, média de pontos, próximo adversário e retrospecto contra ele.
// A foto é o recorte do destaque do time na semana (maior pontuador).
const matchupLink = (season, week, team, opp) =>
  `/matchups?season=${encodeURIComponent(season)}&week=${encodeURIComponent(week)}&team=${encodeURIComponent(team)}&opp=${encodeURIComponent(opp)}`

export default function PowerCard({ team, next, h2h, star, prevRank, tierColor, markdownComponents, history = [], totalTeams = 10, photo = null, credit = '', season, week, expanded = false, onToggleExpanded }) {
  // Read more / Show less vale para todos os cards (estado vem da página)
  const open = expanded
  const up = team.delta > 0
  const down = team.delta < 0
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#E6E8EB] bg-white">
      {/* Foto: destaque do time na semana sobre o fundo da marca */}
      <div className="relative h-[210px] overflow-hidden text-white sm:h-[230px]">
        <BrandBackdrop />
        {/* Brilho atrás do jogador */}
        <div className="pointer-events-none absolute bottom-[-40%] left-1/2 h-[120%] w-[90%] -translate-x-1/2 rounded-full bg-white/10 blur-2xl" />
        {photo ? (
          // Foto do jogo (automática, das notícias da ESPN) ou escolhida pela
          // liga no Google Form (aba PR_FOTOS)
          <img src={photo} alt={team.team} className="absolute inset-0 h-full w-full object-cover object-[50%_25%]" />
        ) : star?.id && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <PlayerCutout sleeperId={star.id} name={star.name} className="h-[200px] sm:h-[220px]" fallback={false} />
          </div>
        )}
        <div className="absolute right-3 top-3 rounded-full bg-white/95 p-1 shadow-lg"><TeamLogo name={team.team} size={34} /></div>
        {photo && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />}
        {/* Crédito exigido pelas fotos livres (Wikimedia Commons) */}
        {photo && credit && <div className="absolute left-2 top-2 max-w-[62%] truncate rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-white/80" title={credit}>{credit}</div>}
        {star && (
          <div className="absolute bottom-3 right-3 max-w-[48%] rounded-lg bg-black/45 px-2 py-1 text-right backdrop-blur-sm">
            <div className="truncate text-[11px] font-semibold">{star.label}</div>
            <div className="text-[10px] tabular-nums text-white/75">{star.pts.toFixed(2)} pts this week</div>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white text-[26px] font-black italic tabular-nums shadow-lg" style={{ background: tierColor || '#02275F' }}>
          {team.rank}
        </div>
      </div>

      {/* Time, campanha e movimento */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[20px] font-bold leading-tight text-[#111]">{team.team}</h3>
          <span className="flex-shrink-0 text-[18px] font-bold tabular-nums text-[#111]">({team.wins}-{team.losses})</span>
          <span className={`flex-shrink-0 text-[14px] font-bold tabular-nums ${up ? 'text-[#1E8E3E]' : down ? 'text-[#D01F2D]' : 'text-[#9CA3AF]'}`}>
            {up ? `▲ ${team.delta}` : down ? `▼ ${Math.abs(team.delta)}` : '–'}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[12px] text-[#6B7280]">
          {team.streak && <StreakBadge streak={team.streak} />}
          <span>Last week: <span className="font-semibold text-[#111]">{prevRank ? `#${prevRank}` : '–'}</span></span>
          {team.opponent ? (
            <Link href={matchupLink(season, week, team.team, team.opponent)} className="ml-auto whitespace-nowrap hover:text-[#1D5FD1] hover:underline">This week: <span className={`font-semibold ${team.result === 'W' ? 'text-[#1E8E3E]' : team.result === 'L' ? 'text-[#D01F2D]' : 'text-[#111]'}`}>{team.result || '–'}</span> vs {getTeamAbbr(team.opponent) || team.opponent}</Link>
          ) : <span className="ml-auto whitespace-nowrap">This week: <span className={`font-semibold ${team.result === 'W' ? 'text-[#1E8E3E]' : team.result === 'L' ? 'text-[#D01F2D]' : 'text-[#111]'}`}>{team.result || '–'}</span> vs {getTeamAbbr(team.opponent) || team.opponent}</span>}
        </div>
      </div>

      {history.length > 1 && <RankHistory history={history} total={totalTeams} />}

      {/* Texto da semana (abre por inteiro no "Read more") */}
      {team.note && (
        <div className="mx-4 mt-3 rounded-xl bg-[#F6F7F9] px-3 py-2.5 text-justify text-[13px] leading-relaxed text-[#2F3542] hyphens-auto" lang="pt-BR">
          {/* Fechado: 5 linhas (todos os cards com a mesma altura). Aberto: o
              texto inteiro, e o rodapé vem logo abaixo (cada card com a sua altura) */}
          <div className={open ? '' : 'line-clamp-5 min-h-[106px]'}>
            <ReactMarkdown components={markdownComponents}>{team.note}</ReactMarkdown>
          </div>
          <button type="button" onClick={() => onToggleExpanded?.()} className="mt-1 text-[12px] font-semibold text-[#1D5FD1] hover:underline">
            {open ? 'Show less' : 'Read more'}
          </button>
        </div>
      )}

      {/* Rodapé: média, próximo adversário e retrospecto contra ele */}
      <div className="mt-3 grid grid-cols-3 border-t border-[#EEF0F2] text-center">
        <div className="px-1 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">PPG</div>
          <div className="mt-0.5 text-[14px] font-bold tabular-nums text-[#111]">{team.avgPF.toFixed(1)} <span className="text-[11px] font-medium text-[#9CA3AF]">#{team.avgRank}</span></div>
        </div>
        {next ? (
          <Link href={matchupLink(season, next.week, team.team, next.team)} className="border-l border-[#EEF0F2] px-1 py-2.5 transition-colors hover:bg-[#F6F7F9]">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">Next</div>
            <div className="mt-0.5 flex items-center justify-center gap-1 text-[14px] font-bold text-[#111]">
              <TeamLogo name={next.team} size={16} />{getTeamAbbr(next.team) || next.team}
              <span className="text-[11px] font-medium tabular-nums text-[#9CA3AF]">({next.wins}-{next.losses})</span>
            </div>
          </Link>
        ) : (
          <div className="border-l border-[#EEF0F2] px-1 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">Next</div>
            <div className="mt-0.5 text-[14px] font-bold text-[#9CA3AF]">–</div>
          </div>
        )}
        {next ? (
          <Link href={`/rivalries?teamA=${encodeURIComponent(team.team)}&teamB=${encodeURIComponent(next.team)}`} className="border-l border-[#EEF0F2] px-1 py-2.5 transition-colors hover:bg-[#F6F7F9]">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">H2H</div>
            {h2h && h2h.aWins + h2h.bWins > 0 ? (
              <div className="mt-0.5 flex items-center justify-center gap-1 text-[14px] font-bold tabular-nums text-[#111]">
                {h2h.aWins}-{h2h.bWins} <StreakBadge streak={h2h.streak} />
              </div>
            ) : <div className="mt-0.5 text-[12px] font-medium text-[#9CA3AF]">First meeting</div>}
          </Link>
        ) : (
          <div className="border-l border-[#EEF0F2] px-1 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">H2H</div>
            <div className="mt-0.5 text-[12px] font-medium text-[#9CA3AF]">–</div>
          </div>
        )}
      </div>
    </article>
  )
}

// Histórico do ranking na temporada em uma linha compacta: cada semana é um
// ponto com a posição (1 no alto); a semana atual em destaque.
const TIER_DOT = r => (r === 1 ? '#B8860B' : r <= 3 ? '#1E8E3E' : r <= 6 ? '#02275F' : '#D01F2D')

function RankHistory({ history, total }) {
  const n = history.length
  const ranks = history.map(h => h.rank)
  const best = Math.min(...ranks)
  const worst = Math.max(...ranks)
  const x = i => (n === 1 ? 50 : 4 + (i / (n - 1)) * 92)
  // Escala entre a melhor e a pior posição da temporada (mínimo de 3 posições),
  // para a linha usar a altura toda sem exagerar variações pequenas
  const lo = Math.max(1, Math.min(best, worst - 2))
  const hi = Math.min(Math.max(total, worst), Math.max(worst, lo + 2))
  const y = r => 20 + ((r - lo) / Math.max(1, hi - lo)) * 60
  return (
    <div className="mx-4 mt-3">
      <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
        <span className="font-medium">Ranking history</span>
        <span>best <span className="font-semibold text-[#111]">#{best}</span> · worst <span className="font-semibold text-[#111]">#{worst}</span></span>
      </div>
      <div className="relative mt-0.5 h-[35px]">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <polyline points={history.map((h, i) => `${x(i)},${y(h.rank)}`).join(' ')} fill="none" stroke="#CBD2DB" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        {history.map((h, i) => {
          const last = i === n - 1
          return (
            <span
              key={h.week}
              title={`Week ${h.week}: #${h.rank}`}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-bold tabular-nums ${last ? 'h-[17px] min-w-[17px] text-[10px] text-white' : 'h-[13px] min-w-[13px] bg-white text-[8px] ring-1'}`}
              style={{ left: `${x(i)}%`, top: `${y(h.rank)}%`, background: last ? TIER_DOT(h.rank) : undefined, color: last ? undefined : TIER_DOT(h.rank), '--tw-ring-color': last ? undefined : '#CBD2DB' }}
            >
              {h.rank}
            </span>
          )
        })}
      </div>
    </div>
  )
}
