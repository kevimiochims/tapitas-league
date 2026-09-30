'use client'

// Player Profile compartilhado pelas páginas Teams, Players e Matchups.
// Quando aberto a partir de um confronto (prop `matchup`), mostra também os
// números do jogador naquela semana e o retrospecto contra aquele adversário.

import { useEffect, useRef, useState } from 'react'
import { PlayerNewsCard, PlayerAdvancedCard } from './nfl/PlayerNflCards'
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

// ── Sleeper (cache em módulo para não baixar os mesmos dados de novo) ──
let SLEEPER_PLAYERS_PROMISE = null
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

// Linha de box score: rótulo do grupo à esquerda, números com a legenda embaixo.
function StatGroupRow({ group }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] items-start gap-2 py-2">
      <span className="pt-0.5 text-[12px] text-[#6B7280]">{STAT_GROUP_LABELS[group.label] || group.label}</span>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {group.items.map((item, i) => (
          <div key={i} className="flex flex-col">
            <strong className="text-[17px] font-bold leading-tight tabular-nums text-[#111]">{item.value}</strong>
            <span className="text-[10px] uppercase tracking-wide text-[#6B7280]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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
 * @param matchup     { season, week, team, opponent } quando aberto de um confronto
 */
export default function PlayerProfileModal({ rawName, displayName, position, playerId, games, initialTeams, matchup, onClose }) {
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
  const [tab, setTab] = useState(matchup ? 'week' : 'career')

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

  const [selectedTeams, setSelectedTeams] = useState(() => (initialTeams && initialTeams.length ? initialTeams : null))
  const activeTeams = selectedTeams || clubs.map(c => c.team)
  const activeTeamKeys = new Set(activeTeams.map(normalizeTeamName))

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
  const profileGames = (games || []).flatMap(g => {
    const app = extractPlayerAppearances(g).find(a => isSelf(a.name))
    if (!app) return []
    const team = String(g?.Team || '').trim()
    if (!activeTeamKeys.has(normalizeTeamName(team))) return []
    const season = String(g?.Season || '').trim()
    const week = String(g?.Week || '').trim()
    const opponent = String(g?.Opponent || '').trim()
    const doubleWeek = isDoubleWeekValue(week)
    return [{
      g, season, week, team, opponent,
      status: app.status,
      // O placar exibido é sempre o real; o ajustado (÷2 em rodada dupla)
      // serve só para AVG/BEST.
      pts: app.pts,
      adjustedPts: doubleWeek ? app.pts / 2 : app.pts,
      isDoubleWeek: doubleWeek,
      teamPF: parseNumber(g?.PF),
      result: String(g?.Result || '').trim().toUpperCase(),
      stage: String(g?.GameStage || '').trim(),
      isCurrent: isMatchupGame(season, week, team, opponent),
    }]
  })

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

  // Retrospecto contra o adversário do confronto, nas franquias selecionadas.
  const versusGames = matchup
    ? profileGames
        .filter(x => normalizeTeamName(x.opponent) === normalizeTeamName(matchup.opponent))
        .sort((a, b) => (Number(b.season) - Number(a.season)) || ((parseFloat(b.week) || 0) - (parseFloat(a.week) || 0)))
    : []
  const versus = matchup ? summarize(profileGames.filter(x => normalizeTeamName(x.opponent) === normalizeTeamName(matchup.opponent))) : null
  const currentGame = matchup
    ? (games || []).map(g => {
        const app = extractPlayerAppearances(g).find(a => isSelf(a.name))
        return app && isMatchupGame(String(g?.Season || '').trim(), String(g?.Week || '').trim(), g?.Team, g?.Opponent) ? app : null
      }).find(Boolean) || null
    : null
  const weeklyGroups = formatCompactPlayerStatGroups(weeklyStats, pos)

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
    ['Season', { sort: 'season' }],
    ['Week', { sort: 'week' }],
    ['Team', {}],
    ['Opponent', { filter: [opponentFilter, setOpponentFilter, options('opponent'), shortName] }],
    ['Status', { filter: [statusFilter, setStatusFilter, options('status')] }],
    ['Player Pts', { sort: 'pts', align: 'right' }],
    ['Team PF', { sort: 'teamPF', align: 'right' }],
    ['Result', { filter: [resultFilter, setResultFilter, options('result')] }],
    ['Stage', { filter: [stageFilter, setStageFilter, options('stage')] }],
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/55 p-0 sm:items-center sm:p-5" onClick={onClose}>
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-[#EDEEF0] shadow-xl sm:h-auto sm:max-h-[92vh] sm:rounded-xl" onClick={e => e.stopPropagation()}>

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
                    <span className="text-white/35">·</span><span>Exp {sleeperInfo?.years_exp != null ? `${sleeperInfo.years_exp} yrs` : '—'}</span>
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
        </div>

        {/* Abas (só no perfil aberto a partir de um confronto) */}
        {matchup && (
          <div className="flex flex-shrink-0 border-b border-[#E6E8EB] bg-white">
            {[['week', `Week ${matchup.week}`], ['opponent', `vs ${shortName(matchup.opponent)}`], ['career', 'Career']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setTab(key)} className={`flex-1 border-b-2 px-2 py-2.5 text-[13px] transition-colors ${tab === key ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280] hover:text-[#111]'}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 sm:p-3">
          {matchup && tab === 'week' && (
            <ProfileCard
              title={`Week ${matchup.week} performance`}
              subtitle={`${matchup.season} · ${shortName(matchup.team)} vs ${shortName(matchup.opponent)}`}
              right={nflOpponent && (
                <span className="flex flex-shrink-0 items-center gap-1.5 text-[12px] text-[#6B7280]">
                  NFL: vs {nflOpponent.toUpperCase()}
                  {getNFLTeamLogo(nflOpponent) && <img src={getNFLTeamLogo(nflOpponent)} alt="" className="h-6 w-6 object-contain" />}
                </span>
              )}
            >
              <div className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-stretch sm:gap-4 sm:px-4 sm:py-3">
                <div className="flex items-center gap-3 border-b border-[#F1F2F4] pb-2 sm:w-[120px] sm:flex-shrink-0 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                  <div>
                    <div className="text-[30px] font-bold leading-none tabular-nums text-[#111]">{currentGame ? currentGame.pts.toFixed(2) : '—'}</div>
                    <div className="mt-1 text-[11px] text-[#6B7280]">Fantasy points</div>
                  </div>
                  {currentGame && (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${currentGame.status === 'Starter' ? 'bg-[#E8F5EC] text-[#1E8E3E]' : 'bg-[#F1F2F4] text-[#4B5563]'}`}>{currentGame.status}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 divide-y divide-[#F1F2F4]">
                  {weeklyGroups.length
                    ? weeklyGroups.map(group => <StatGroupRow key={group.label} group={group} />)
                    : <div className="py-3 text-[13px] text-[#6B7280]">{loadingInfo ? 'Loading…' : 'Stats unavailable for this week'}</div>}
                </div>
              </div>
            </ProfileCard>
          )}

          {matchup && tab === 'opponent' && (
            <ProfileCard
              title={`vs ${matchup.opponent}`}
              subtitle="All-time history in the selected franchises"
              right={<TeamAvatar name={matchup.opponent} size={28} />}
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

          {/* NFL: uso do jogador e últimas notícias */}
          {tab === 'career' && <PlayerAdvancedCard playerId={playerId} position={pos} />}
          {tab === 'career' && <PlayerNewsCard playerId={playerId} />}

          {/* Game log */}
          {tab === 'career' && (
          <ProfileCard title="Game Log" subtitle={`${sorted.length} of ${profileGames.length} games · click a row to open the matchup`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
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
                      <td className="whitespace-nowrap px-3 py-2.5 text-[13px] text-[#111] sm:px-4">{shortName(x.team)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[13px] text-[#111] sm:px-4">{shortName(x.opponent)}</td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${x.status === 'Starter' ? 'bg-[#E8F5EC] text-[#1E8E3E]' : 'bg-[#F1F2F4] text-[#4B5563]'}`}>{x.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums text-[#111] sm:px-4">{x.pts.toFixed(2)}</td>
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
