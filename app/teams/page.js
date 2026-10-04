'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Trophy, Activity, Target, Flame, TrendingUp, TrendingDown, Star, Swords, ChevronRight, ChevronLeft, ChevronDown, Check, Skull, Zap, Filter, Users } from 'lucide-react'
import Header from '../components/Header'
import PlayerProfileModal from '../components/PlayerProfileModal'
import TeamNflNotice from '../components/nfl/TeamNflNotice'
import { TeamTransactionsCard } from '../components/Transactions'
import PlayerCutout from '../components/PlayerCutout'
import { buildFactsNameIndex, resolveFactsName } from '../lib/factsNames'
import { BrandBackdrop, SiteFooter, PageSkeleton, PageBar, BarTab, FilterPill, ToggleChip, Tag, ResultBadge, CardShell, CardGroup, StatRow, Pager, StableHeight } from '../components/ui'
import { getTeamFocus } from '../context/TeamFocus'
import { useNameOwners } from '../lib/useNameOwners'

const BASE_URL = '/api/sheet'

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

function getTeamImage(name) {
  const key = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  return TEAM_IMAGES[key] || null
}

function getInitials(name) {
  return String(name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
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
  'redskins': 'wsh', 'washington redskins': 'wsh', 'football team': 'wsh',
  'ari': 'ari', 'atl': 'atl', 'bal': 'bal', 'buf': 'buf', 'car': 'car', 'chi': 'chi',
  'cin': 'cin', 'cle': 'cle', 'dal': 'dal', 'den': 'den', 'det': 'det', 'gb': 'gb',
  'hou': 'hou', 'ind': 'ind', 'jax': 'jax', 'kc': 'kc', 'lac': 'lac', 'lar': 'lar',
  'lv': 'lv', 'mia': 'mia', 'min': 'min', 'ne': 'ne', 'no': 'no', 'nyg': 'nyg',
  'nyj': 'nyj', 'phi': 'phi', 'pit': 'pit', 'sea': 'sea', 'sf': 'sf', 'tb': 'tb',
  'ten': 'ten', 'wsh': 'wsh',
}

function getNFLTeamLogo(name) {
  const raw = normalizePlayerKey(name)
    .replace(/\b(d\/st|dst|def|defense|special teams)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const mapped = NFL_TEAM_NAME_MAP[raw]
  return mapped ? `https://a.espncdn.com/i/teamlogos/nfl/500/${mapped}.png` : null
}

function normalizeTeamName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isTrueFlag(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return ['true', 'yes', 'sim', '1'].includes(normalized)
}

function parseNumber(value) {
  if (!value && value !== 0) return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
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
    if (years[i] === end + 1) {
      end = years[i]
    } else {
      pushRange(start, end)
      start = end = years[i]
    }
  }
  pushRange(start, end)

  return parts.join(', ')
}

// GAME_FACTS_ALL weekly fantasy scores may use a decimal point (e.g. 215.7).
// Keep that decimal instead of treating the dot as a thousands separator.
function parseWeeklyPoints(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const raw = String(value).trim().replace(/[^0-9,.-]/g, '')
  if (!raw) return 0
  if (raw.includes(',') && raw.includes('.')) {
    const lastComma = raw.lastIndexOf(',')
    const lastDot = raw.lastIndexOf('.')
    const normalized = lastComma > lastDot
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '')
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (raw.includes(',')) {
    const parsed = Number(raw.replace(/\./g, '').replace(',', '.'))
    return Number.isNaN(parsed) ? 0 : parsed
  }
  const parsed = Number(raw)
  return Number.isNaN(parsed) ? 0 : parsed
}

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch { return [] }
}

// Returns an ordinal label like "most all-time", "2nd all-time", "3rd all-time"...
// Ties share the same rank, and the next distinct value skips ahead accordingly
// (e.g. two teams tied for 2nd push the next team to 4th, not 3rd).
// Values <= 0 return null (no ranking shown).
function getOrdinalRankLabel(value, allValues) {
  if (!value || value <= 0) return null
  const valid = allValues.filter(v => v > 0)
  if (!valid.some(v => v === value)) return null
  const rank = valid.filter(v => v > value).length + 1
  if (rank === 1) return 'most all-time'
  const suffix = (rank % 100 >= 11 && rank % 100 <= 13) ? 'th' : (['th', 'st', 'nd', 'rd'][rank % 10] || 'th')
  return `${rank}${suffix} all-time`
}

function getAscendingOrdinalRankLabel(value, allValues) {
  if (!Number.isFinite(Number(value))) return null
  const valid = allValues.filter(v => Number.isFinite(Number(v)))
  if (!valid.some(v => Number(v) === Number(value))) return null
  const rank = valid.filter(v => Number(v) < Number(value)).length + 1
  if (rank === 1) return '1st all-time'
  const suffix = (rank % 100 >= 11 && rank % 100 <= 13) ? 'th' : (['th', 'st', 'nd', 'rd'][rank % 10] || 'th')
  return `${rank}${suffix} all-time`
}

function TeamAvatar({ name, size = 'md' }) {
  const img = getTeamImage(name)
  const sizes = { xs: 22, sm: 40, md: 64, lg: 96, xl: 128 }
  const px = sizes[size]

  if (img) return (
    <div className="flex-shrink-0" style={{ width: px, height: px }}>
      <img src={img} alt={name} className="w-full h-full object-contain" />
    </div>
  )
  return (
    <div className="flex-shrink-0 flex items-center justify-center rounded-full bg-[#16274F] font-semibold text-white"
      style={{ width: px, height: px, fontSize: px * 0.3 }}>
      {getInitials(name)}
    </div>
  )
}

// ── Player lookup (mirrors the pattern used on the Matchups page) ──────
function normalizePlayerKey(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function buildPlayerLookup(rows) {
  const map = new Map()
  rows.forEach(row => {
    const playerId = String(row?.player_id || '').trim()
    const abbreviated = String(row?.name || '').trim()
    const fullName = String(row?.full_name || '').trim()
    if (!playerId) return
    const entry = {
      playerId,
      abbreviated,
      fullName,
      position: String(row?.pos || row?.position || row?.Position || '').trim().toUpperCase(),
    }
      ;[abbreviated, fullName].filter(Boolean).forEach(value => {
        const baseKey = normalizePlayerKey(value)
        if (baseKey && !map.has(baseKey)) map.set(baseKey, entry)
      })
  })
  return map
}

function getPlayerId(name, playerLookup) {
  if (!playerLookup || !name) return null
  return playerLookup.get(normalizePlayerKey(name))?.playerId || null
}

function PlayerAvatar({ name, playerLookup, size = 56 }) {
  const [failed, setFailed] = useState(false)
  const playerId = getPlayerId(name, playerLookup)
  const defenseLogo = getNFLTeamLogo(name)
  const src = playerId && !failed ? `https://sleepercdn.com/content/nfl/players/${playerId}.jpg` : null
  const initials = String(name || '?').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex-shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-[#E6E8EB]" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : defenseLogo ? (
        <img src={defenseLogo} alt={name} className="h-full w-full object-contain bg-white p-1" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#16274F] font-semibold text-white" style={{ fontSize: size * 0.32 }}>
          {initials}
        </div>
      )}
    </div>
  )
}

// ── Extract a team's roster (starters or bench) from a GAME_FACTS_ALL row ──
function extractRosterNames(game, prefix, max = 13) {
  const names = []
  for (let i = 1; i <= max; i++) {
    const name = game?.[`${prefix}${i}_Name`]
    if (name && name !== '--empty--' && String(name).trim() !== '') {
      names.push(String(name).trim())
    }
  }
  return names
}

function extractPlayerAppearances(game, max = 13) {
  const appearances = []
  for (let i = 1; i <= max; i++) {
    const starterName = game?.[`S${i}_Name`]
    const starterPts = game?.[`S${i}_Pts`]
    if (starterName && starterName !== '--empty--' && String(starterName).trim() !== '') {
      appearances.push({ name: String(starterName).trim(), status: 'Starter', pts: parseNumber(starterPts) })
    }
    const benchName = game?.[`B${i}_Name`]
    const benchPts = game?.[`B${i}_Pts`]
    if (benchName && benchName !== '--empty--' && String(benchName).trim() !== '') {
      appearances.push({ name: String(benchName).trim(), status: 'Bench', pts: parseNumber(benchPts) })
    }
  }
  return appearances
}

function getDisplayPlayerName(name, playerLookup) {
  const raw = String(name || '').trim()
  // Defenses are teams, not individual players. Keep their football name intact
  // so the NFL logo mapping remains available and avoid showing names like "I. Colts".
  if (getNFLTeamLogo(raw)) return raw
  const data = playerLookup?.get(normalizePlayerKey(raw))
  return data?.abbreviated || data?.fullName && formatFallbackPlayerName(data.fullName) || formatFallbackPlayerName(raw)
}

function formatFallbackPlayerName(name) {
  const raw = String(name || '').trim()
  if (!raw) return raw
  if (/^[A-Za-z]\.\s/.test(raw)) return raw
  const parts = raw.split(/\s+/)
  if (parts.length < 2) return raw
  return `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1]}`
}

function getPlayerPosition(name, playerLookup) {
  const raw = String(name || '').trim()
  const data = playerLookup?.get(normalizePlayerKey(raw))
  const position = String(data?.position || data?.pos || '').trim().toUpperCase()
  if (position) return position
  return getNFLTeamLogo(raw) ? 'DEF' : ''
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

function formatPlayerHeight(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (/^\d+'\d+\"$/.test(raw)) return raw
  const inches = Number(raw.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(inches) || inches <= 0) return raw
  const feet = Math.floor(inches / 12)
  const remaining = Math.round(inches % 12)
  return `${feet}'${remaining}\"`
}

function formatPlayerWeight(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const numeric = Number(raw.replace(/[^0-9.]/g, ''))
  return Number.isFinite(numeric) && numeric > 0 ? `${numeric} lbs` : raw
}

function getPlayerIdentity(name, playerLookup) {
  const raw = String(name || '').trim()
  const playerId = getPlayerId(raw, playerLookup)
  return playerId ? `id:${playerId}` : `name:${normalizePlayerKey(raw)}`
}

function canonicalMatchupHref(game, games) {
  if (!game) return '/matchups'
  const season = String(game?.Season || '').trim()
  const week = String(game?.Week || '').trim()
  const team = String(game?.Team || '').trim()
  const opp = String(game?.Opponent || '').trim()
  const canonical = Array.isArray(games) ? games.find(row => {
    if (String(row?.Season || '').trim() !== season || String(row?.Week || '').trim() !== week) return false
    const rowTeam = normalizeTeamName(row?.Team)
    const rowOpp = normalizeTeamName(row?.Opponent)
    return (rowTeam === normalizeTeamName(team) && rowOpp === normalizeTeamName(opp)) ||
      (rowTeam === normalizeTeamName(opp) && rowOpp === normalizeTeamName(team))
  }) : null
  const target = canonical || game
  return `/matchups?season=${encodeURIComponent(String(target?.Season || '').trim())}&week=${encodeURIComponent(String(target?.Week || '').trim())}&team=${encodeURIComponent(String(target?.Team || '').trim())}&opp=${encodeURIComponent(String(target?.Opponent || '').trim())}`
}

const shortName = (name) => {
  const mappings = {
    'i am megatron': 'Megatron',
    'h-lera do mahl': 'H-Lera',
    'peytão da massa': 'Peytao',
    'peytao da massa': 'Peytao',
    'ocupa & resiste': 'Ocupa',
    'ocupa e resiste': 'Ocupa',
    'pequers verde': 'Pequers',
    'rincao settlers': 'Rincão',
    'rincão settlers': 'Rincão',
    'old brady': 'OldBrady',
    'oldbrady': 'OldBrady',
    'moneyball': 'Moneyball',
    'patrolao': 'Patrolao',
    'patrolão squad': 'Patrolão',
    'patrolao squad': 'Patrolao',
    'how much': 'Howmuch',
    'howmuchyoutruck': 'Howmuch',
    'hangover football club': 'Hangover FC',
    'porto alegre coelhos': 'PA Coelhos',
    'santa cruz frangos': 'SC Frangos',
    'seguidores de charlao': 'Seg de Charlao',
    'canoas andres limas': 'Canoas A Limas',
    'rj skipknows': 'RJ SkipKnows',
    '4winclutch': '4WinClutch',
  }
  const raw = String(name || '').trim()
  const key = raw.toLocaleLowerCase()
  return mappings[key] || raw
}

export default function TeamsPage() {
  // Dono de cada nome abreviado na liga (separa homônimos no perfil)
  const nameOwners = useNameOwners()
  const [allTime, setAllTime] = useState([])
  const [history, setHistory] = useState([])
  const [historyRaw, setHistoryRaw] = useState([])
  const [h2hData, setH2hData] = useState([])
  const [games, setGames] = useState([])
  const [playerLookup, setPlayerLookup] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [mobileTeamView, setMobileTeamView] = useState('overview')
  const [teamsSort, setTeamsSort] = useState('wins')
  const gameLogRef = useRef(null)

  // ── Game Log filters ─────────────────────────────────────────────
  const [logSeason, setLogSeason] = useState('All')
  const [logOpponent, setLogOpponent] = useState('All')
  const [logGameType, setLogGameType] = useState('All')
  const [log200Only, setLog200Only] = useState(false)
  const [logHighestOnly, setLogHighestOnly] = useState(false)
  const [selectedPlayerKey, setSelectedPlayerKey] = useState(null)
  const [profileTab, setProfileTab] = useState(null)
  // Jogador do Sleeper que nunca jogou pela franquia (fora do Player Archive)
  const [nflProfile, setNflProfile] = useState(null)
  const [playerSearch, setPlayerSearch] = useState('')
  const [playerPositionFilter, setPlayerPositionFilter] = useState('All')
  const [playerSort, setPlayerSort] = useState('Appearances')
  const [playerSeasonFilter, setPlayerSeasonFilter] = useState('All')
  const [playerMinApps, setPlayerMinApps] = useState('All')
  const [logPage, setLogPage] = useState(0)
  const [playerPage, setPlayerPage] = useState(0)
  const activeTeamChipRef = useRef(null)

  // Browser history for the in-page Teams selection.
  // There are only two navigation levels inside /teams:
  //   base = All Teams
  //   child = currently selected team OR Player Profile
  // A team-to-team change NEVER creates another history entry; it replaces the
  // existing child entry. All Teams likewise replaces the child entry.
  // This keeps the browser stack deterministic:
  //   previous page -> All Teams -> current team -> profile
  const makeTeamsState = (view, team = null, player = null) => ({
    __teamsHistory: true,
    teamsView: view,
    team: team ? String(team).trim() : null,
    player: player || null,
  })

  const selectTeam = (team) => {
    const cleanTeam = typeof team === 'object'
      ? { ...team, team: String(team?.team || team?.Team || '').trim() }
      : { team: String(team || '').trim() }
    if (!cleanTeam.team) return

    if (typeof window !== 'undefined') {
      const current = window.history.state || {}
      const nextState = makeTeamsState('team', cleanTeam.team)

      if (current.__teamsHistory && current.teamsView === 'all') {
        // Base -> team: add exactly one child entry.
        window.history.pushState(nextState, '', window.location.href)
      } else if (current.__teamsHistory && (current.teamsView === 'team' || current.teamsView === 'profile')) {
        // Team/Profile -> another team: replace the child. Never leave the old
        // franchise behind in the browser history.
        window.history.replaceState(nextState, '', window.location.href)
      } else {
        // This can happen if /teams was opened with an existing browser state.
        // Establish the current page as the base, then add exactly one child.
        window.history.replaceState(makeTeamsState('all'), '', window.location.href)
        window.history.pushState(nextState, '', window.location.href)
      }
    }

    setSelected(cleanTeam)
    setSelectedPlayerKey(null)
    setMobileTeamView('overview')
  }

  const openPlayerProfile = (playerKey, teamName = selected?.team, tab = null) => {
    if (!playerKey) return
    const cleanTeam = String(teamName || '').trim()
    if (typeof window !== 'undefined') {
      const current = window.history.state || {}
      const profileState = makeTeamsState('profile', cleanTeam, playerKey)

      if (current.__teamsHistory && (current.teamsView === 'team' || current.teamsView === 'profile')) {
        // Profile is the single child entry above the selected team. Replacing
        // an already-open profile also prevents duplicate profile entries.
        window.history.pushState(profileState, '', window.location.href)
      } else if (current.__teamsHistory && current.teamsView === 'all') {
        // Defensive path: selecting a profile from All Teams still gets one
        // child entry so Back returns to All Teams.
        window.history.pushState(profileState, '', window.location.href)
      } else {
        window.history.replaceState(makeTeamsState('all'), '', window.location.href)
        window.history.pushState(profileState, '', window.location.href)
      }
    }
    setProfileTab(tab)
    setSelectedPlayerKey(playerKey)
  }

  const closePlayerProfile = () => {
    if (typeof window !== 'undefined' && window.history.state?.__teamsHistory && window.history.state?.teamsView === 'profile') {
      window.history.back()
      return
    }
    setSelectedPlayerKey(null)
  }

  const showAllTeams = () => {
    if (typeof window !== 'undefined') {
      const current = window.history.state || {}

      if (current.__teamsHistory && current.teamsView === 'profile') {
        // Profile -> Team -> All Teams: go back two in-page entries.
        // Do NOT replace the profile/team entries, because the existing base
        // All Teams entry is exactly the one we want to return to.
        window.history.go(-2)
        return
      }

      if (current.__teamsHistory && current.teamsView === 'team') {
        // Team -> All Teams: return to the existing base entry.
        // Using replaceState here created a SECOND All Teams entry, because the
        // original base entry was still sitting immediately behind this team.
        window.history.back()
        return
      }

      if (!current.__teamsHistory) {
        // Establish the page as the base without destroying the real page before
        // /teams in the browser history.
        window.history.pushState(makeTeamsState('all'), '', window.location.href)
      }
    }

    setSelected(null)
    setSelectedPlayerKey(null)
    setMobileTeamView('overview')
  }

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const current = window.history.state || {}
    if (!current.__teamsHistory) {
      // Preserve the real page before /teams and add exactly one base entry.
      window.history.pushState(makeTeamsState('all'), '', window.location.href)
    }

    const handlePopState = (event) => {
      const state = event.state || {}

      if (state.__teamsHistory && state.teamsView === 'profile') {
        const teamName = String(state.team || '').trim()
        if (teamName) {
          const teamRow = allTime.find(r =>
            String(r?.Team || '').trim().toLowerCase() === teamName.toLowerCase()
          )
          if (teamRow) setSelected({ ...teamRow, team: String(teamRow.Team || '').trim() })
        }
        if (state.player) setSelectedPlayerKey(state.player)
        return
      }

      if (state.__teamsHistory && state.teamsView === 'team' && state.team) {
        const teamName = String(state.team).trim()
        const teamRow = allTime.find(r =>
          String(r?.Team || '').trim().toLowerCase() === teamName.toLowerCase()
        )
        if (teamRow) setSelected({ ...teamRow, team: String(teamRow.Team || '').trim() })
        setSelectedPlayerKey(null)
        return
      }

      // Base / All Teams, or a genuine history entry outside this page.
      setSelectedPlayerKey(null)
      setSelected(null)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [allTime])

  useEffect(() => {
    setLogSeason('All')
    setLogOpponent('All')
    setLogGameType('All')
    setLog200Only(false)
    setLogHighestOnly(false)
    setSelectedPlayerKey(null)
    setPlayerSearch('')
    setPlayerPositionFilter('All')
    setPlayerSort('Appearances')
    setPlayerSeasonFilter('All')
    setPlayerMinApps('All')
  }, [selected])

  // Game Log / Player Archive go back to the first page when the filters change.
  useEffect(() => { setLogPage(0) }, [selected, logSeason, logOpponent, logGameType, log200Only, logHighestOnly])
  useEffect(() => { setPlayerPage(0) }, [selected, playerSearch, playerPositionFilter, playerSort, playerSeasonFilter, playerMinApps])

  // Keep the selected franchise visible in the team switcher strip.
  useEffect(() => {
    const timer = setTimeout(() => {
      activeTeamChipRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, 80)
    return () => clearTimeout(timer)
  }, [selected?.team])

  // Force the page to the top after navigating between franchises from Historic.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const shouldResetScroll = params.get('scroll') === 'top' || sessionStorage.getItem('teams-scroll-top') === '1'
    if (!shouldResetScroll) return

    sessionStorage.removeItem('teams-scroll-top')
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
    const timer = setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 80)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    async function load() {
      const [at, hi, hr, h2h, ga, pc] = await Promise.all([
        safeFetch(`${BASE_URL}/TEAM_ALL_TIME`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_RAW`),
        safeFetch(`${BASE_URL}/HEAD_TO_HEAD_SORTED`),
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        safeFetch(`${BASE_URL}/_PLAYER_CACHE`),
      ])
      setAllTime(at)
      setHistory(hi)
      setHistoryRaw(hr)
      setH2hData(h2h)
      setGames(ga)
      setPlayerLookup(buildPlayerLookup(pc))
      setLoading(false)

      // Auto-select team from ?team= URL param
      const teamParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('team')
          : null
      // Sem ?team=, abre no time em foco (filtro geral do header), se houver
      const wanted = teamParam || getTeamFocus()
      if (wanted) {
        const match = at.find(r =>
          String(r?.Team || '').trim().toLowerCase() === wanted.toLowerCase()
        )
        if (match) setSelected({ ...match, team: String(match.Team || '').trim() })
      }
    }
    load()
  }, [])

  const teams = useMemo(() => {
    return allTime
      .map(r => ({ ...r, team: String(r?.Team || '').trim() }))
      .filter(r => r.team)
      .sort((a, b) => parseNumber(b.W) - parseNumber(a.W))
  }, [allTime])

  const historySource = historyRaw.length ? historyRaw : history

  const getTeamHistory = (teamName) =>
    historySource
      .filter(r => normalizeTeamName(r?.Team) === normalizeTeamName(teamName))
      .sort((a, b) => Number(b.Season) - Number(a.Season))

  const getTeamH2H = (teamName) => {
    const seen = new Set()
    return h2hData.filter(r => {
      const a = String(r?.['Team A'] || '').trim()
      const b = String(r?.['Team B'] || '').trim()
      const key = [a, b].sort().join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return a === teamName || b === teamName
    }).map(r => {
      const isA = String(r?.['Team A'] || '').trim() === teamName
      return {
        opponent: isA ? String(r?.['Team B'] || '').trim() : String(r?.['Team A'] || '').trim(),
        wins: isA ? parseNumber(r?.['A Wins']) : parseNumber(r?.['B Wins']),
        losses: isA ? parseNumber(r?.['B Wins']) : parseNumber(r?.['A Wins']),
        games: parseNumber(r?.Games),
        streak: String(r?.['Current Streak'] || ''),
      }
    }).sort((a, b) => b.games - a.games)
  }

  // ── GAME_FACTS_ALL derived stats: 200+ pt games & PR #1 weeks ───────
  const isDoubleWeek = g => { const w = String(g?.Week || ''); return w.includes('-') || w.includes('&') }

  // Highest PF among all teams for a given Season+Week, Reg Season only.
  // The weekly-high record is intentionally RS-only because all franchises
  // are eligible during the regular season.
  const weeklyMaxPFRS = useMemo(() => {
    const map = {}
    games.forEach(g => {
      if (String(g?.GameStage || '').trim() !== 'Reg Season') return
      const key = `${String(g?.Season || '').trim()}|${String(g?.Week || '').trim()}`
      const pf = parseWeeklyPoints(g?.PF)
      if (map[key] === undefined || pf > map[key]) map[key] = pf
    })
    return map
  }, [games])

  // Highest single-week score for each franchise.
  // Double weeks are excluded, but regular-season, playoff and consolation
  // games are all eligible as long as the matchup is a single week.
  const getTeamWeeklyMax = (teamName) => {
    let max = 0
    const seen = new Set()
    games.forEach(g => {
      if (normalizeTeamName(g?.Team) !== normalizeTeamName(teamName)) return
      if (isDoubleWeek(g)) return

      const season = String(g?.Season || '').trim()
      const week = String(g?.Week || '').trim()
      const stage = String(g?.GameStage || '').trim()
      const opponent = normalizeTeamName(g?.Opponent)
      if (!season || !week) return

      // Deduplicate the mirrored GAME_FACTS_ALL rows while still allowing
      // different single-week stages/opponents to remain distinct if they exist.
      const key = `${season}|${week}|${stage}|${opponent}`
      if (seen.has(key)) return
      seen.add(key)
      max = Math.max(max, parseWeeklyPoints(g?.PF))
    })
    return max
  }

  // All single-week team scores, deduplicated to one row per franchise +
  // season + week + matchup. Used to rank Best/Worst Week within all-time
  // history. All-time rankings use current franchises only.
  // IMPORTANT: do NOT restrict this to Reg Season. Playoff and Consolation
  // games count as long as they are not double weeks.
  const allTimeWeeklyScores = useMemo(() => {
    const currentTeamKeys = new Set(
      allTime
        .map(r => normalizeTeamName(r?.Team))
        .filter(Boolean)
    )
    const scores = []
    const seen = new Set()
    games.forEach(g => {
      if (isDoubleWeek(g)) return

      const team = normalizeTeamName(g?.Team)
      const season = String(g?.Season || '').trim()
      const week = String(g?.Week || '').trim()
      const stage = String(g?.GameStage || '').trim()
      const opponent = normalizeTeamName(g?.Opponent)
      if (!team || !currentTeamKeys.has(team) || !season || !week) return

      const key = `${team}|${season}|${week}|${stage}|${opponent}`
      if (seen.has(key)) return
      seen.add(key)
      scores.push(parseWeeklyPoints(g?.PF))
    })
    return scores
  }, [allTime, games])

  // Best/Worst single-week score with its occurrence.
  // Double weeks are excluded, but all game stages are eligible.
  const getTeamWeeklyRecord = (teamName, mode = 'max') => {
    let record = null
    const seen = new Set()
    games.forEach(g => {
      if (normalizeTeamName(g?.Team) !== normalizeTeamName(teamName)) return
      if (isDoubleWeek(g)) return

      const season = String(g?.Season || '').trim()
      const week = String(g?.Week || '').trim()
      const stage = String(g?.GameStage || '').trim()
      const opponent = normalizeTeamName(g?.Opponent)
      if (!season || !week) return

      // Deduplicate the mirrored rows without excluding playoff/consolation.
      const key = `${season}|${week}|${stage}|${opponent}`
      if (seen.has(key)) return
      seen.add(key)

      const points = parseWeeklyPoints(g?.PF)
      const candidate = { points, season, week, stage, opponent }
      if (!record || (mode === 'min' ? points < record.points : points > record.points)) {
        record = candidate
      }
    })
    return record
  }

  // Longest winning/losing streaks for this franchise, using real GAME_FACTS_ALL
  // results across the full chronological history (all game stages).
  const getTeamStreakRecords = (teamName) => {
    const teamGames = games
      .filter(g => normalizeTeamName(g?.Team) === normalizeTeamName(teamName))
      .map(g => ({
        season: String(g?.Season || '').trim(),
        seasonNum: parseNumber(g?.Season || 0),
        week: String(g?.Week || '').trim(),
        weekNum: parseFloat(String(g?.Week || '0').replace(/[^0-9.]/g, '')) || 0,
        result: String(g?.Result || '').trim().toUpperCase(),
      }))
      .filter(g => g.result === 'W' || g.result === 'L')
      .sort((a, b) => a.seasonNum - b.seasonNum || a.weekNum - b.weekNum)

    let bestW = 0
    let bestL = 0
    let currentResult = ''
    let currentLength = 0
    let currentStartSeason = null
    let currentSeason = null
    const winningRanges = []
    const losingRanges = []

    const formatRange = (startSeason, endSeason) => {
      if (!startSeason || !endSeason) return ''
      const start = String(startSeason).slice(-2)
      const end = String(endSeason).slice(-2)
      return startSeason === endSeason ? `'${start}` : `'${start}-'${end}`
    }

    const recordRun = () => {
      if (currentLength <= 0 || !currentStartSeason || !currentSeason) return

      if (currentResult === 'W') {
        if (currentLength > bestW) {
          bestW = currentLength
          winningRanges.length = 0
          winningRanges.push(formatRange(currentStartSeason, currentSeason))
        } else if (currentLength === bestW) {
          winningRanges.push(formatRange(currentStartSeason, currentSeason))
        }
      }

      if (currentResult === 'L') {
        if (currentLength > bestL) {
          bestL = currentLength
          losingRanges.length = 0
          losingRanges.push(formatRange(currentStartSeason, currentSeason))
        } else if (currentLength === bestL) {
          losingRanges.push(formatRange(currentStartSeason, currentSeason))
        }
      }
    }

    teamGames.forEach(g => {
      if (g.result === currentResult) {
        currentLength += 1
        currentSeason = g.season
      } else {
        recordRun()
        currentResult = g.result
        currentLength = 1
        currentStartSeason = g.season
        currentSeason = g.season
      }
    })
    recordRun()

    return {
      bestW,
      bestL,
      bestWYearRanges: winningRanges.filter(Boolean),
      bestLYearRanges: losingRanges.filter(Boolean),
    }
  }

  // League-wide streak lengths for current franchises only. TEAM_ALL_TIME
  // defines the active/current franchise set used by this page's all-time records.
  const leagueStreakLengths = useMemo(() => {
    const bestW = []
    const bestL = []
    teams.forEach(t => {
      const record = getTeamStreakRecords(t.team)
      if (record.bestW > 0) bestW.push(record.bestW)
      if (record.bestL > 0) bestL.push(record.bestL)
    })
    return { bestW, bestL }
  }, [teams, games])


  // Number of regular-season single weeks in which the franchise was the
  // league's highest scorer. Ties for highest PF count for each tied team.
  const getTeamTopScoringWeeks = (teamName) => {
    const seen = new Set()
    let count = 0
    games.forEach(g => {
      if (normalizeTeamName(g?.Team) !== normalizeTeamName(teamName)) return
      if (String(g?.GameStage || '').trim() !== 'Reg Season') return
      if (isDoubleWeek(g)) return

      const season = String(g?.Season || '').trim()
      const week = String(g?.Week || '').trim()
      const key = `${season}|${week}`
      if (seen.has(key)) return

      const weekRows = games.filter(x =>
        String(x?.Season || '').trim() === season &&
        String(x?.Week || '').trim() === week &&
        String(x?.GameStage || '').trim() === 'Reg Season' &&
        !isDoubleWeek(x)
      )
      const maxPF = Math.max(...weekRows.map(x => parseNumber(x?.PF)))
      if (parseNumber(g?.PF) === maxPF) {
        seen.add(key)
        count++
      }
    })
    return count
  }

  // Most rostered (started or benched) and most started player for a team, from GAME_FACTS_ALL
  const getMostRosteredPlayers = (teamName) => {
    // Every franchise game counts as one roster appearance, including double weeks.
    // A double week is one Tapitas matchup, so it must contribute exactly one
    // rostered/started appearance rather than being excluded from these totals.
    const teamGames = games.filter(g => normalizeTeamName(g?.Team) === normalizeTeamName(teamName))
    const rosterCounts = new Map()
    const starterCounts = new Map()
    const metadata = new Map()

    // Use each team's actual game season instead of a global/selected season.
    teamGames.forEach(g => {
      const season = String(g?.Season || '').trim()
      const starters = extractRosterNames(g, 'S')
      const bench = extractRosterNames(g, 'B')
      ;[...starters, ...bench].forEach(name => {
        const identity = getPlayerIdentity(name, playerLookup)
        if (!identity) return
        if (!metadata.has(identity)) {
          metadata.set(identity, {
            rawName: String(name || '').trim(),
            name: getDisplayPlayerName(name, playerLookup),
            position: getPlayerPosition(name, playerLookup),
            seasons: new Set(),
          })
        }
        metadata.get(identity).seasons.add(season)
        rosterCounts.set(identity, (rosterCounts.get(identity) || 0) + 1)
      })
      starters.forEach(name => {
        const identity = getPlayerIdentity(name, playerLookup)
        if (identity) starterCounts.set(identity, (starterCounts.get(identity) || 0) + 1)
      })
    })

    // Most Rostered: one player only. Tie-breakers:
// 1) most starts, 2) alphabetical player name.
    const topRostered = Array.from(rosterCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        const startsA = starterCounts.get(a[0]) || 0
        const startsB = starterCounts.get(b[0]) || 0
        if (startsB !== startsA) return startsB - startsA
        const nameA = metadata.get(a[0])?.name || a[0]
        const nameB = metadata.get(b[0])?.name || b[0]
        return String(nameA).localeCompare(String(nameB))
      })
      .slice(0, 1)

    // Most Started: one player only. Tie-breakers:
    // 1) most rostered, 2) alphabetical player name.
    const topStarter = Array.from(starterCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        const rosterA = rosterCounts.get(a[0]) || 0
        const rosterB = rosterCounts.get(b[0]) || 0
        if (rosterB !== rosterA) return rosterB - rosterA
        const nameA = metadata.get(a[0])?.name || a[0]
        const nameB = metadata.get(b[0])?.name || b[0]
        return String(nameA).localeCompare(String(nameB))
      })
      .slice(0, 1)

    const build = entries => entries.map(([identity, count]) => {
      const meta = metadata.get(identity)
      return meta ? {
        ...meta,
        count,
        seasons: Array.from(meta.seasons).filter(Boolean).sort((a, b) => Number(a) - Number(b)),
      } : null
    }).filter(Boolean)

    return {
      mostRostered: build(topRostered),
      mostStarted: build(topStarter),
    }
  }


  const getTeam200Games = (teamName) => {
    const seen = new Set()
    let count = 0
    games.filter(g => String(g?.Team || '').trim() === teamName && !isDoubleWeek(g)).forEach(g => {
      const key = `${String(g?.Season || '')}|${String(g?.Week || '')}`
      if (seen.has(key)) return
      seen.add(key)
      if (parseNumber(g?.PF) >= 200) count++
    })
    return count
  }

  const getTeamPR1Weeks = (teamName) =>
    games.filter(g =>
      normalizeTeamName(g?.Team) === normalizeTeamName(teamName) &&
      String(g?.GameStage || '').trim() === 'Reg Season' &&
      parseNumber(g?.['Power Ranking']) === 1
    ).length

  // Unicorn seasons for a given team (seasons where standing == max standing that season)
  const getTeamUnicornSeasons = (teamName) => {
    const teamH = getTeamHistory(teamName)
    return teamH.filter(r => {
      const seasonRows = historySource.filter(h => String(h.Season) === String(r.Season))
      const maxStanding = Math.max(...seasonRows.map(s => Number(s.Standing) || 0))
      return Number(r.Standing) === maxStanding
    })
  }

  // ── League-wide values per stat, used to rank every team against all others ──
  const leagueStats = useMemo(() => {
    if (!allTime.length) return null

    const byTeam = {}
    teams.forEach(t => {
      const teamH = getTeamHistory(t.team)
      const titlesArr = teamH.filter(r => isTrueFlag(r?.Champion))
      const finalsArr = teamH.filter(r => isTrueFlag(r?.Reached_Final))
      const completedSeasonsArr = teamH.filter(r => parseNumber(r?.Standing) > 0)
      const unicornArr = getTeamUnicornSeasons(t.team)

      byTeam[t.team] = {
        titles: titlesArr.length,
        finals: finalsArr.length,
        playoffApps: parseNumber(t['Playoff Apps']),
        completedSeasons: completedSeasonsArr.length,
        playoffWins: parseNumber(t.PO_W),
        playoffGames: parseNumber(t.PO_W) + parseNumber(t.PO_L),
        rsWins: parseNumber(t.RS_W),
        rsLosses: parseNumber(t.RS_L),
        totalPoints: parseNumber(t.PF),
        unicorns: unicornArr.length,
        games200: getTeam200Games(t.team),
        pr1Weeks: getTeamPR1Weeks(t.team),
        weeklyMax: getTeamWeeklyMax(t.team),
        topScoringWeeks: getTeamTopScoringWeeks(t.team),
      }
    })
    return byTeam
  }, [allTime, history, historyRaw, games, teams])

  const allValuesFor = (key) => leagueStats ? Object.values(leagueStats).map(v => v[key]) : []

  const renderShell = (content) => (
    <main className="mx-root flex min-h-screen flex-col bg-[#EDEEF0] text-[#111]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .mx-root { font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; text-rendering:optimizeLegibility; font-variant-numeric:tabular-nums; }
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <Header />
      <section className="mx-auto w-full max-w-[1400px] px-2.5 pb-6 pt-0 sm:px-2 lg:px-4">
        {loading ? (
          <PageSkeleton />
        ) : content}
      </section>
      <SiteFooter />
    </main>
  )

  if (selected) {
    const teamH = getTeamHistory(selected.team)
    const teamH2H = getTeamH2H(selected.team)
    const titles = teamH.filter(r => isTrueFlag(r?.Champion))
    const unicorns = teamH.filter(r => {
      const seasonRows = historySource.filter(
        h => String(h.Season) === String(r.Season)
      )

      const maxStanding = Math.max(
        ...seasonRows.map(s => Number(s.Standing) || 0)
      )

      return Number(r.Standing) === maxStanding
    })
    // Only completed seasons (have Standing data) for best/worst
    const completedTeamH = teamH.filter(r => parseNumber(r?.Standing) > 0)
    const bestSeason = [...completedTeamH].sort((a, b) => parseNumber(b.RS_W) - parseNumber(a.RS_W))[0]
    const worstSeason = [...completedTeamH].sort((a, b) => parseNumber(a.RS_W) - parseNumber(b.RS_W))[0]
    const winPct = String(selected?.['W%'] || '').trim()
    const poWinPct = String(selected?.['PO_W%'] || '').trim()
    const games200 = getTeam200Games(selected.team)
    const pr1Weeks = getTeamPR1Weeks(selected.team)
    const weeklyMax = getTeamWeeklyMax(selected.team)
    const topScoringWeeks = getTeamTopScoringWeeks(selected.team)
    const weeklyBestRecord = getTeamWeeklyRecord(selected.team, 'max')
    const weeklyWorstRecord = getTeamWeeklyRecord(selected.team, 'min')
    const streakRecords = getTeamStreakRecords(selected.team)

    // The matchup page should open the first row of the exact confrontation
    // from the recorded week, already selected.
    const findWeeklyMatchupRow = record => {
      if (!record) return null
      return games.find(g =>
        normalizeTeamName(g?.Team) === normalizeTeamName(selected.team) &&
        String(g?.Season || '').trim() === String(record.season).trim() &&
        String(g?.Week || '').trim() === String(record.week).trim()
      ) || null
    }
    const weeklyBestGame = findWeeklyMatchupRow(weeklyBestRecord)
    const weeklyWorstGame = findWeeklyMatchupRow(weeklyWorstRecord)
    const weeklyBestHref = weeklyBestGame ? canonicalMatchupHref(weeklyBestGame, games) : '/matchups'
    const weeklyWorstHref = weeklyWorstGame ? canonicalMatchupHref(weeklyWorstGame, games) : '/matchups'

    // ── Build rank-aware subtitles ──────────────────────────────────
    const fmtYears = (rows) => rows.map(r => `'${String(r.Season).slice(-2)}`).join(', ')

    const titlesRank = leagueStats ? getOrdinalRankLabel(titles.length, allValuesFor('titles')) : null
    const titlesSub = titles.length ? (titlesRank || 'most all-time') : 'never'

    const finalsTeamH = teamH.filter(r => isTrueFlag(r?.Reached_Final))
    const finalsRank = leagueStats ? getOrdinalRankLabel(finalsTeamH.length, allValuesFor('finals')) : null
    const finalsSub = finalsTeamH.length ? (finalsRank || 'most all-time') : 'never'

    const poApps = parseNumber(selected['Playoff Apps']) || teamH.filter(r => isTrueFlag(r?.Made_Playoffs) || parseNumber(r?.PO_W) > 0 || parseNumber(r?.PO_L) > 0).length
    const completedSeasonsCount = teamH.filter(r => parseNumber(r?.Standing) > 0).length
    const poAppsRank = leagueStats ? getOrdinalRankLabel(poApps, allValuesFor('playoffApps')) : null
    const poAppsSub = poAppsRank || 'most all-time'

    const poWins = parseNumber(selected.PO_W)
    const poGames = poWins + parseNumber(selected.PO_L)
    const poWinsRank = leagueStats ? getOrdinalRankLabel(poWins, allValuesFor('playoffWins')) : null
    const poWinsSub = poWinsRank || 'most all-time'

    const compactOrdinal = (rank) => {
      if (!rank) return 'all-time'
      if (rank === 'most all-time') return '1st all-time'
      const m = String(rank).match(/^(\d+)(?:st|nd|rd|th)?\s+all-time$/i)
      if (!m) return rank
      const n = Number(m[1])
      const suffix = n % 100 >= 11 && n % 100 <= 13
        ? 'th'
        : n % 10 === 1 ? 'st'
        : n % 10 === 2 ? 'nd'
        : n % 10 === 3 ? 'rd'
        : 'th'
      return `${n}${suffix} all-time`
    }

    const rsWinsRank = leagueStats ? getOrdinalRankLabel(parseNumber(selected.RS_W), allValuesFor('rsWins')) : null
    const rsLossesRank = leagueStats ? getOrdinalRankLabel(parseNumber(selected.RS_L), allValuesFor('rsLosses')) : null
    const totalPointsRank = leagueStats ? getOrdinalRankLabel(parseNumber(selected.PF), allValuesFor('totalPoints')) : null

    const unicornsRank = leagueStats ? getOrdinalRankLabel(unicorns.length, allValuesFor('unicorns')) : null
    const unicornsSub = unicorns.length
      ? `${fmtYears(unicorns)}${unicornsRank === 'most all-time' ? ' (most all-time)' : ''}`
      : 'never'

    const games200Rank = leagueStats ? getOrdinalRankLabel(games200, allValuesFor('games200')) : null
    const pr1Rank = leagueStats ? getOrdinalRankLabel(pr1Weeks, allValuesFor('pr1Weeks')) : null
    const weeklyMaxRank = leagueStats ? getOrdinalRankLabel(weeklyMax, allValuesFor('weeklyMax')) : null
    const topScoringWeeksRank = leagueStats ? getOrdinalRankLabel(topScoringWeeks, allValuesFor('topScoringWeeks')) : null
    const weeklyBestRank = weeklyBestRecord ? getOrdinalRankLabel(weeklyBestRecord.points, allTimeWeeklyScores) : null
    const weeklyWorstRank = weeklyWorstRecord ? getAscendingOrdinalRankLabel(weeklyWorstRecord.points, allTimeWeeklyScores) : null
    const bestStreakRank = streakRecords.bestW ? getOrdinalRankLabel(streakRecords.bestW, leagueStreakLengths.bestW) : null
    const worstStreakRank = streakRecords.bestL ? getOrdinalRankLabel(streakRecords.bestL, leagueStreakLengths.bestL) : null
    const bestStreakSub = streakRecords.bestWYearRanges.length
      ? `${streakRecords.bestWYearRanges.join(', ')}${bestStreakRank ? ` · ${bestStreakRank}` : ''}`
      : '—'
    const worstStreakSub = streakRecords.bestLYearRanges.length
      ? `${streakRecords.bestLYearRanges.join(', ')}${worstStreakRank ? ` · ${worstStreakRank}` : ''}`
      : '—'

    // ── Most Rostered / Most Started player ─────────────────────────
    const { mostRostered, mostStarted } = getMostRosteredPlayers(selected.team)

    // ── Game Log (individual games, filterable) ──────────────────────
    const teamGames = games
      .filter(g => normalizeTeamName(g?.Team) === normalizeTeamName(selected.team))
      .sort((a, b) => {
        const sa = Number(a?.Season) || 0, sb = Number(b?.Season) || 0
        if (sb !== sa) return sb - sa
        return parseFloat(String(b?.Week || '0')) - parseFloat(String(a?.Week || '0'))
      })

    const logSeasonOptions = ['All', ...Array.from(new Set(teamGames.map(g => String(g?.Season || '').trim()).filter(Boolean))).sort((a, b) => b.localeCompare(a))]
    const logOpponentOptions = ['All', ...Array.from(new Set(teamGames.map(g => String(g?.Opponent || '').trim()).filter(Boolean))).sort()]
    // Filter by GameStage (column I in GAME_FACTS_ALL): Reg Season / Playoffs / Consolation.
    const logGameTypeOptions = ['All', ...Array.from(new Set(teamGames.map(g => String(g?.GameStage || '').trim()).filter(Boolean)))]

    const filteredLog = teamGames.filter(g => {
      if (logSeason !== 'All' && String(g?.Season || '').trim() !== logSeason) return false
      if (logOpponent !== 'All' && String(g?.Opponent || '').trim() !== logOpponent) return false
      const gameStage = String(g?.GameStage || '').trim()
      if (logGameType !== 'All' && gameStage !== logGameType) return false
      // 200+ filter: only single-week games; double weeks are excluded.
      if (log200Only && (isDoubleWeek(g) || parseNumber(g?.PF) < 200)) return false
      // Highest score of week (RS): Reg Season only, where every franchise is eligible.
      if (logHighestOnly) {
        if (gameStage !== 'Reg Season') return false
        const key = `${String(g?.Season || '').trim()}|${String(g?.Week || '').trim()}`
        if (parseNumber(g?.PF) !== weeklyMaxPFRS[key]) return false
      }
      return true
    })

    // ── Player Archive ───────────────────────────────────────────────
    // IMPORTANT: archive identity is the EXACT player name stored in
    // GAME_FACTS_ALL. Do NOT normalize/abbreviate this key and do NOT use
    // the player cache ID here. This prevents different players such as
    // "Javonte Williams" and "J. Williams" from being merged. The
    // abbreviation is presentation-only.
    // Player Archive includes double-weeks as one appearance. Their fantasy
    // points are normalized to the per-week value (total divided by 2), so
    // AVG remains comparable with single-week games. Double-weeks are never
    // eligible for BEST.
    // IMPORTANT: the archive identity is the EXACT name stored in GAME_FACTS_ALL.
    // Never normalize, abbreviate or merge names before counting.
    const playerArchiveGames = teamGames
    const playerStatsMap = new Map()
    playerArchiveGames.forEach(g => {
      const season = String(g?.Season || '').trim()
      const week = String(g?.Week || '').trim()
      const seenExactNamesInGame = new Set()
      extractPlayerAppearances(g).forEach(app => {
        const rawName = String(app.name || '').trim()
        if (!rawName || getNFLTeamLogo(rawName) || seenExactNamesInGame.has(rawName)) return
        seenExactNamesInGame.add(rawName)

        // The raw GAME_FACTS_ALL name is the sole key. The player cache is
        // used only afterwards for presentation metadata (photo/position/name).
        const key = `raw:${rawName}`
        if (!playerStatsMap.has(key)) {
          playerStatsMap.set(key, {
            archiveKey: key,
            name: getDisplayPlayerName(rawName, playerLookup),
            rawName,
            position: getPlayerPosition(rawName, playerLookup),
            appearances: 0,
            starts: 0,
            bench: 0,
            totalPts: 0,
            avgTotal: 0,
            avgCount: 0,
            bestPts: 0,
            seasons: new Set(),
            first: null,
            last: null,
          })
        }
        const entry = playerStatsMap.get(key)
        const normalizedPts = isDoubleWeek(g) ? app.pts / 2 : app.pts
        entry.seasons.add(season)
        entry.appearances += 1
        if (app.status === 'Starter') entry.starts += 1
        else entry.bench += 1
        entry.totalPts += normalizedPts
        if (!(app.status === 'Bench' && normalizedPts === 0)) {
          entry.avgTotal += normalizedPts
          entry.avgCount += 1
        }
        // Double-weeks contribute to AVG but are intentionally excluded from BEST.
        if (!isDoubleWeek(g)) entry.bestPts = Math.max(entry.bestPts, app.pts)
        const marker = {
          season: Number(season) || 0,
          week: parseFloat(week.replace(/[^0-9.]/g, '')) || 0,
        }
        if (!entry.first || marker.season < entry.first.season || (marker.season === entry.first.season && marker.week < entry.first.week)) entry.first = marker
        if (!entry.last || marker.season > entry.last.season || (marker.season === entry.last.season && marker.week > entry.last.week)) entry.last = marker
      })
    })

    const playerArchive = Array.from(playerStatsMap.values())
      .filter(p => p.position !== 'DEF')
      .map(p => {
        const validApps = p.avgCount
        return { ...p, avgPts: validApps ? p.avgTotal / validApps : 0 }
      })
      .sort((a, b) => b.appearances - a.appearances || b.starts - a.starts || a.name.localeCompare(b.name))

    // Player Archive already calculates AVG Pts and Best Pts for every player
    // who wore the franchise jersey. These leaders feed the team record cards.
    // Best average: só quem tem 10+ jogos pela franquia (mesma regra de
    // Records e Players)
    const bestAvgPlayer = playerArchive
      .filter(p => p.appearances >= 10)
      .sort((a, b) => b.avgPts - a.avgPts || b.appearances - a.appearances || b.starts - a.starts || a.name.localeCompare(b.name))[0] || null
    const bestScorePlayer = [...playerArchive]
      .sort((a, b) => b.bestPts - a.bestPts || b.appearances - a.appearances || b.starts - a.starts || a.name.localeCompare(b.name))[0] || null

    const playerPositionOptions = ['All', ...Array.from(new Set(playerArchive.map(p => p.position).filter(Boolean))).sort()]
    const playerSeasonOptions = ['All', ...Array.from(new Set(playerArchive.flatMap(p => Array.from(p.seasons)).filter(Boolean))).sort((a, b) => Number(b) - Number(a))]
    const playerMinAppOptions = ['All', ...[10, 20, 30].filter(n => playerArchive.some(p => p.appearances > n)).map(n => `>${n} appearances`)]

    const filteredPlayers = playerArchive
      .filter(p => normalizePlayerKey(p.name).includes(normalizePlayerKey(playerSearch)))
      .filter(p => playerPositionFilter === 'All' || p.position === playerPositionFilter)
      .filter(p => playerSeasonFilter === 'All' || p.seasons.has(playerSeasonFilter))
      .filter(p => playerMinApps === 'All' || p.appearances > Number(String(playerMinApps).replace(/[^0-9]/g, '')))
      .sort((a, b) => {
        if (playerSort === 'Starts') return b.starts - a.starts || b.appearances - a.appearances || a.name.localeCompare(b.name)
        if (playerSort === 'Benchs') return b.bench - a.bench || b.appearances - a.appearances || a.name.localeCompare(b.name)
        if (playerSort === 'Average Points') return b.avgPts - a.avgPts || b.appearances - a.appearances || a.name.localeCompare(b.name)
        if (playerSort === 'Highest Score') return b.bestPts - a.bestPts || b.appearances - a.appearances || a.name.localeCompare(b.name)
        return b.appearances - a.appearances || b.starts - a.starts || a.name.localeCompare(b.name)
      })

    const selectedPlayer = selectedPlayerKey
      ? playerArchive.find(p => p.archiveKey === selectedPlayerKey) || null
      : null

    const teamRecordLabel = `${parseNumber(selected.W)}–${parseNumber(selected.L)}`
    const teamSeasons = new Set(teamH.map(r => String(r?.Season || '').trim()).filter(Boolean)).size
    const recentSeason = teamH[0] || null
    const profileStats = [
      { label: 'Titles', value: titles.length, sub: titles.length ? fmtYears(titles) : '—', accent: 'gold' },
      { label: 'Finals', value: finalsTeamH.length, sub: finalsTeamH.length ? compactOrdinal(finalsRank) : '—', accent: 'navy' },
      { label: 'Playoff Apps', value: poApps, sub: compactOrdinal(poAppsRank), accent: 'navy' },
      { label: 'Playoff Wins', value: poWins, sub: compactOrdinal(poWinsRank), accent: 'green' },
      { label: 'RS Wins', value: parseNumber(selected.RS_W), sub: compactOrdinal(rsWinsRank), accent: 'green' },
      { label: 'Total Points', value: Math.round(parseNumber(selected.PF)).toLocaleString(), sub: compactOrdinal(totalPointsRank), accent: 'navy' },
    ]

    const recordHighlights = [
      { label: 'Best Week', value: weeklyBestRecord ? weeklyBestRecord.points.toFixed(1) : '—', sub: weeklyBestRecord ? `${weeklyBestRecord.season} · Wk ${weeklyBestRecord.week}${weeklyBestRank ? ` · ${weeklyBestRank}` : ''}` : 'Single weeks only', href: weeklyBestHref, accent: 'navy' },
      { label: 'Worst Week', value: weeklyWorstRecord ? weeklyWorstRecord.points.toFixed(1) : '—', sub: weeklyWorstRecord ? `${weeklyWorstRecord.season} · Wk ${weeklyWorstRecord.week}${weeklyWorstRank ? ` · ${weeklyWorstRank}` : ''}` : 'Single weeks only', href: weeklyWorstHref, accent: 'red' },
      { label: 'Best Streak', value: streakRecords.bestW ? `W${streakRecords.bestW}` : '—', sub: bestStreakSub, href: '/records', accent: 'green' },
      { label: 'Worst Streak', value: streakRecords.bestL ? `L${streakRecords.bestL}` : '—', sub: worstStreakSub, href: '/records', accent: 'red' },
      { label: '200+ Games', value: games200, sub: games200Rank || 'Single weeks only', href: '/records', accent: 'gold' },
      { label: 'PR #1 Weeks', value: pr1Weeks, sub: pr1Rank || 'Regular season', href: '/powerrankings', accent: 'gold' },
    ]

    const firstSeason = teamH.length ? String(teamH[teamH.length - 1]?.Season || '').trim() : ''
    const recentStanding = recentSeason ? parseNumber(recentSeason.Standing) : 0
    const seasonRowBySeason = new Map(teamH.map(r => [String(r?.Season || '').trim(), r]))

    const recordGroups = [
      {
        label: 'Single weeks',
        items: [
          { ...recordHighlights[0], valueClass: 'text-[#1E8E3E]' },
          { ...recordHighlights[1], valueClass: 'text-[#D01F2D]' },
          recordHighlights[4],
          { label: 'Week High Scorer', value: topScoringWeeks, sub: topScoringWeeksRank || 'Regular season', href: '/records' },
          recordHighlights[5],
        ],
      },
      {
        label: 'Streaks',
        items: [
          { ...recordHighlights[2], valueClass: 'text-[#1E8E3E]' },
          { ...recordHighlights[3], valueClass: 'text-[#D01F2D]' },
        ],
      },
      {
        label: 'Seasons',
        items: [
          { label: 'Best Season', value: bestSeason ? `${parseNumber(bestSeason.RS_W)}–${parseNumber(bestSeason.RS_L)}` : '—', sub: bestSeason ? `${bestSeason.Season} · ${Math.round(parseNumber(bestSeason.RS_PF)).toLocaleString()} pts` : '—', valueClass: 'text-[#1E8E3E]' },
          { label: 'Worst Season', value: worstSeason ? `${parseNumber(worstSeason.RS_W)}–${parseNumber(worstSeason.RS_L)}` : '—', sub: worstSeason ? `${worstSeason.Season} · ${Math.round(parseNumber(worstSeason.RS_PF)).toLocaleString()} pts` : '—', valueClass: 'text-[#D01F2D]' },
        ],
      },
    ]

    const franchisePlayers = [
      mostRostered.length > 0 ? { label: 'Most appearances', p: mostRostered[0], value: mostRostered[0].count } : null,
      mostStarted.length > 0 ? { label: 'Most starts', p: mostStarted[0], value: mostStarted[0].count } : null,
      bestAvgPlayer ? { label: 'Best average (10+ apps)', p: bestAvgPlayer, value: bestAvgPlayer.avgPts.toFixed(2) } : null,
      bestScorePlayer ? { label: 'Best single game', p: bestScorePlayer, value: bestScorePlayer.bestPts.toFixed(2) } : null,
    ].filter(Boolean)

    const hasLogFilters = logSeason !== 'All' || logOpponent !== 'All' || logGameType !== 'All' || log200Only || logHighestOnly
    const clearLogFilters = () => { setLogSeason('All'); setLogOpponent('All'); setLogGameType('All'); setLog200Only(false); setLogHighestOnly(false) }
    // Paginação lateral (20 por página) no Game Log e no Player Archive
    const PAGE_SIZE = 20
    const LOG_PAGE_SIZE = 25
    const logPages = Math.max(1, Math.ceil(filteredLog.length / LOG_PAGE_SIZE))
    const playerPages = Math.max(1, Math.ceil(filteredPlayers.length / PAGE_SIZE))
    const logPageSafe = Math.min(logPage, logPages - 1)
    const playerPageSafe = Math.min(playerPage, playerPages - 1)
    const visibleLog = filteredLog.slice(logPageSafe * LOG_PAGE_SIZE, (logPageSafe + 1) * LOG_PAGE_SIZE)
    const visiblePlayers = filteredPlayers.slice(playerPageSafe * PAGE_SIZE, (playerPageSafe + 1) * PAGE_SIZE)

    // ── Team switcher (same strip pattern as the Matchups scoreboard) ──
    const teamStrip = (
      <div className="mb-2 overflow-hidden rounded-xl bg-white">
        <div className="scroll-hide flex gap-1.5 overflow-x-auto p-2">
          <button
            type="button"
            onClick={showAllTeams}
            className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-[#F4F5F7] px-3 py-2 text-[13px] font-medium text-[#3F4757] transition-colors hover:bg-[#ECEEF1]"
          >
            <ChevronLeft className="h-4 w-4" />
            All teams
          </button>
          {teams.map(t => {
            const active = normalizeTeamName(t.team) === normalizeTeamName(selected.team)
            return (
              <button
                key={t.team}
                ref={active ? activeTeamChipRef : null}
                type="button"
                onClick={() => { if (!active) selectTeam(t) }}
                className={`flex w-[9.5rem] flex-shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${active ? 'bg-white ring-2 ring-inset ring-[#02275F]' : 'bg-[#F4F5F7] hover:bg-[#ECEEF1]'}`}
              >
                <TeamAvatar name={t.team} size="xs" />
                <div className="min-w-0">
                  <div className={`truncate text-[13px] leading-5 ${active ? 'font-semibold text-[#111]' : 'text-[#3F4757]'}`}>{shortName(t.team)}</div>
                  <div className="text-[11px] leading-4 tabular-nums text-[#6B7280]">{parseNumber(t.W)}–{parseNumber(t.L)}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )

    // ── Franchise header ───────────────────────────────────────────
    const heroCard = (
      <div className="mb-2 overflow-hidden rounded-xl bg-white">
        {/* Topo no azul da marca com a textura diagonal do hero da Home */}
        <div className="relative overflow-hidden bg-[#02275F] text-white">
          <BrandBackdrop />
          <div className="relative flex items-center gap-3 px-3 py-4 sm:gap-4 sm:px-5 sm:py-5">
            <span className="flex-shrink-0 rounded-full bg-white p-1 shadow-lg"><TeamAvatar name={selected.team} size="md" /></span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[22px] font-bold leading-tight tracking-tight sm:text-[30px]">{selected.team}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-white/75 sm:text-[13px]">
                <span className="font-semibold text-white">{teamRecordLabel}</span>
                <span>·</span><span>{winPct} win rate</span>
                <span>·</span><span>{teamSeasons} seasons</span>
                {firstSeason && <><span>·</span><span>Since {firstSeason}</span></>}
              </div>
              {titles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {titles.map(t => <span key={t.Season} className="inline-flex items-center gap-0.5 rounded-full bg-[#E8C766]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#E8C766]">🏆 {t.Season}</span>)}
                </div>
              )}
            </div>
            {recentSeason && (
              <div className="hidden flex-shrink-0 rounded-lg bg-white/10 px-4 py-2.5 text-right sm:block">
                <div className="text-[11px] text-white/70">{recentSeason.Season} season</div>
                <div className="mt-0.5 text-[20px] font-bold leading-none tabular-nums">{parseNumber(recentSeason.RS_W)}–{parseNumber(recentSeason.RS_L)}</div>
                <div className="mt-1 text-[11px] text-white/70">{recentStanding > 0 ? `Finished #${recentStanding}` : 'In progress'}</div>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px bg-[#EEF0F2] sm:grid-cols-6">
          {profileStats.map(stat => (
            <div key={stat.label} className="min-w-0 bg-white px-3 py-3 sm:px-5">
              <div className="truncate text-[11px] text-[#6B7280]">{stat.label}</div>
              <div className={`mt-1 text-[22px] font-bold leading-none tabular-nums ${stat.label === 'Titles' && titles.length ? 'text-[#B8860B]' : 'text-[#111]'}`}>{stat.value}</div>
              <div className="mt-1 truncate text-[11px] text-[#6B7280]">{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>
    )

    // ── Sidebar: records + franchise players ───────────────────────
    const recordsCard = (
      <CardShell title="Franchise Records" subtitle="All-time · current franchises ranking" sidebar>
        {recordGroups.map((group, gi) => (
          <CardGroup key={group.label} label={group.label} first={gi === 0}>
            {group.items.map(item => (
              <StatRow key={item.label} title={item.label} subtitle={item.sub} value={item.value} valueClass={item.valueClass} href={item.href} />
            ))}
          </CardGroup>
        ))}
        <div className="h-2 lg:h-3" />
      </CardShell>
    )

    const playersCard = franchisePlayers.length > 0 && (
      <CardShell title="Franchise Players" subtitle="All-time roster leaders" sidebar>
        {/* O 1º (mais vezes no elenco) em destaque, com a foto recortada */}
        {franchisePlayers[0] && (() => {
          const top = franchisePlayers[0]
          return (
            <button
              type="button"
              onClick={() => openPlayerProfile(top.p.archiveKey || `raw:${top.p.rawName}`)}
              className="group relative mx-3 mt-3 block w-[calc(100%-1.5rem)] overflow-hidden rounded-xl text-left text-white lg:mx-4 lg:w-[calc(100%-2rem)]"
            >
              <BrandBackdrop />
              <div className="absolute -right-2 bottom-0"><PlayerCutout sleeperId={getPlayerId(top.p.rawName, playerLookup)} name={top.p.name} className="h-[108px]" /></div>
              <div className="relative max-w-[60%] px-3 py-3">
                <div className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E8C766]">{top.label}</div>
                <div className="mt-1 truncate text-[15px] font-bold">{top.p.name}</div>
                <div className="mt-2 text-[24px] font-bold leading-none tabular-nums">{top.value}</div>
              </div>
            </button>
          )
        })()}
        <div className="py-1 lg:py-2">
          {franchisePlayers.slice(1).map(item => (
            <StatRow
              key={item.label}
              onClick={() => openPlayerProfile(item.p.archiveKey || `raw:${item.p.rawName}`)}
              left={<PlayerAvatar name={item.p.rawName} playerLookup={playerLookup} size={32} />}
              eyebrow={item.label}
              title={item.p.name}
              value={item.value}
            />
          ))}
        </div>
      </CardShell>
    )

    const h2hCard = (
      <CardShell title="Head to Head" subtitle="All-time vs every franchise" sidebar>
        <div className="py-1 lg:py-2">
          {teamH2H.map(h => {
            const total = h.wins + h.losses
            const pct = total > 0 ? Math.round((h.wins / total) * 100) : 0
            const color = h.wins > h.losses ? 'text-[#1E8E3E]' : h.wins < h.losses ? 'text-[#D01F2D]' : 'text-[#6B7280]'
            return (
              <StatRow
                key={h.opponent}
                href={`/rivalries?teamA=${encodeURIComponent(selected.team)}&teamB=${encodeURIComponent(h.opponent)}`}
                left={<TeamAvatar name={h.opponent} size="xs" />}
                title={shortName(h.opponent)}
                subtitle={`${h.games} games${h.streak ? ` · ${h.streak}` : ''}`}
                value={<div className="text-right"><div className={color}>{h.wins}–{h.losses}</div><div className="text-[11px] font-normal text-[#6B7280]">{pct}%</div></div>}
              />
            )
          })}
        </div>
      </CardShell>
    )

    // ── Main column ────────────────────────────────────────────────
    // Temporadas em lista compacta (coluna da direita): clicar filtra o Game Log.
    const seasonHistoryCard = (
      <CardShell title="Season History" subtitle={`${teamSeasons} seasons · tap to filter the game log`} sidebar action={logSeason !== 'All' ? <button type="button" onClick={() => setLogSeason('All')} className="flex-shrink-0 text-[12px] font-medium text-[#D01F2D] hover:underline">All</button> : null}>
        <div className="py-1 lg:py-2">
          {teamH.map(r => {
            const isChamp = isTrueFlag(r?.Champion)
            const isFinal = isTrueFlag(r?.Reached_Final)
            const isPlayoff = isTrueFlag(r?.Made_Playoffs)
            const standing = parseNumber(r.Standing)
            const active = logSeason === String(r.Season)
            return (
              <button
                key={r.Season}
                type="button"
                onClick={() => {
                  setLogSeason(active ? 'All' : String(r.Season)); setLogOpponent('All'); setLogGameType('All'); setLog200Only(false); setLogHighestOnly(false)
                  setMobileTeamView('games')
                  requestAnimationFrame(() => gameLogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
                }}
                className={`group grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 text-left transition-colors lg:px-4 ${active ? 'bg-[#EEF3FF]' : 'hover:bg-black/[0.03]'}`}
              >
                <span className={`text-[13px] font-bold tabular-nums ${active ? 'text-[#02275F]' : 'text-[#111]'}`}>{r.Season}</span>
                <span className="min-w-0 truncate text-[12px] text-[#6B7280]">
                  <span className="font-semibold tabular-nums text-[#111]">{parseNumber(r.RS_W)}–{parseNumber(r.RS_L)}</span>
                  {standing > 0 ? ` · #${standing}` : ''} · {Math.round(parseNumber(r.RS_PF)).toLocaleString()} pts
                </span>
                <span className="flex-shrink-0">
                  {isChamp ? <Tag tone="gold">🏆 Champ</Tag>
                    : isFinal ? <Tag tone="navy">Final</Tag>
                    : isPlayoff ? <Tag>Playoffs</Tag>
                    : standing > 0 ? <span className="text-[11px] text-[#9CA3AF]">—</span>
                    : <Tag tone="green">Live</Tag>}
                </span>
              </button>
            )
          })}
        </div>
      </CardShell>
    )

    const gameLogCard = (
      <div ref={gameLogRef} className="scroll-mt-3">
        <CardShell
          title="Game Log"
          subtitle={`${filteredLog.length} of ${teamGames.length} games`}
          withMenus
          action={hasLogFilters && <button type="button" onClick={clearLogFilters} className="flex-shrink-0 text-[12px] font-medium text-[#D01F2D] hover:underline">Clear filters</button>}
        >
          <div className="flex flex-wrap gap-1.5 border-b border-[#EEF0F2] px-3 py-2.5 lg:px-4">
            <FilterPill value={logSeason} onChange={setLogSeason} options={logSeasonOptions} label="Season" />
            <FilterPill value={logOpponent} onChange={setLogOpponent} options={logOpponentOptions} label="Opponent" displayOption={shortName} />
            <FilterPill value={logGameType} onChange={setLogGameType} options={logGameTypeOptions} label="Game type" displayOption={opt => ({ 'Reg Season': 'Regular season' }[opt] || opt)} />
            <ToggleChip active={log200Only} onClick={() => setLog200Only(p => !p)}>200+ pts</ToggleChip>
            <ToggleChip active={logHighestOnly} onClick={() => setLogHighestOnly(p => !p)}>Week high</ToggleChip>
          </div>
          <div className="overflow-hidden rounded-b-xl">
            <StableHeight resetKey={`log|${selected.team}|${filteredLog.length}`}>
              {visibleLog.map((g, i) => {
                const season = String(g?.Season || '').trim()
                const showSeasonHeader = i === 0 || season !== String(visibleLog[i - 1]?.Season || '').trim()
                const seasonRow = seasonRowBySeason.get(season)
                const result = String(g?.Result || '').trim().toUpperCase()
                const pf = parseWeeklyPoints(g?.PF)
                const pa = parseWeeklyPoints(g?.PA)
                const gType = String(g?.GameStage || '').trim()
                const key = `${season}|${String(g?.Week || '').trim()}`
                const isWeekHigh = gType === 'Reg Season' && pf > 0 && pf === weeklyMaxPFRS[key]
                return (
                  <React.Fragment key={`${season}-${g.Week}-${g.Opponent}-${i}`}>
                    {showSeasonHeader && (
                      <div className="flex items-center justify-between bg-[#F6F7F9] px-3 py-1.5 text-[12px] lg:px-4">
                        <span className="font-semibold text-[#111]">{season}</span>
                        {seasonRow && <span className="tabular-nums text-[#6B7280]">{parseNumber(seasonRow.W)}–{parseNumber(seasonRow.L)}</span>}
                      </div>
                    )}
                    <a href={canonicalMatchupHref(g, games)} className="group grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#F1F2F4] px-3 py-2.5 transition-colors hover:bg-[#F7F8FA] lg:grid-cols-[64px_minmax(0,1fr)_auto] lg:gap-3 lg:px-4">
                      <div className="text-[12px] tabular-nums text-[#6B7280]">Wk {g.Week}</div>
                      <div className="flex min-w-0 items-center gap-2">
                        <TeamAvatar name={g.Opponent} size="xs" />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">vs {shortName(g.Opponent)}</div>
                          {(gType !== 'Reg Season' || pf >= 200 || isWeekHigh) && (
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {gType && gType !== 'Reg Season' && <Tag>{gType}</Tag>}
                              {pf >= 200 && !isDoubleWeek(g) && <Tag tone="gold">200+</Tag>}
                              {isWeekHigh && <Tag tone="navy">Week high</Tag>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ResultBadge result={result} />
                        <span className="w-[92px] text-right text-[13px] tabular-nums">
                          <span className="font-semibold text-[#111]">{pf.toFixed(1)}</span>
                          <span className="text-[#9CA3AF]"> – {pa.toFixed(1)}</span>
                        </span>
                        <ChevronRight className="hidden h-4 w-4 text-[#A0A5AD] sm:block" />
                      </div>
                    </a>
                  </React.Fragment>
                )
              })}
              {filteredLog.length === 0 && <div className="py-12 text-center text-[13px] text-[#6B7280]">No games match these filters</div>}
            </StableHeight>
            {logPages > 1 && (
              <Pager page={logPageSafe} totalPages={logPages} total={filteredLog.length} pageSize={LOG_PAGE_SIZE} onPrev={() => setLogPage(Math.max(0, logPageSafe - 1))} onNext={() => setLogPage(Math.min(logPages - 1, logPageSafe + 1))} />
            )}
          </div>
        </CardShell>
      </div>
    )

    const playerArchiveCard = (
      <CardShell title="Player Archive" subtitle={`${filteredPlayers.length} of ${playerArchive.length} players who suited up for ${shortName(selected.team)}`} withMenus>
        <div className="flex flex-wrap gap-1.5 border-b border-[#EEF0F2] px-3 py-2.5 lg:px-4">
          <FilterPill value={playerSort} onChange={setPlayerSort} options={['Appearances', 'Starts', 'Benchs', 'Average Points', 'Highest Score']} label="Sort" neutral />
          <FilterPill value={playerPositionFilter} onChange={setPlayerPositionFilter} options={playerPositionOptions} label="Position" />
          <FilterPill value={playerSeasonFilter} onChange={setPlayerSeasonFilter} options={playerSeasonOptions} label="Season" />
          {playerMinAppOptions.length > 1 && <FilterPill value={playerMinApps} onChange={setPlayerMinApps} options={playerMinAppOptions} label="Min apps" />}
          <input
            value={playerSearch}
            onChange={e => setPlayerSearch(e.target.value)}
            placeholder="Search player…"
            className="h-8 w-full min-w-0 rounded-full bg-[#F4F5F7] px-3 text-[12px] text-[#111] outline-none placeholder:text-[#9CA3AF] focus:bg-white focus:ring-1 focus:ring-[#111] sm:w-48"
          />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_52px_52px] gap-2 border-b border-[#EEF0F2] px-3 py-2 text-[11px] font-medium text-[#6B7280] sm:grid-cols-[minmax(0,1fr)_48px_48px_56px_56px] lg:px-4">
          <span>Player</span>
          <span className="hidden text-right sm:block">Apps</span>
          <span className="hidden text-right sm:block">Starts</span>
          <span className="text-right">Avg</span>
          <span className="text-right">Best</span>
        </div>
        <div className="overflow-hidden rounded-b-xl">
          <StableHeight resetKey={`players|${selected.team}|${filteredPlayers.length}`}>
          {visiblePlayers.map(player => (
            <button
              key={player.archiveKey}
              type="button"
              onClick={() => openPlayerProfile(player.archiveKey)}
              className="group grid w-full grid-cols-[minmax(0,1fr)_52px_52px] items-center gap-2 border-b border-[#F1F2F4] px-3 py-2 text-left transition-colors hover:bg-[#F7F8FA] sm:grid-cols-[minmax(0,1fr)_48px_48px_56px_56px] lg:px-4"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <PlayerAvatar name={player.rawName} playerLookup={playerLookup} size={34} />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">{player.name}</span>
                    {player.position && <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${getPositionBadgeClasses(player.position)}`}>{player.position}</span>}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-[#6B7280]">
                    {formatSeasonList(Array.from(player.seasons))}
                    <span className="sm:hidden"> · {player.appearances} apps · {player.starts} starts</span>
                  </div>
                </div>
              </div>
              <span className="hidden text-right text-[13px] tabular-nums text-[#3F4757] sm:block">{player.appearances}</span>
              <span className="hidden text-right text-[13px] tabular-nums text-[#3F4757] sm:block">{player.starts}</span>
              <span className="text-right text-[13px] font-semibold tabular-nums text-[#111]">{player.avgPts.toFixed(1)}</span>
              <span className="text-right text-[13px] font-semibold tabular-nums text-[#111]">{player.bestPts.toFixed(1)}</span>
            </button>
          ))}
          {filteredPlayers.length === 0 && <div className="py-12 text-center text-[13px] text-[#6B7280]">No players found</div>}
          </StableHeight>
          {playerPages > 1 && (
            <Pager page={playerPageSafe} totalPages={playerPages} total={filteredPlayers.length} pageSize={PAGE_SIZE} onPrev={() => setPlayerPage(Math.max(0, playerPageSafe - 1))} onNext={() => setPlayerPage(Math.min(playerPages - 1, playerPageSafe + 1))} />
          )}
        </div>
      </CardShell>
    )

    const PlayerProfile = selectedPlayer ? (
      <PlayerProfileModal
        key={selectedPlayer.rawName}
        rawName={selectedPlayer.rawName}
        displayName={selectedPlayer.name}
        position={selectedPlayer.position}
        playerId={getPlayerId(selectedPlayer.rawName, playerLookup)}
        games={games}
        initialTeams={[selected.team]}
        initialTab={profileTab}
        onClose={closePlayerProfile}
      />
    ) : nflProfile ? (
      <PlayerProfileModal
        key={`nfl-${nflProfile.id}`}
        rawName={resolveFactsName(buildFactsNameIndex(games), nflProfile, nameOwners)}
        displayName={nflProfile.name}
        position={nflProfile.pos}
        playerId={nflProfile.id}
        games={games}
        initialTeams={[selected.team]}
        initialTab={profileTab}
        onClose={() => setNflProfile(null)}
      />
    ) : null

    // Jogador vindo do Sleeper (transações, status do elenco): se ele está no
    // Player Archive do time abre por ali; senão abre direto pelo ID do Sleeper
    // (ex.: recém-chegado que ainda não jogou pela franquia)
    const openSleeperPlayer = (p, tab = null) => {
      if (!p) return
      const key = `raw:${resolveFactsName(buildFactsNameIndex(games), p, nameOwners)}`
      if (playerArchive.some(x => x.archiveKey === key)) openPlayerProfile(key, selected.team, tab)
      else { setProfileTab(tab); setNflProfile(p) }
    }
    const transactionsCard = <TeamTransactionsCard team={selected.team} onOpenPlayer={p => openSleeperPlayer(p)} />

    const rosterStatusCard = <TeamNflNotice team={selected.team} onOpenPlayer={p => openSleeperPlayer(p, p.focus || null)} />

    const mobileTabs = [['overview', 'Overview'], ['games', 'Game Log'], ['players', 'Players'], ['h2h', 'H2H']]

    return renderShell(
      <>
        {teamStrip}
        {heroCard}
        {/* Abas (só no mobile/tablet — no desktop os cards ficam nas laterais) */}
        <div className="mb-2 flex overflow-hidden rounded-xl bg-white lg:hidden">
          {mobileTabs.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setMobileTeamView(key)} className={`flex-1 border-b-2 px-2 py-2.5 text-[13px] transition-colors ${mobileTeamView === key ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280]'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Grid: status do elenco + records + jogadores | game log | temporadas + head to head.
            O Player Archive ocupa a linha inteira embaixo (desktop). */}
        <div data-sticky-cols className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)_260px] lg:items-start lg:gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px] xl:gap-5">
          <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC] hidden lg:block">
            {rosterStatusCard}
            {transactionsCard}
            {recordsCard}
          </aside>

          <div className="min-w-0">
            <div className={`${mobileTeamView === 'overview' ? 'block' : 'hidden'} lg:hidden`}>
              {rosterStatusCard}
              {transactionsCard}
              {seasonHistoryCard}
              {recordsCard}
              {playersCard}
            </div>
            <div className={`${mobileTeamView === 'games' ? 'block' : 'hidden'} lg:block`}>{gameLogCard}</div>
            <div className={`${mobileTeamView === 'players' ? 'block' : 'hidden'} lg:hidden`}>{playerArchiveCard}</div>
            <div className={`${mobileTeamView === 'h2h' ? 'block' : 'hidden'} lg:hidden`}>{h2hCard}</div>
          </div>

          <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC] hidden lg:block">
            {seasonHistoryCard}
            {playersCard}
            {h2hCard}
          </aside>
        </div>
        <div className="hidden lg:block">{playerArchiveCard}</div>
        {PlayerProfile}
      </>
    )
  }

  // ── All franchises (standings-style table) ───────────────────────
  const champions = historySource
    .filter(r => isTrueFlag(r?.Champion))
    .map(r => ({ season: String(r?.Season || '').trim(), team: String(r?.Team || '').trim() }))
    .sort((a, b) => Number(b.season) - Number(a.season))

  // Cards das franquias com a trajetória (vitórias na temporada regular por ano).
  const franchiseCards = teams.map((team, i) => {
    const teamHistory = getTeamHistory(team.team)
    const seasonsAsc = [...teamHistory].sort((x, y) => Number(x.Season) - Number(y.Season))
    const titles = teamHistory.filter(r => isTrueFlag(r?.Champion))
    const finals = teamHistory.filter(r => isTrueFlag(r?.Reached_Final) && !isTrueFlag(r?.Champion)).length
    const latest = teamHistory[0] || null
    const completed = seasonsAsc.filter(r => parseNumber(r?.Standing) > 0)
    const avgWins = completed.length ? completed.reduce((sum, r) => sum + parseNumber(r.RS_W), 0) / completed.length : 0
    const lastCompleted = completed[completed.length - 1] || null
    return { team, seasonsAsc, titles, finals, latest, avgWins, lastCompleted, winsRank: i + 1 }
  })
  const maxSeasonWins = Math.max(1, ...franchiseCards.flatMap(c => c.seasonsAsc.map(r => parseNumber(r.RS_W))))
  const sortedCards = [...franchiseCards].sort((a, b) =>
    teamsSort === 'titles' ? (b.titles.length - a.titles.length) || (parseNumber(b.team.W) - parseNumber(a.team.W))
      : teamsSort === 'name' ? a.team.team.localeCompare(b.team.team)
        : parseNumber(b.team.W) - parseNumber(a.team.W)
  )

  const Trajectory = ({ seasons }) => {
    const W = 260, H = 64, padX = 10, padT = 16, padB = 6
    if (!seasons.length) return <div className="h-16" />
    const step = seasons.length > 1 ? (W - padX * 2) / (seasons.length - 1) : 0
    const pts = seasons.map((r, i) => ({
      x: seasons.length > 1 ? padX + step * i : W / 2,
      y: padT + (1 - parseNumber(r.RS_W) / maxSeasonWins) * (H - padT - padB),
      wins: parseNumber(r.RS_W),
      season: String(r.Season),
      champ: isTrueFlag(r?.Champion),
      final: isTrueFlag(r?.Reached_Final),
    }))
    const line = pts.map(p => `${p.x},${p.y}`).join(' ')
    const area = `${pts[0].x},${H - padB} ${line} ${pts[pts.length - 1].x},${H - padB}`
    // Rótulos em HTML (o SVG estica): vitórias em cima de cada ponto e o ano embaixo
    return (
      <div>
      <div className="relative h-16">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 block h-16 w-full" preserveAspectRatio="none" role="img">
        <polygon points={area} fill="#02275F" opacity="0.07" />
        <polyline points={line} fill="none" stroke="#02275F" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {pts.map(p => (
          <circle key={p.season} cx={p.x} cy={p.y} r={p.champ ? 4.5 : 3} fill={p.champ ? '#B8860B' : p.final ? '#02275F' : '#fff'} stroke={p.champ ? '#fff' : '#02275F'} strokeWidth="1.5" vectorEffect="non-scaling-stroke">
            <title>{`${p.season}: ${p.wins} wins${p.champ ? ' · Champion' : p.final ? ' · Final' : ''}`}</title>
          </circle>
        ))}
      </svg>
        {pts.map(p => (
          <span
            key={p.season}
            className={`absolute -translate-x-1/2 text-[9px] font-semibold leading-none tabular-nums ${p.champ ? 'text-[#8D6A00]' : 'text-[#3F4757]'}`}
            style={{ left: `${(p.x / W) * 100}%`, top: `calc(${(p.y / H) * 100}% - 13px)` }}
          >
            {p.wins}
          </span>
        ))}
      </div>
      <div className="relative mt-1 h-3">
        {pts.map(p => (
          <span key={p.season} className="absolute -translate-x-1/2 text-[9px] leading-none tabular-nums text-[#9CA3AF]" style={{ left: `${(p.x / W) * 100}%` }}>
            &apos;{p.season.slice(2)}
          </span>
        ))}
      </div>
      </div>
    )
  }

  const teamsGrid = (
    <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {sortedCards.map(({ team, seasonsAsc, titles, finals, latest, avgWins, lastCompleted, winsRank }) => {
        const latestWins = latest ? parseNumber(latest.RS_W) : 0
        const latestStanding = latest ? parseNumber(latest.Standing) : 0
        const trendUp = lastCompleted ? parseNumber(lastCompleted.RS_W) >= avgWins : true
        return (
          <button key={team.team} type="button" onClick={() => selectTeam(team)} className="group flex flex-col rounded-xl bg-white p-3 text-left transition-shadow hover:shadow-md lg:p-4">
            <div className="flex items-center gap-3">
              <TeamAvatar name={team.team} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold text-[#111] group-hover:text-[#D01F2D]">{team.team}</div>
                <div className="text-[12px] text-[#6B7280]"><span className="font-semibold tabular-nums text-[#111]">{parseNumber(team.W)}–{parseNumber(team.L)}</span> · {String(team?.['W%'] || '').trim()} · #{winsRank} in wins</div>
              </div>
            </div>

            {/* Estante de troféus */}
            <div className="mt-3 flex min-h-[22px] flex-wrap items-center gap-1">
              {titles.map(t => <span key={t.Season} title={`Champion ${t.Season}`} className="inline-flex items-center gap-0.5 rounded-full bg-[#FFF2B8] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B5A00]">🏆 {String(t.Season).slice(2)}</span>)}
              {finals > 0 && <span className="rounded-full bg-[#EEF3FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#02275F]">{finals} final{finals > 1 ? 's' : ''}</span>}
              {titles.length === 0 && finals === 0 && <span className="text-[11px] text-[#9CA3AF]">Trophy shelf still empty</span>}
            </div>

            {/* Trajetória */}
            <div className="mt-2">
              <div className="mb-1 text-[10px] text-[#9CA3AF]">Regular-season wins per season</div>
              <Trajectory seasons={seasonsAsc} />
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#F1F2F4] pt-2.5 text-[12px]">
              <span className="text-[#6B7280]">{latest?.Season} · <span className="font-semibold tabular-nums text-[#111]">{latestWins}–{latest ? parseNumber(latest.RS_L) : 0}</span>{latestStanding > 0 ? ` · #${latestStanding}` : ' · live'}</span>
              <span className={`flex items-center gap-0.5 font-semibold ${trendUp ? 'text-[#1E8E3E]' : 'text-[#D01F2D]'}`}>
                {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {lastCompleted ? `'${String(lastCompleted.Season).slice(2)} ` : ''}{trendUp ? 'above' : 'below'} avg
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )

  const championsCard = champions.length > 0 && (
    <CardShell title="Champions" subtitle="Every Tapitas League title" sidebar>
      <div className="py-1 lg:py-2">
        {champions.map(c => {
          const current = teams.find(t => normalizeTeamName(t.team) === normalizeTeamName(c.team))
          return (
            <StatRow
              key={`${c.season}-${c.team}`}
              onClick={current ? () => selectTeam(current) : undefined}
              left={<TeamAvatar name={c.team} size="xs" />}
              title={c.team}
              value={c.season}
              valueClass="text-[#6B7280]"
            />
          )
        })}
      </div>
    </CardShell>
  )

  return renderShell(
    <>
      <PageBar title="Teams">
        {[['wins', 'Most wins'], ['titles', 'Most titles'], ['name', 'A–Z']].map(([key, label]) => (
          <BarTab key={key} active={teamsSort === key} onClick={() => setTeamsSort(key)}>{label}</BarTab>
        ))}
      </PageBar>
      <div data-sticky-cols className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
        <div className="min-w-0">{teamsGrid}</div>
        <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC]">{championsCard}</aside>
      </div>
    </>
  )
}
