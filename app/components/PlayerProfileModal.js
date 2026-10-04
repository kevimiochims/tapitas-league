'use client'

// Player Profile compartilhado pelas páginas Teams, Players e Matchups.
// Quando aberto a partir de um confronto (prop `matchup`), mostra também os
// números do jogador naquela semana e o retrospecto contra aquele adversário.

import { useEffect, useRef, useState } from 'react'
import { PlayerNewsCard } from './nfl/PlayerNflCards'
import { PlayerTransactionsCard } from './Transactions'
import { ChevronDown, Check } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────
function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeTeamName(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function isDoubleWeekValue(week) {
  const w = String(week || '')
  return w.includes('-') || w.includes('&')
}

function extractPlayerAppearances(game, max = 13) {
  const appearances = []
  for (let i = 1; i <= max; i++) {
    const starterName = game?.[`S${i}_Name`]
    if (starterName && starterName !== '--empty--' && String(starterName).trim()) {
      appearances.push({ name: String(starterName).trim(), status: 'Starter', pts: parseNumber(game?.[`S${i}_Pts`]) })
    }
    const benchName = game?.[`B${i}_Name`]
    if (benchName && benchName !== '--empty--' && String(benchName).trim()) {
      appearances.push({ name: String(benchName).trim(), status: 'Bench', pts: parseNumber(game?.[`B${i}_Pts`]) })
    }
  }
  return appearances
}

function formatSeasonList(seasons) {
  const years = Array.from(new Set((seasons || []).map(Number).filter(Number.isFinite))).sort((a, b) => a - b)
  if (!years.length) return '—'
  const parts = []
  let start = years[0]
  let end = years[0]
  const pushRange = (from, to) => {
    const fromLabel = `'${String(from).slice(-2)}`
    const toLabel = `'${String(to).slice(-2)}`
    if (to - from >= 2) parts.push(`${fromLabel} - ${toLabel}`)
    else if (to - from === 1) parts.push(fromLabel, toLabel)
    else parts.push(fromLabel)
  }
  for (let i = 1; i < years.length; i += 1) {
    if (years[i] === end + 1) end = years[i]
    else { pushRange(start, end); start = end = years[i] }
  }
  pushRange(start, end)
  return parts.join(', ')
}

const TEAM_IMAGES = {
  'howmuch': '/images/howmuch.png',
  'i am megatron': '/images/megatron.png',
  'moneyball': '/images/moneyball.png',
  'ocupa e resiste': '/images/ocupa.png',
  'oldbrady': '/images/oldbrady.png',
  'patrolao squad': '/images/patrolao.png',
  'pequers verde': '/images/pequers.png',
  'peytao da massa': '/images/peytao.png',
  'rincao settlers': '/images/rincao.png',
  'h-lera do mahl': '/images/hlera.png',
}

const TEAM_SHORT_NAMES = {
  'i am megatron': 'Megatron',
  'h-lera do mahl': 'H-Lera',
  'peytao da massa': 'Peytao',
  'ocupa & resiste': 'Ocupa',
  'ocupa e resiste': 'Ocupa',
  'pequers verde': 'Pequers',
  'rincao settlers': 'Rincão',
  'old brady': 'OldBrady',
  'oldbrady': 'OldBrady',
  'moneyball': 'Moneyball',
  'patrolao': 'Patrolao',
  'patrolao squad': 'Patrolao',
  'how much': 'Howmuch',
  'howmuch': 'Howmuch',
  'howmuchyoutruck': 'Howmuch',
  'hangover football club': 'Hangover FC',
  'porto alegre coelhos': 'PA Coelhos',
  'santa cruz frangos': 'SC Frangos',
  'seguidores de charlao': 'Seg de Charlao',
  'canoas andres limas': 'Canoas A Limas',
  'rj skipknows': 'RJ SkipKnows',
  'rjskipknows': 'RJ SkipKnows',
  '4winclutch': '4WinClutch',
}

function shortName(name) {
  return TEAM_SHORT_NAMES[normalizeTeamName(name)] || String(name || '').trim()
}

function getInitials(name) {
  return String(name || '?').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

function TeamAvatar({ name, size = 22 }) {
  const src = TEAM_IMAGES[normalizeTeamName(name)]
  if (src) {
    return <img src={src} alt={name} className="flex-shrink-0 object-contain" style={{ width: size, height: size }} />
  }
  return (
    <div className="flex flex-shrink-0 items-center justify-center rounded-full bg-[#16274F] font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {getInitials(name)}
    </div>
  )
}

const NFL_TEAM_NAME_MAP = {
  'cardinals': 'ari', 'arizona': 'ari', 'arizona cardinals': 'ari',
  'falcons': 'atl', 'atlanta': 'atl', 'atlanta falcons': 'atl',
  'ravens': 'bal', 'baltimore': 'bal', 'baltimore ravens': 'bal',
  'bills': 'buf', 'buffalo': 'buf', 'buffalo bills': 'buf',
  'panthers': 'car', 'carolina': 'car', 'carolina panthers': 'car',
  'bears': 'chi', 'chicago': 'chi', 'chicago bears': 'chi',
  'bengals': 'cin', 'cincinnati': 'cin', 'cincinnati bengals': 'cin',
  'browns': 'cle', 'cleveland': 'cle', 'cleveland browns': 'cle',
  'cowboys': 'dal', 'dallas': 'dal', 'dallas cowboys': 'dal',
  'broncos': 'den', 'denver': 'den', 'denver broncos': 'den',
  'lions': 'det', 'detroit': 'det', 'detroit lions': 'det',
  'packers': 'gb', 'green bay': 'gb', 'green bay packers': 'gb',
  'texans': 'hou', 'houston': 'hou', 'houston texans': 'hou',
  'colts': 'ind', 'indianapolis': 'ind', 'indianapolis colts': 'ind',
  'jaguars': 'jax', 'jacksonville': 'jax', 'jacksonville jaguars': 'jax',
  'chiefs': 'kc', 'kansas city': 'kc', 'kansas city chiefs': 'kc',
  'chargers': 'lac', 'los angeles chargers': 'lac', 'la chargers': 'lac',
  'rams': 'lar', 'los angeles rams': 'lar', 'la rams': 'lar',
  'raiders': 'lv', 'las vegas': 'lv', 'las vegas raiders': 'lv', 'oakland': 'lv', 'oakland raiders': 'lv',
  'dolphins': 'mia', 'miami': 'mia', 'miami dolphins': 'mia',
  'vikings': 'min', 'minnesota': 'min', 'minnesota vikings': 'min',
  'patriots': 'ne', 'new england': 'ne', 'new england patriots': 'ne',
  'saints': 'no', 'new orleans': 'no', 'new orleans saints': 'no',
  'giants': 'nyg', 'new york giants': 'nyg', 'ny giants': 'nyg',
  'jets': 'nyj', 'new york jets': 'nyj', 'ny jets': 'nyj',
  'eagles': 'phi', 'philadelphia': 'phi', 'philadelphia eagles': 'phi',
  'steelers': 'pit', 'pittsburgh': 'pit', 'pittsburgh steelers': 'pit',
  'seahawks': 'sea', 'seattle': 'sea', 'seattle seahawks': 'sea',
  '49ers': 'sf', 'san francisco': 'sf', 'san francisco 49ers': 'sf',
  'buccaneers': 'tb', 'tampa bay': 'tb', 'tampa bay buccaneers': 'tb',
  'titans': 'ten', 'tennessee': 'ten', 'tennessee titans': 'ten',
  'commanders': 'wsh', 'washington': 'wsh', 'washington commanders': 'wsh',
  'redskins': 'wsh', 'washington redskins': 'wsh', 'football team': 'wsh', 'washington football team': 'wsh',
}
const NFL_ABBRS = new Set(Object.values(NFL_TEAM_NAME_MAP))

function getNflAbbr(nameOrAbbr) {
  const raw = String(nameOrAbbr || '').toLowerCase()
    .replace(/\b(d\/st|dst|def|defense|special teams)\b/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!raw) return null
  if (NFL_TEAM_NAME_MAP[raw]) return NFL_TEAM_NAME_MAP[raw]
  const abbr = raw === 'was' ? 'wsh' : raw
  return NFL_ABBRS.has(abbr) ? abbr : null
}

function getNFLTeamLogo(nameOrAbbr) {
  const abbr = getNflAbbr(nameOrAbbr)
  return abbr ? `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png` : null
}

function getPositionBadgeClasses(position) {
  const colors = {
    QB: 'bg-[#D01F2D] text-white',
    RB: 'bg-[#1E8E3E] text-white',
    WR: 'bg-[#16274F] text-white',
    TE: 'bg-[#B8860B] text-white',
    FLEX: 'bg-[#3F4757] text-white',
    K: 'bg-[#6B7280] text-white',
    DEF: 'bg-[#3F4757] text-white',
  }
  return colors[String(position || '').toUpperCase()] || 'bg-[#F4F5F7] text-[#3F4757]'
}

// years_exp do Sleeper conta temporadas completas: quem estreou em 2025 tem 1
// durante 2026, que é a 2ª temporada dele. Mostramos a temporada atual.
function nflSeasonLabel(yearsExp) {
  if (yearsExp == null || yearsExp === '') return 'Exp —'
  const n = Number(yearsExp) + 1
  if (n === 1) return 'Rookie'
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')
  return `${n}${suffix} season`
}

// ── Sleeper (cache em módulo para não baixar os mesmos dados de novo) ──
let SLEEPER_PLAYERS_PROMISE = null
// Elencos atuais da liga (para mostrar quem tem o jogador hoje)
let LEAGUE_ROSTERS_PROMISE = null
function fetchLeagueRosters() {
  if (!LEAGUE_ROSTERS_PROMISE) {
    LEAGUE_ROSTERS_PROMISE = fetch('/api/nfl/league').then(r => (r.ok ? r.json() : null)).then(d => d?.teams || []).catch(() => { LEAGUE_ROSTERS_PROMISE = null; return [] })
  }
  return LEAGUE_ROSTERS_PROMISE
}
const SLEEPER_WEEKLY_PROMISES = new Map()
const SLEEPER_PLAYER_WEEKLY_PROMISES = new Map()
const SLEEPER_SCHEDULE_PROMISES = new Map()

function cachedFetch(cache, key, url) {
  if (!cache.has(key)) {
    const promise = fetch(url)
      .then(r => { if (!r.ok) throw new Error(`Sleeper request failed: ${r.status}`); return r.json() })
      .catch(e => { cache.delete(key); throw e })
    cache.set(key, promise)
  }
  return cache.get(key)
}

function fetchSleeperPlayers() {
  if (!SLEEPER_PLAYERS_PROMISE) {
    SLEEPER_PLAYERS_PROMISE = fetch('https://api.sleeper.app/v1/players/nfl')
      .then(r => { if (!r.ok) throw new Error(`Sleeper players request failed: ${r.status}`); return r.json() })
      .catch(e => { SLEEPER_PLAYERS_PROMISE = null; throw e })
  }
  return SLEEPER_PLAYERS_PROMISE
}

const fetchSleeperWeeklyStats = (season, week, seasonType) =>
  cachedFetch(SLEEPER_WEEKLY_PROMISES, `${season}:${seasonType}:${week}`, `https://api.sleeper.app/v1/stats/nfl/${seasonType}/${encodeURIComponent(season)}/${encodeURIComponent(week)}`)

const fetchSleeperPlayerWeeklyStats = (playerId, season, seasonType) =>
  cachedFetch(SLEEPER_PLAYER_WEEKLY_PROMISES, `${playerId}:${season}:${seasonType}`, `https://api.sleeper.com/stats/nfl/player/${encodeURIComponent(playerId)}?season=${encodeURIComponent(season)}&season_type=${encodeURIComponent(seasonType)}&grouping=week`)

const fetchSleeperRegularSchedule = season =>
  cachedFetch(SLEEPER_SCHEDULE_PROMISES, String(season), `https://api.sleeper.app/schedule/nfl/regular/${encodeURIComponent(season)}`)

function getSleeperNflOpponent(schedule, team, week) {
  const t = String(team || '').toUpperCase()
  const w = Number.parseInt(String(week || '').split(/[-–]/)[0], 10)
  if (!t || !Number.isFinite(w) || !Array.isArray(schedule)) return null
  const game = schedule.find(g => Number(g?.week) === w && (String(g?.home || '').toUpperCase() === t || String(g?.away || '').toUpperCase() === t))
  if (!game) return null
  const opponent = String(game.home || '').toUpperCase() === t ? game.away : game.home
  return opponent ? String(opponent).toLowerCase() : null
}

// ── Estatísticas da semana (card do matchup) ─────────────────────────
function formatCompactPlayerStatGroups(stats, pos) {
  if (!stats) return []
  const n = key => Number(stats?.[key] ?? 0)
  const groups = []
  const add = (label, items) => {
    const valid = items.filter(Boolean)
    if (valid.length) groups.push({ label, items: valid })
  }
  const p = String(pos || '').toUpperCase()
  const rush = () => add('RUSH', [
    n('rush_att') ? { value: n('rush_att'), label: 'CAR' } : null,
    n('rush_yd') ? { value: n('rush_yd'), label: 'YDS' } : null,
    n('rush_td') ? { value: n('rush_td'), label: 'TD' } : null,
  ])
  const rec = () => add('REC', [
    n('rec_tgt') ? { value: n('rec_tgt'), label: 'TAR' } : null,
    n('rec') ? { value: n('rec'), label: 'REC' } : null,
    n('rec_yd') ? { value: n('rec_yd'), label: 'YDS' } : null,
    n('rec_td') ? { value: n('rec_td'), label: 'TD' } : null,
  ])

  if (p === 'QB') {
    add('PASS', [
      (n('pass_cmp') || n('pass_att')) ? { value: `${n('pass_cmp')}/${n('pass_att')}`, label: 'CMP/ATT' } : null,
      n('pass_yd') ? { value: n('pass_yd'), label: 'YDS' } : null,
      n('pass_td') ? { value: n('pass_td'), label: 'TD' } : null,
      n('pass_int') ? { value: n('pass_int'), label: 'INT' } : null,
    ])
    rush()
  } else if (p === 'RB') {
    rush(); rec()
  } else if (p === 'WR' || p === 'TE' || p === 'FLEX') {
    rec(); rush()
  } else if (p === 'K') {
    add('KICK', [
      (n('fgm') || n('fga')) ? { value: `${n('fgm')}/${n('fga')}`, label: 'FG' } : null,
      (n('xpm') || n('xpa')) ? { value: `${n('xpm')}/${n('xpa')}`, label: 'XP' } : null,
      n('fg_long') ? { value: n('fg_long'), label: 'LONG' } : null,
    ])
  } else if (p === 'DEF') {
    // Sleeper team-defense (DEF/DST) usa as chaves curtas sack / int / safe / def_td;
    // os nomes alternativos ficam como fallback para payloads antigos.
    const stat = (...keys) => {
      for (const key of keys) {
        const value = Number(stats?.[key] ?? 0)
        if (Number.isFinite(value) && value !== 0) return value
      }
      return 0
    }
    const sack = stat('sack', 'dst_sacks', 'def_sack', 'idp_sack')
    const int = stat('int', 'dst_int', 'def_int', 'idp_int')
    const ff = stat('ff', 'fum_force', 'dst_fum_force', 'idp_ff', 'idp_fum_force', 'def_ff')
    const safe = stat('safe', 'dst_safety', 'def_safety', 'idp_safety', 'idp_safe')
    const td = stat('def_td', 'dst_td', 'idp_td')
    add('DEF', [
      sack ? { value: sack, label: 'SACK' } : null,
      int ? { value: int, label: 'INT' } : null,
      ff ? { value: ff, label: 'FF' } : null,
      safe ? { value: safe, label: 'SAFETY' } : null,
      td ? { value: td, label: 'TD' } : null,
    ])
  }
  return groups
}

const STAT_GROUP_LABELS = { PASS: 'Passing', RUSH: 'Rushing', REC: 'Receiving', KICK: 'Kicking', DEF: 'Defense' }

// Altura do título do card Game Log (título + subtítulo + divisória)
const GAME_LOG_HEADER_PX = 64

// Card branco no padrão das páginas (título + subtítulo + divisória).
function ProfileCard({ title, subtitle, right, children }) {
  return (
    <section className="overflow-hidden rounded-xl bg-white">
      <div className="flex items-end justify-between gap-3 px-3 pb-2 pt-3 sm:px-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-tight text-[#111]">{title}</h3>
          {subtitle && <div className="mt-0.5 text-[12px] text-[#6B7280]">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="mx-3 border-t border-[#E6E8EB] sm:mx-4" />
      {children}
    </section>
  )
}

function StatTile({ label, value }) {
  return (
    <div className="min-w-0 px-2.5 py-3 sm:px-4">
      <div className="truncate text-[11px] text-[#6B7280]">{label}</div>
      <div className="mt-0.5 whitespace-nowrap text-[17px] font-bold leading-tight tabular-nums text-[#111] sm:text-[20px]">{value}</div>
    </div>
  )
}

// ── Filtro no cabeçalho das colunas ──────────────────────────────────
function HeaderFilter({ value, onChange, options, label, displayOption }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const format = displayOption || (opt => opt)
  const active = value !== 'All'
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(p => !p)} className={`inline-flex items-center gap-1 hover:text-[#111] ${active ? 'font-semibold text-[#D01F2D]' : ''}`}>
        {active ? format(value) : label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''} ${active ? 'text-[#D01F2D]' : 'text-[#9CA3AF]'}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[180px] overflow-hidden rounded-lg bg-white py-1 text-left shadow-lg ring-1 ring-black/5">
          <div className="max-h-56 overflow-y-auto">
            {options.map(opt => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false) }} className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-normal hover:bg-[#F4F5F7] ${opt === value ? 'font-semibold text-[#111]' : 'text-[#3F4757]'}`}>
                <span className="truncate">{opt === 'All' ? 'All' : format(opt)}</span>
                {opt === value && <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#D01F2D]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ResultBadge({ result }) {
  const r = String(result || '').toUpperCase()
  if (!r) return <span className="text-[12px] text-[#9CA3AF]">—</span>
  const color = r === 'W' ? 'bg-[#1E8E3E]' : r === 'L' ? 'bg-[#D01F2D]' : 'bg-[#6B7280]'
  return <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold text-white ${color}`}>{r}</span>
}

function ProfilePhoto({ playerId, rawName, position, size = 72 }) {
  const [failed, setFailed] = useState(false)
  const isDefense = String(position || '').toUpperCase() === 'DEF'
  const src = isDefense
    ? getNFLTeamLogo(rawName)
    : (playerId && !failed ? `https://sleepercdn.com/content/nfl/players/${playerId}.jpg` : null)
  return (
    <div className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-white/30" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={rawName} onError={() => setFailed(true)} className={`h-full w-full ${isDefense ? 'object-contain p-2' : 'object-cover'}`} style={isDefense ? undefined : { objectPosition: '50% 18%' }} />
      ) : (
        <span className="font-semibold text-[#16274F]" style={{ fontSize: size * 0.3 }}>{getInitials(rawName)}</span>
      )}
    </div>
  )
}

// ── Modal ───────────────────────────────────────────────────────────
const DEFAULT_SORT = { key: 'season', dir: 'desc', seasonDir: 'desc', weekDir: 'desc', weekMode: 'within-season' }

/**
 * @param rawName     nome exato do jogador no GAME_FACTS_ALL (identidade)
 * @param displayName nome curto para exibição (fallback quando o Sleeper não responde)
 * @param position    posição (QB, RB, WR, TE, K, DEF)
 * @param playerId    id do Sleeper, resolvido por cada página com o próprio lookup
 * @param games       linhas do GAME_FACTS_ALL
 * @param initialTeams franquias pré-selecionadas (padrão: todas em que ele jogou)
 * @param initialSeasons temporadas pré-selecionadas (ex.: aberto como MVP de 2023)
 * @param matchup     { season, week, team, opponent } quando aberto de um confronto
 */
export default function PlayerProfileModal({ rawName, displayName, position, playerId, games, initialTeams, initialSeasons, matchup: originMatchup, initialTab, liveGame: originLiveGame, onClose }) {
  const pos = String(position || '').toUpperCase()
  const [sleeperInfo, setSleeperInfo] = useState(null)
  const [weeklyStats, setWeeklyStats] = useState(null)
  const [nflOpponent, setNflOpponent] = useState(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [opponentFilter, setOpponentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [resultFilter, setResultFilter] = useState('All')
  const [stageFilter, setStageFilter] = useState('All')
  const [sort, setSort] = useState(DEFAULT_SORT)
  // initialTab: 'news' quando o perfil é aberto a partir de uma lesão/notícia
  const [tab, setTab] = useState(initialTab || (originMatchup ? 'week' : 'career'))
  // Jogo escolhido na aba Week e adversário escolhido na aba vs
  const [pickedGame, setPickedGame] = useState(null)
  const [vsPick, setVsPick] = useState(null)
  // Time da liga que tem o jogador hoje (elencos atuais do Sleeper)
  const [rosteredBy, setRosteredBy] = useState(undefined)
  // Altura visível do corpo do perfil (o game log usa isso como altura máxima)
  const bodyRef = useRef(null)
  const [bodyHeight, setBodyHeight] = useState(0)
  useEffect(() => {
    const el = bodyRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const pad = parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom)
      setBodyHeight(Math.max(240, el.clientHeight - pad))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isSelf = name => String(name || '').trim() === rawName

  // Franquias da liga em que o jogador atuou.
  const clubs = (() => {
    const map = new Map()
    ;(games || []).forEach(g => {
      if (!extractPlayerAppearances(g).some(a => isSelf(a.name))) return
      const team = String(g?.Team || '').trim()
      if (!team) return
      const key = normalizeTeamName(team)
      if (!map.has(key)) map.set(key, { team, seasons: new Set() })
      map.get(key).seasons.add(String(g?.Season || '').trim())
    })
    const initialKeys = new Set((initialTeams || []).map(normalizeTeamName))
    return Array.from(map.values())
      .map(c => ({ ...c, seasons: Array.from(c.seasons).filter(Boolean).sort((a, b) => Number(a) - Number(b)) }))
      .sort((a, b) => {
        const aFirst = initialKeys.has(normalizeTeamName(a.team)) ? 0 : 1
        const bFirst = initialKeys.has(normalizeTeamName(b.team)) ? 0 : 1
        return aFirst - bFirst || normalizeTeamName(a.team).localeCompare(normalizeTeamName(b.team))
      })
  })()

  // Só as franquias do contexto em que ele de fato jogou (ex.: filtro de time
  // da página Players); nenhuma = todas
  const [selectedTeams, setSelectedTeams] = useState(() => {
    const keys = new Set((initialTeams || []).map(normalizeTeamName))
    const matched = clubs.filter(c => keys.has(normalizeTeamName(c.team))).map(c => c.team)
    return matched.length ? matched : null
  })
  const activeTeams = selectedTeams || clubs.map(c => c.team)
  const activeTeamKeys = new Set(activeTeams.map(normalizeTeamName))

  // Temporadas: só as das franquias selecionadas. "Todas" por padrão, ou a do
  // contexto em que o perfil foi aberto (ex.: MVP da temporada na History)
  const availableSeasons = Array.from(new Set(clubs.filter(c => activeTeamKeys.has(normalizeTeamName(c.team))).flatMap(c => c.seasons)))
    .sort((a, b) => Number(a) - Number(b))
  const [selectedSeasons, setSelectedSeasons] = useState(() => (initialSeasons && initialSeasons.length ? initialSeasons.map(String) : null))
  const chosenSeasons = (selectedSeasons || []).filter(s => availableSeasons.includes(s))
  const activeSeasons = chosenSeasons.length ? chosenSeasons : availableSeasons
  const allSeasons = activeSeasons.length === availableSeasons.length
  const activeSeasonSet = new Set(activeSeasons)
  // Com todas marcadas, tocar numa temporada mostra só ela; depois cada toque
  // liga/desliga (sempre fica pelo menos uma)
  const toggleSeason = season => setSelectedSeasons(() => {
    if (allSeasons) return [season]
    if (activeSeasonSet.has(season)) return activeSeasons.length === 1 ? null : activeSeasons.filter(s => s !== season)
    const next = [...activeSeasons, season]
    return next.length === availableSeasons.length ? null : next
  })

  const toggleTeam = team => setSelectedTeams(() => {
    const cur = activeTeams
    const key = normalizeTeamName(team)
    const exists = cur.some(t => normalizeTeamName(t) === key)
    if (exists) return cur.length === 1 ? cur : cur.filter(t => normalizeTeamName(t) !== key)
    return [...cur, team]
  })

  // Trava o scroll da página e fecha com Esc.
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  // Aparições do jogador (franquias e temporadas selecionadas), sem marcar o
  // jogo atual ainda
  const appearances = (games || []).flatMap(g => {
    const app = extractPlayerAppearances(g).find(a => isSelf(a.name))
    if (!app) return []
    const team = String(g?.Team || '').trim()
    if (!activeTeamKeys.has(normalizeTeamName(team))) return []
    const season = String(g?.Season || '').trim()
    if (!activeSeasonSet.has(season)) return []
    const week = String(g?.Week || '').trim()
    const opponent = String(g?.Opponent || '').trim()
    const doubleWeek = isDoubleWeekValue(week)
    return [{
      g, season, week, team, opponent,
      key: `${season}|${week}|${team}|${opponent}`,
      status: app.status,
      // O placar exibido é sempre o real; o ajustado (÷2 em rodada dupla)
      // serve só para AVG/BEST.
      pts: app.pts,
      adjustedPts: doubleWeek ? app.pts / 2 : app.pts,
      isDoubleWeek: doubleWeek,
      teamPF: parseNumber(g?.PF),
      result: String(g?.Result || '').trim().toUpperCase(),
      stage: String(g?.GameStage || '').trim(),
    }]
  })
  const byRecency = [...appearances].sort((a, b) => (Number(b.season) - Number(a.season)) || ((parseFloat(b.week) || 0) - (parseFloat(a.week) || 0)))
  // Jogo da aba Week: o escolhido no seletor; senão o confronto de onde o
  // perfil foi aberto; senão o jogo mais recente dele na liga
  const picked = pickedGame ? appearances.find(x => x.key === pickedGame) : null
  const matchup = picked
    ? { season: picked.season, week: picked.week, team: picked.team, opponent: picked.opponent }
    : originMatchup || (byRecency[0] ? { season: byRecency[0].season, week: byRecency[0].week, team: byRecency[0].team, opponent: byRecency[0].opponent } : null)
  // Pontos ao vivo só valem para o confronto de origem (semana em andamento)
  const liveGame = picked ? null : originLiveGame

  // Time da liga que tem o jogador hoje
  useEffect(() => {
    let cancelled = false
    if (!playerId) return undefined
    fetchLeagueRosters().then(teams => {
      if (cancelled) return
      const owner = (teams || []).find(t => (t.players || []).some(p => String(p.id) === String(playerId)))
      setRosteredBy(owner ? owner.team : null)
    }).catch(() => { if (!cancelled) setRosteredBy(null) })
    return () => { cancelled = true }
  }, [playerId])

  // Dados do Sleeper: cadastro do jogador e, se veio de um confronto, os
  // números daquela semana + adversário NFL histórico.
  useEffect(() => {
    let cancelled = false
    if (!playerId) {
      setSleeperInfo(null); setWeeklyStats(null); setNflOpponent(null); setLoadingInfo(false)
      return undefined
    }
    setLoadingInfo(true)

    const weeks = matchup ? String(matchup.week || '').split(/[-–]/).map(w => w.trim()).filter(Boolean) : []
    const numericWeeks = weeks.map(w => Number.parseInt(w, 10)).filter(Number.isFinite)
    // As semanas 15–17 de playoff da liga ainda são temporada regular da NFL.
    const seasonType = numericWeeks.some(w => w >= 18) ? 'post' : 'regular'

    Promise.all([
      fetchSleeperPlayers(),
      matchup ? fetchSleeperRegularSchedule(matchup.season).catch(() => []) : Promise.resolve([]),
      matchup ? Promise.all(weeks.map(w => fetchSleeperWeeklyStats(matchup.season, w, seasonType))).catch(() => []) : Promise.resolve([]),
      matchup ? fetchSleeperPlayerWeeklyStats(playerId, matchup.season, seasonType).catch(() => []) : Promise.resolve([]),
    ])
      .then(([players, schedule, weeklyList, playerWeekly]) => {
        if (cancelled) return
        const info = players?.[String(playerId)] || null

        const merged = {}
        ;(weeklyList || []).forEach(row => {
          const playerWeek = row?.[String(playerId)]
          if (!playerWeek || typeof playerWeek !== 'object') return
          Object.entries(playerWeek).forEach(([key, value]) => {
            const numeric = Number(value)
            if (Number.isFinite(numeric)) merged[key] = (merged[key] || 0) + numeric
          })
        })

        // O endpoint por jogador traz time/adversário históricos daquela
        // semana; o cadastro atual só serve de fallback.
        const rows = Array.isArray(playerWeekly) ? playerWeekly : (playerWeekly && typeof playerWeekly === 'object' ? Object.values(playerWeekly) : [])
        const weekRow = rows.find(row => numericWeeks.includes(Number.parseInt(String(row?.week ?? '').trim(), 10))) || null
        const historicalTeam = String(weekRow?.team || '').trim()
        const historicalOpp = String(weekRow?.opponent || '').trim().toLowerCase()

        setSleeperInfo(info ? { ...info, team: matchup && historicalTeam ? historicalTeam : info.team } : null)
        setWeeklyStats(Object.keys(merged).length ? merged : null)
        setNflOpponent(matchup ? (historicalOpp || getSleeperNflOpponent(schedule, historicalTeam || info?.team, matchup.week)) : null)
      })
      .catch(() => { if (!cancelled) { setSleeperInfo(null); setWeeklyStats(null) } })
      .finally(() => { if (!cancelled) setLoadingInfo(false) })
    return () => { cancelled = true }
  }, [playerId, matchup?.season, matchup?.week])

  // Semana em andamento: as estatísticas da semana são buscadas de novo a cada
  // 15s (endpoint do próprio jogador, pequeno), sem o cache do módulo
  const isLiveWeek = Boolean(liveGame)
  useEffect(() => {
    if (!isLiveWeek || !playerId || !matchup) return
    let cancelled = false
    const week = Number.parseInt(String(matchup.week || '').split(/[-–]/)[0], 10)
    const refresh = () => {
      fetch(`https://api.sleeper.com/stats/nfl/player/${encodeURIComponent(playerId)}?season=${encodeURIComponent(matchup.season)}&season_type=regular&grouping=week&_=${Date.now()}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (cancelled || !data) return
          const rows = Array.isArray(data) ? data : Object.values(data)
          const row = rows.find(r => Number.parseInt(String(r?.week ?? ''), 10) === week)
          if (row?.stats && Object.keys(row.stats).length) setWeeklyStats(row.stats)
        })
        .catch(() => {})
    }
    const timer = setInterval(refresh, 15000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [isLiveWeek, playerId, matchup?.season, matchup?.week])

  const matchupWeeks = matchup ? String(matchup.week || '').split(/[-–]/).map(w => w.trim()).filter(Boolean) : []
  const isMatchupGame = (season, week, team, opponent) => {
    if (!matchup) return false
    const gameWeeks = String(week || '').split(/[-–]/).map(w => w.trim()).filter(Boolean)
    return season === String(matchup.season || '').trim()
      && matchupWeeks.some(w => gameWeeks.includes(w))
      && normalizeTeamName(team) === normalizeTeamName(matchup.team)
      && normalizeTeamName(opponent) === normalizeTeamName(matchup.opponent)
  }

  // Todas as aparições do jogador nas franquias selecionadas.
  const profileGames = appearances.map(x => ({ ...x, isCurrent: isMatchupGame(x.season, x.week, x.team, x.opponent) }))

  const summarize = rows => {
    const forAvg = rows.filter(x => !(x.status === 'Bench' && x.adjustedPts === 0))
    const total = forAvg.reduce((s, x) => s + x.adjustedPts, 0)
    const starts = rows.filter(x => x.status === 'Starter').length
    return {
      apps: rows.length,
      starts,
      bench: rows.length - starts,
      avg: forAvg.length ? total / forAvg.length : 0,
      best: rows.filter(x => !x.isDoubleWeek).reduce((m, x) => Math.max(m, x.adjustedPts), 0),
      seasons: Array.from(new Set(rows.map(x => x.season))),
    }
  }
  const stats = summarize(profileGames)

  // Retrospecto contra um adversário (o do jogo, ou o escolhido no seletor),
  // nas franquias selecionadas
  const vsOpponent = vsPick || matchup?.opponent || null
  const opponentsFaced = Array.from(new Set(profileGames.map(x => x.opponent).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  const versusGames = vsOpponent
    ? profileGames
        .filter(x => normalizeTeamName(x.opponent) === normalizeTeamName(vsOpponent))
        .sort((a, b) => (Number(b.season) - Number(a.season)) || ((parseFloat(b.week) || 0) - (parseFloat(a.week) || 0)))
    : []
  const versus = vsOpponent ? summarize(versusGames) : null
  // Semana já na planilha: pontos dela. Semana em andamento: pontos ao vivo
  // que a página Matchups passa em `liveGame` (Sleeper).
  const currentGame = matchup
    ? (games || []).map(g => {
        const app = extractPlayerAppearances(g).find(a => isSelf(a.name))
        return app && isMatchupGame(String(g?.Season || '').trim(), String(g?.Week || '').trim(), g?.Team, g?.Opponent) ? app : null
      }).find(Boolean) || (liveGame ? { name: rawName, pts: Number(liveGame.pts) || 0, status: liveGame.status, proj: liveGame.proj } : null)
    : null
  const weeklyGroups = formatCompactPlayerStatGroups(weeklyStats, pos)

  const profileTabs = [
    ...(matchup ? [['week', `Week ${matchup.week}`], ['opponent', `vs ${shortName(vsOpponent)}`]] : []),
    ['career', 'Career'],
    ['news', 'News'],
    ['transactions', 'Transactions'],
  ]

  const options = key => ['All', ...Array.from(new Set(profileGames.map(x => x[key]).filter(Boolean))).sort()]
  const filtered = profileGames
    .filter(x => opponentFilter === 'All' || x.opponent === opponentFilter)
    .filter(x => statusFilter === 'All' || x.status === statusFilter)
    .filter(x => resultFilter === 'All' || x.result === resultFilter)
    .filter(x => stageFilter === 'All' || x.stage === stageFilter)

  // Season/Week agrupam por temporada; Player Pts e Team PF ranqueiam a
  // tabela inteira (a temporada vira só desempate).
  const sorted = [...filtered].sort((a, b) => {
    const seasonA = Number(a.season) || 0
    const seasonB = Number(b.season) || 0
    const weekA = parseFloat(a.week.replace(/[^0-9.]/g, '')) || 0
    const weekB = parseFloat(b.week.replace(/[^0-9.]/g, '')) || 0
    const compareSeason = () => (seasonA - seasonB) * (sort.seasonDir === 'asc' ? 1 : -1)
    const compareWeek = () => (weekA - weekB) * (sort.weekDir === 'asc' ? 1 : -1)
    const direction = sort.dir === 'asc' ? 1 : -1

    if (sort.key === 'pts' || sort.key === 'teamPF') {
      const diff = (a[sort.key] - b[sort.key]) * direction
      if (diff !== 0) return diff
      return compareSeason() || compareWeek()
    }
    if (sort.key === 'week' && sort.weekMode === 'global') return compareWeek() || compareSeason()
    return compareSeason() || compareWeek() || a.opponent.localeCompare(b.opponent)
  })

  // Week: 1º clique ↓ dentro da temporada, 2º ↑ dentro da temporada,
  // 3º ↓ geral, 4º ↑ geral, 5º volta ao padrão.
  const toggleSort = key => setSort(current => {
    if (key === 'season') {
      const nextDir = current.key === 'season' && current.seasonDir === 'desc' ? 'asc' : 'desc'
      return { ...current, key, dir: nextDir, seasonDir: nextDir }
    }
    if (key === 'week') {
      if (current.key !== 'week') return { ...current, key, dir: 'desc', weekDir: 'desc', weekMode: 'within-season' }
      if (current.weekMode === 'within-season' && current.dir === 'desc') return { ...current, dir: 'asc', weekDir: 'asc' }
      if (current.weekMode === 'within-season') return { ...current, dir: 'desc', weekDir: 'desc', weekMode: 'global' }
      if (current.dir === 'desc') return { ...current, dir: 'asc', weekDir: 'asc' }
      return DEFAULT_SORT
    }
    const nextDir = current.key === key && current.dir === 'desc' ? 'asc' : 'desc'
    return { ...current, key, dir: nextDir }
  })


  const openGame = row => {
    const canonical = (games || []).find(g =>
      String(g?.Season || '').trim() === row.season &&
      String(g?.Week || '').trim() === row.week &&
      ((normalizeTeamName(g?.Team) === normalizeTeamName(row.team) && normalizeTeamName(g?.Opponent) === normalizeTeamName(row.opponent)) ||
       (normalizeTeamName(g?.Team) === normalizeTeamName(row.opponent) && normalizeTeamName(g?.Opponent) === normalizeTeamName(row.team)))
    ) || row.g
    const params = new URLSearchParams({
      season: String(canonical?.Season || '').trim(),
      week: String(canonical?.Week || '').trim(),
      team: String(canonical?.Team || '').trim(),
      opp: String(canonical?.Opponent || '').trim(),
    })
    window.location.assign(`/matchups?${params.toString()}`)
  }

  const fullName = sleeperInfo?.first_name && sleeperInfo?.last_name && pos !== 'DEF'
    ? `${sleeperInfo.first_name} ${sleeperInfo.last_name}`
    : (displayName || rawName)
  const nflTeam = pos === 'DEF' ? getNflAbbr(rawName) : String(sleeperInfo?.team || '').toLowerCase()
  const injuryOrStatus = sleeperInfo?.status ? (String(sleeperInfo.status).toLowerCase() === 'active' ? 'Active' : 'Inactive') : null

  const columns = [
    // Pontos e status logo depois da semana: no celular aparecem sem rolar
    ['Season', { sort: 'season' }],
    ['Week', { sort: 'week' }],
    ['Player Pts', { sort: 'pts', align: 'right' }],
    ['Status', { filter: [statusFilter, setStatusFilter, options('status')] }],
    ['Team', {}],
    ['Opponent', { filter: [opponentFilter, setOpponentFilter, options('opponent'), shortName] }],
    ['Team PF', { sort: 'teamPF', align: 'right' }],
    ['Result', { filter: [resultFilter, setResultFilter, options('result')] }],
    ['Stage', { filter: [stageFilter, setStageFilter, options('stage')] }],
  ]

  return (
    // Também no celular é um pop-up: margem em volta e cantos arredondados,
    // com o fundo escurecido aparecendo
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/55 px-3 pb-3 pt-10 sm:items-center sm:p-5" onClick={onClose}>
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#EDEEF0] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-xl" onClick={e => e.stopPropagation()}>

        {/* Cabeçalho (mesmo azul do bloco da marca no header do site) */}
        <div className="flex-shrink-0 bg-[#02275F] text-white">
          <div className="flex items-center justify-between px-4 pt-3 sm:px-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Player Profile</div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20" aria-label="Close player profile">×</button>
          </div>
          <div className="flex items-center gap-3 px-4 pb-4 pt-2 sm:gap-5 sm:px-6 sm:pb-5">
            <ProfilePhoto playerId={playerId} rawName={rawName} position={pos} size={72} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-[22px] font-bold leading-tight tracking-tight sm:text-[30px]">{fullName}</h2>
                {pos && <span className={`flex-shrink-0 rounded px-1.5 py-1 text-[10px] font-semibold leading-none ring-1 ring-white/40 ${getPositionBadgeClasses(pos)}`}>{pos}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/75">
                {nflTeam && (
                  <span className="flex items-center gap-1.5 font-semibold text-white">
                    {getNFLTeamLogo(nflTeam) && <img src={getNFLTeamLogo(nflTeam)} alt="" className="h-5 w-5 object-contain" />}
                    {nflTeam.toUpperCase()}
                  </span>
                )}
                {injuryOrStatus && <><span className="text-white/35">·</span><span className={injuryOrStatus === 'Active' ? 'text-[#7FD18A]' : 'text-[#FFB84D]'}>{injuryOrStatus}</span></>}
                {pos !== 'DEF' && (
                  <>
                    <span className="text-white/35">·</span><span>Jersey {sleeperInfo?.number != null ? `#${sleeperInfo.number}` : '—'}</span>
                    <span className="text-white/35">·</span><span>Age {sleeperInfo?.age ?? '—'}</span>
                    <span className="text-white/35">·</span><span title="Sleeper years_exp counts completed NFL seasons">{nflSeasonLabel(sleeperInfo?.years_exp)}</span>
                  </>
                )}
                {/* Time da liga que tem o jogador hoje */}
                {rosteredBy !== undefined && pos !== 'DEF' && (
                  <>
                    <span className="text-white/35">·</span>
                    {rosteredBy
                      ? <span className="flex items-center gap-1 font-semibold text-white"><span className="rounded-full bg-white p-px"><TeamAvatar name={rosteredBy} size={16} /></span>{shortName(rosteredBy)}</span>
                      : <span className="text-white/70">Free agent</span>}
                  </>
                )}
                {loadingInfo && <span className="text-white/50">Loading…</span>}
              </div>
            </div>
            <img src="https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png" alt="NFL" className="hidden h-12 w-12 flex-shrink-0 object-contain sm:block" />
          </div>
        </div>

        {/* Franquias da liga */}
        <div className="flex-shrink-0 border-b border-[#E6E8EB] bg-white px-3 py-2 sm:px-6">
          <div className="scroll-hide flex gap-1.5 overflow-x-auto">
            {clubs.map(c => {
              const checked = activeTeamKeys.has(normalizeTeamName(c.team))
              return (
                <button key={c.team} type="button" onClick={() => toggleTeam(c.team)} className={`flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full pl-1.5 pr-3 text-[12px] transition-colors ${checked ? 'bg-[#02275F] font-semibold text-white' : 'bg-[#F4F5F7] text-[#3F4757] hover:bg-[#ECEEF1]'}`}>
                  <TeamAvatar name={c.team} size={22} />
                  <span>{shortName(c.team)}</span>
                  <span className={checked ? 'font-normal text-white/65' : 'text-[#9CA3AF]'}>{formatSeasonList(c.seasons)}</span>
                </button>
              )
            })}
          </div>
          {/* Temporadas das franquias selecionadas */}
          {availableSeasons.length > 1 && (
            <div className="scroll-hide mt-1.5 flex items-center gap-1 overflow-x-auto">
              <span className="mr-0.5 flex-shrink-0 text-[11px] font-medium text-[#6B7280]">Season</span>
              <button type="button" onClick={() => setSelectedSeasons(null)} className={`h-6 flex-shrink-0 rounded-full px-2.5 text-[11px] transition-colors ${allSeasons ? 'bg-[#02275F] font-semibold text-white' : 'bg-[#F4F5F7] text-[#3F4757] hover:bg-[#ECEEF1]'}`}>All</button>
              {availableSeasons.map(season => {
                const on = !allSeasons && activeSeasonSet.has(season)
                return (
                  <button key={season} type="button" onClick={() => toggleSeason(season)} className={`h-6 flex-shrink-0 rounded-full px-2.5 text-[11px] tabular-nums transition-colors ${on ? 'bg-[#02275F] font-semibold text-white' : 'bg-[#F4F5F7] text-[#3F4757] hover:bg-[#ECEEF1]'}`}>
                    {season}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Abas (também no desktop) */}
        {(
          <div className="scroll-hide flex flex-shrink-0 overflow-x-auto border-b border-[#E6E8EB] bg-white">
            {profileTabs.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setTab(key)} className={`flex-1 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] transition-colors ${tab === key ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280] hover:text-[#111]'}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        <div ref={bodyRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 sm:p-3">
          {/* Seletor do jogo (qualquer jogo dele nas franquias selecionadas) */}
          {matchup && tab === 'week' && byRecency.length > 0 && (
            <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[12px] text-[#6B7280] sm:px-4">
              <span className="flex-shrink-0">Game</span>
              <span className="relative min-w-0 flex-1">
                <select
                  value={profileGames.find(x => x.isCurrent)?.key || ''}
                  onChange={e => { setPickedGame(e.target.value || null); setVsPick(null) }}
                  className="h-8 w-full cursor-pointer appearance-none truncate rounded-full bg-[#F4F5F7] pl-3 pr-8 text-[13px] font-semibold text-[#111] outline-none"
                >
                  {!profileGames.some(x => x.isCurrent) && <option value="">{`${matchup.season} · Week ${matchup.week} · ${shortName(matchup.team)} vs ${shortName(matchup.opponent)}`}</option>}
                  {byRecency.map(x => <option key={x.key} value={x.key}>{`${x.season} · Week ${x.week} · ${shortName(x.team)} vs ${shortName(x.opponent)} · ${x.pts.toFixed(1)} pts`}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
              </span>
            </label>
          )}

          {matchup && tab === 'week' && (() => {
            const row = profileGames.find(x => x.isCurrent) || null
            const teamPA = row ? parseNumber(row.g?.PA) : 0
            const seasonRows = profileGames.filter(x => x.season === String(matchup.season) && !x.isCurrent && x.status === 'Starter')
            const seasonAvg = seasonRows.length ? seasonRows.reduce((sum, x) => sum + x.adjustedPts, 0) / seasonRows.length : null
            const diff = currentGame && seasonAvg != null ? currentGame.pts - seasonAvg : null
            return (
              <div className="grid gap-2 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                {/* Destaque da semana (mesmo estilo do Top Performance) */}
                <div className="relative overflow-hidden rounded-xl bg-[#02275F] p-4 text-white sm:p-5">
                  <span className="pointer-events-none absolute -right-1 -top-3 text-[92px] font-black italic leading-none text-white/[0.07]">W{matchup.week}</span>
                  <div className="relative">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E8C766]">Week {matchup.week} · {matchup.season}</div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-[44px] font-bold leading-none tabular-nums">{currentGame ? currentGame.pts.toFixed(2) : '—'}</span>
                      <span className="text-[13px] text-white/70">fantasy pts</span>
                    </div>
                    {currentGame?.proj != null && <div className="mt-1 text-[12px] text-white/70">Projected {Number(currentGame.proj).toFixed(2)}</div>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                      {currentGame && <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${currentGame.status === 'Starter' ? 'bg-[#1E8E3E] text-white' : 'bg-white/15 text-white'}`}>{currentGame.status}</span>}
                      {diff != null && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${diff >= 0 ? 'bg-[#E8F5EC] text-[#1E8E3E]' : 'bg-[#FDECEE] text-[#B3171F]'}`}>
                          {diff >= 0 ? '+' : ''}{diff.toFixed(1)} vs season avg
                        </span>
                      )}
                      {nflOpponent && (
                        <span className="flex items-center gap-1 text-white/80">
                          NFL vs {nflOpponent.toUpperCase()}
                          {getNFLTeamLogo(nflOpponent) && <img src={getNFLTeamLogo(nflOpponent)} alt="" className="h-4 w-4 object-contain" />}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/15 pt-3">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-white/60">Matchup</div>
                        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] font-semibold">
                          <TeamAvatar name={matchup.team} size={18} />
                          <span className="truncate">{row ? `${row.teamPF.toFixed(1)} – ${teamPA.toFixed(1)}` : `vs ${shortName(matchup.opponent)}`}</span>
                          {row?.result && <ResultBadge result={row.result} />}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-white/60">{shortName(matchup.team)} vs {shortName(matchup.opponent)}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-white/60">Season avg</div>
                        <div className="mt-1 text-[13px] font-semibold tabular-nums">{seasonAvg != null ? seasonAvg.toFixed(2) : '—'}</div>
                        <div className="mt-0.5 truncate text-[11px] text-white/60">{seasonRows.length} other starts in {matchup.season}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box score da NFL, em colunas que ocupam a largura toda */}
                <ProfileCard title="NFL box score" subtitle={`Week ${matchup.week} stats via Sleeper`}>
                  {weeklyGroups.length ? (
                    <div className="grid grid-cols-1 gap-px bg-[#F1F2F4] sm:grid-cols-2">
                      {weeklyGroups.map(group => (
                        <div key={group.label} className="bg-white px-3 py-3 sm:px-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">{STAT_GROUP_LABELS[group.label] || group.label}</div>
                          <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(group.items.length, 4)}, minmax(0, 1fr))` }}>
                            {group.items.map((item, i) => (
                              <div key={i} className="min-w-0 rounded-lg bg-[#F7F8FA] px-2 py-2 text-center">
                                <div className="text-[20px] font-bold leading-tight tabular-nums text-[#111]">{item.value}</div>
                                <div className="text-[10px] uppercase tracking-wide text-[#6B7280]">{item.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-8 text-center text-[13px] text-[#6B7280] sm:px-4">{loadingInfo ? 'Loading…' : 'Stats unavailable for this week'}</div>
                  )}
                </ProfileCard>
              </div>
            )
          })()}

          {matchup && tab === 'opponent' && (
            <ProfileCard
              title={`vs ${vsOpponent}`}
              subtitle="All-time history in the selected franchises"
              right={(
                // Escolher outro adversário
                <span className="relative flex-shrink-0">
                  <select value={vsOpponent || ''} onChange={e => setVsPick(e.target.value || null)} className="h-8 max-w-[170px] cursor-pointer appearance-none truncate rounded-full bg-[#F4F5F7] pl-3 pr-8 text-[12px] font-semibold text-[#111] outline-none">
                    {vsOpponent && !opponentsFaced.includes(vsOpponent) && <option value={vsOpponent}>{shortName(vsOpponent)}</option>}
                    {opponentsFaced.map(o => <option key={o} value={o}>{shortName(o)}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
                </span>
              )}
            >
              <div className="grid grid-cols-4 border-b border-[#F1F2F4]">
                {[['Games', versus.apps], ['Starts', versus.starts], ['Avg pts', versus.avg.toFixed(2)], ['Best', versus.best.toFixed(2)]].map(([label, value]) => (
                  <StatTile key={label} label={label} value={value} />
                ))}
              </div>
              <div>
                {versusGames.map((x, i) => (
                  <button key={`${x.season}-${x.week}-${i}`} type="button" onClick={() => openGame(x)} className={`grid w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#F1F2F4] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[#F7F8FA] sm:px-4 ${x.isCurrent ? 'bg-[#FFF3F4]' : ''}`}>
                    <div>
                      <div className="text-[13px] font-semibold text-[#111]">{x.season}</div>
                      <div className="text-[11px] text-[#6B7280]">Wk {x.week}</div>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <TeamAvatar name={x.team} size={20} />
                      <span className="truncate text-[13px] text-[#111]">{shortName(x.team)}</span>
                      <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${x.status === 'Starter' ? 'bg-[#E8F5EC] text-[#1E8E3E]' : 'bg-[#F1F2F4] text-[#4B5563]'}`}>{x.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold tabular-nums text-[#111]">{x.pts.toFixed(2)}</span>
                      <ResultBadge result={x.result} />
                    </div>
                  </button>
                ))}
                {versusGames.length === 0 && <div className="py-8 text-center text-[13px] text-[#6B7280]">No games against this franchise yet</div>}
              </div>
            </ProfileCard>
          )}

          {tab === 'career' && (
          <ProfileCard title="Tapitas League career" subtitle={`${activeTeams.length === clubs.length ? 'All franchises' : activeTeams.map(shortName).join(', ')} · ${formatSeasonList(stats.seasons)}`}>
            <div className="grid grid-cols-5">
              {[['Apps', stats.apps], ['Starts', stats.starts], ['Bench', stats.bench], ['Avg pts', stats.avg.toFixed(2)], ['Best pts', stats.best.toFixed(2)]].map(([label, value]) => (
                <StatTile key={label} label={label} value={value} />
              ))}
            </div>
          </ProfileCard>
          )}

          {/* Últimas notícias do jogador */}
          {tab === 'news' && <PlayerNewsCard playerId={playerId} emptyText="No recent ESPN news for this player." />}

          {/* Movimentações do jogador na liga (trades, adds, drops) */}
          {tab === 'transactions' && <PlayerTransactionsCard playerId={playerId} names={[fullName, displayName, rawName].filter(Boolean)} />}

          {/* Game log */}
          {tab === 'career' && (
          <ProfileCard title="Game Log" subtitle={`${sorted.length} of ${profileGames.length} games · click a row to open the matchup`}>
            {/* A janela rola até o card do Game Log encostar no topo (título visível);
                daí em diante só as linhas rolam, com o cabeçalho (Season, Week…)
                fixo. No topo da tabela, o scroll volta a mover a janela. */}
            <div className="overflow-auto" style={bodyHeight ? { maxHeight: Math.max(200, bodyHeight - GAME_LOG_HEADER_PX) } : undefined}>
              <table className="w-full min-w-[760px]">
                <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#EEF0F2]">
                  <tr className="border-b border-[#EEF0F2]">
                    {columns.map(([h, { sort: sortKey, filter, align }]) => {
                      const active = sortKey && sort.key === sortKey
                      const dir = sortKey === 'season' ? sort.seasonDir : sortKey === 'week' ? sort.weekDir : sort.dir
                      const scope = sortKey === 'week' && active && sort.weekMode === 'global' ? ' all' : ''
                      return (
                        <th key={h} className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-medium text-[#6B7280] sm:px-4 ${align === 'right' ? 'text-right' : 'text-left'}`}>
                          {filter ? (
                            <HeaderFilter value={filter[0]} onChange={filter[1]} options={filter[2]} label={h} displayOption={filter[3]} />
                          ) : sortKey ? (
                            <button type="button" onClick={() => toggleSort(sortKey)} className={`inline-flex items-center gap-1 hover:text-[#111] ${active ? 'font-semibold text-[#111]' : ''}`}>
                              {h}
                              <span className={active ? 'text-[#D01F2D]' : 'text-[#C4C7CC]'}>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}{scope}</span>
                            </button>
                          ) : h}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((x, i) => (
                    <tr
                      key={`${x.season}-${x.week}-${x.team}-${x.opponent}-${i}`}
                      onClick={() => openGame(x)}
                      className={`cursor-pointer border-b border-[#F1F2F4] transition-colors last:border-b-0 hover:bg-[#F7F8FA] ${x.isCurrent ? 'bg-[#FFF3F4]' : ''}`}
                    >
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#111] sm:px-4">{x.season}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[13px] tabular-nums text-[#3F4757] sm:px-4">{x.week}</td>
                      <td className="px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums text-[#111] sm:px-4">{x.pts.toFixed(2)}</td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${x.status === 'Starter' ? 'bg-[#E8F5EC] text-[#1E8E3E]' : 'bg-[#F1F2F4] text-[#4B5563]'}`}>{x.status}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[13px] text-[#111] sm:px-4">{shortName(x.team)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[13px] text-[#111] sm:px-4">{shortName(x.opponent)}</td>
                      <td className="px-3 py-2.5 text-right text-[13px] tabular-nums text-[#3F4757] sm:px-4">{x.teamPF.toFixed(2)}</td>
                      <td className="px-3 py-2.5 sm:px-4"><ResultBadge result={x.result} /></td>
                      <td className="px-3 py-2.5 text-[12px] text-[#6B7280] sm:px-4">{x.stage || '—'}</td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={columns.length} className="py-10 text-center text-[13px] text-[#6B7280]">No games match these filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ProfileCard>
          )}
        </div>
      </div>
    </div>
  )
}
