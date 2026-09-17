'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Trophy, Activity, Target, Flame, TrendingUp, TrendingDown, Star, Swords, ChevronRight, Skull, Zap, Filter, Users } from 'lucide-react'
import Header from '../components/Header'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

// Sleeper player data is loaded directly from Sleeper when a Player Profile
// is opened. The API returns the complete NFL player map; cache the promise
// in this module so the 5MB payload is not downloaded repeatedly.
let SLEEPER_PLAYERS_PROMISE = null

async function fetchSleeperPlayers() {
  if (!SLEEPER_PLAYERS_PROMISE) {
    SLEEPER_PLAYERS_PROMISE = fetch('https://api.sleeper.app/v1/players/nfl')
      .then(res => {
        if (!res.ok) throw new Error(`Sleeper players request failed: ${res.status}`)
        return res.json()
      })
      .then(data => data && typeof data === 'object' ? data : {})
      .catch(error => {
        SLEEPER_PLAYERS_PROMISE = null
        throw error
      })
  }
  return SLEEPER_PLAYERS_PROMISE
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

async function safeFetch(url, timeoutMs = 25000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
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
    <div className="flex-shrink-0 flex items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F] font-black text-white"
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
    <div className="flex-shrink-0 overflow-hidden rounded-full border-2 border-[#0A0A0A] bg-[#F7F6F2]" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : defenseLogo ? (
        <img src={defenseLogo} alt={name} className="h-full w-full object-contain bg-white p-1" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#16274F] font-black text-white" style={{ fontSize: size * 0.32 }}>
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

function isDoubleWeek(game) {
  const week = String(game?.Week || '').trim()
  return week.includes('-') || week.includes('&')
}

function getPositionBadgeClasses(position) {
  const colors = {
    QB: 'border-[#0A0A0A] bg-[#D01F2D] text-white',
    RB: 'border-[#0A0A0A] bg-[#1E8E3E] text-white',
    WR: 'border-[#0A0A0A] bg-[#5B2CA0] text-white',
    TE: 'border-[#0A0A0A] bg-[#B8860B] text-white',
    FLEX: 'border-[#0A0A0A] bg-[#3F4757] text-white',
    K: 'border-[#0A0A0A] bg-[#6B7280] text-white',
    DEF: 'border-[#0A0A0A] bg-[#3F4757] text-white',
  }
  return colors[String(position || '').toUpperCase()] || 'border-[#0A0A0A]/20 bg-[#F7F6F2] text-[#16274F]'
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

function HeaderFilter({ value, onChange, options, label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(p => !p)} className={`inline-flex items-center gap-1 uppercase tracking-[0.18em] hover:text-[#D01F2D] ${value !== 'All' ? 'text-[#D01F2D]' : ''}`}>
        {value === 'All' ? label : value}
        <span className="text-[9px] text-[#D01F2D]">⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[150px] overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
          <div className="max-h-56 overflow-y-auto">
            {options.map(opt => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false) }} className={`block w-full px-3 py-2 text-left text-[10px] font-black uppercase hover:bg-[#F7F6F2] ${opt === value ? 'bg-[#FDEDEE] text-[#D01F2D]' : 'text-[#3F4757]'}`}>
                {opt === 'All' ? label : opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Select({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(p => !p)}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 border-2 px-4 py-2.5 text-sm font-bold transition-all ${disabled ? 'cursor-not-allowed border-[#0A0A0A]/20 bg-[#F7F6F2] text-[#6B7280]/50'
          : open ? 'border-[#D01F2D] bg-white text-[#16274F] tp-shadow-red-sm'
            : 'border-[#0A0A0A] bg-white text-[#16274F] hover:bg-[#F7F6F2]'
          }`}
      >
        <span className="truncate">{value === 'All' ? placeholder : value}</span>
        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-[#6B7280] transition-transform duration-200 ${open ? 'rotate-90 text-[#D01F2D]' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
          <div className="max-h-56 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-bold transition-all hover:bg-[#F7F6F2] ${opt === value ? 'text-[#D01F2D] bg-[#FDEDEE]' : 'text-[#3F4757]'}`}
              >
                {opt === value && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#D01F2D]" />}
                <span className={opt === value ? '' : 'ml-[14px]'}>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CompactCheckFilter({ value, onChange, options, label, multiple = false, displayOption }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : [value]
  const activeCount = multiple ? selectedValues.filter(v => v !== 'All').length : (value !== 'All' ? 1 : 0)
  const formatOption = displayOption || (opt => opt)
  const display = value === 'All' || (multiple && selectedValues.length === 0)
    ? label
    : multiple
      ? `${activeCount} selected`
      : formatOption(value)

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`flex min-h-9 w-full items-center justify-between gap-2 border-2 bg-white px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.12em] transition-all ${open ? 'border-[#D01F2D] shadow-[2px_2px_0_#D01F2D]' : 'border-[#16274F]/20 hover:border-[#16274F]/50'} ${activeCount ? 'text-[#D01F2D]' : 'text-[#16274F]'}`}
      >
        <span className="truncate">{display}</span>
        <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center border text-[9px] transition-transform ${open ? 'rotate-180 border-[#D01F2D] text-[#D01F2D]' : 'border-[#16274F]/30 text-[#6B7280]'}`}>⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+5px)] z-[70] w-[220px] overflow-hidden border-2 border-[#16274F] bg-white shadow-[4px_4px_0_#16274F]">
          <div className="border-b border-[#16274F]/10 bg-[#F7F6F2] px-3 py-2 text-[8px] font-black uppercase tracking-[0.18em] text-[#6B7280]">{label}</div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {options.map(opt => {
              const checked = multiple ? selectedValues.includes(opt) : opt === value
              return (
                <label key={opt} className="flex cursor-pointer items-center gap-2 px-2.5 py-2 text-[10px] font-bold text-[#16274F] hover:bg-[#F7F6F2]">
                  <input
                    type={multiple ? 'checkbox' : 'checkbox'}
                    checked={checked}
                    onChange={() => {
                      if (multiple) {
                        const next = opt === 'All'
                          ? ['All']
                          : checked
                            ? selectedValues.filter(v => v !== opt)
                            : [...selectedValues.filter(v => v !== 'All'), opt]
                        onChange(next.length ? next : ['All'])
                      } else {
                        onChange(opt)
                        setOpen(false)
                      }
                    }}
                    className="h-4 w-4 flex-shrink-0 accent-[#16274F]"
                  />
                  <span className={checked ? 'font-black text-[#16274F]' : ''}>{opt === 'All' ? `All ${label}` : formatOption(opt)}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
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


function canonicalPlayerKey(rawName, allAppearances, playerLookup) {
  const raw = String(rawName || '').trim()
  const data = playerLookup?.get(normalizePlayerKey(raw))
  const fullName = String(data?.fullName || '').trim()
  if (!fullName) return `raw:${raw}`

  // Resolve identity before abbreviation. If the full name exists anywhere in
  // GAME_FACTS_ALL, it is the canonical identity. This keeps homonyms such as
  // Bijan Robinson and Brian Robinson separate even when their display names
  // are abbreviated similarly.
  const fullKey = normalizePlayerKey(fullName)
  const hasFullNameInFacts = !!fullKey && allAppearances.some(a => normalizePlayerKey(a.name) === fullKey)
  if (hasFullNameInFacts) return `full:${fullKey}`

  const parts = fullName.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `abbr:${normalizePlayerKey(`${parts[0][0]}. ${parts.at(-1)}`)}`
  return `raw:${raw}`
}

function buildCanonicalIdentityMap(allAppearances, playerLookup) {
  const fullNamesInFacts = new Set()
  allAppearances.forEach(a => {
    const key = normalizePlayerKey(a?.name)
    if (key) fullNamesInFacts.add(key)
  })
  const map = new Map()
  allAppearances.forEach(a => {
    const raw = String(a?.name || '').trim()
    if (!raw) return
    const data = playerLookup?.get(normalizePlayerKey(raw))
    const fullName = String(data?.fullName || '').trim()
    let key
    if (fullName && fullNamesInFacts.has(normalizePlayerKey(fullName))) {
      key = `full:${normalizePlayerKey(fullName)}`
    } else if (fullName) {
      const parts = fullName.split(/\s+/).filter(Boolean)
      key = parts.length >= 2
        ? `abbr:${normalizePlayerKey(`${parts[0][0]}. ${parts.at(-1)}`)}`
        : `raw:${normalizePlayerKey(raw)}`
    } else {
      key = `raw:${normalizePlayerKey(raw)}`
    }
    if (!map.has(normalizePlayerKey(raw))) map.set(normalizePlayerKey(raw), key)
  })
  return map
}

function makePlayerIdentityMatcher(player, identityMap) {
  const aliases = new Set(Array.isArray(player?.aliases) ? player.aliases.map(normalizePlayerKey) : [])
  return (name) => {
    const rawKey = normalizePlayerKey(name)
    const key = identityMap.get(rawKey) || `raw:${rawKey}`
    return key === player.identityKey || aliases.has(rawKey)
  }
}

function formatSeasonList(seasons) {
  const years = Array.from(new Set(seasons || [])).map(Number).filter(Number.isFinite).sort((a,b)=>a-b)
  if (!years.length) return '—'
  const parts = []
  let start = years[0], prev = years[0]
  const flush = () => {
    const count = prev - start + 1
    if (count >= 3) parts.push(`'${String(start).slice(-2)}-'${String(prev).slice(-2)}`)
    else for (let y=start; y<=prev; y++) parts.push(`'${String(y).slice(-2)}`)
  }
  for (let i=1;i<years.length;i++) {
    if (years[i] === prev + 1) prev = years[i]
    else { flush(); start = prev = years[i] }
  }
  flush()
  return parts.join(' ')
}

function PlayerProfile({ player, games, playerLookup, onClose }) {
  const [selectedTeams, setSelectedTeams] = useState([])
  const [opponentFilter, setOpponentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [resultFilter, setResultFilter] = useState('All')
  const [stageFilter, setStageFilter] = useState('All')
  const [sort, setSort] = useState({ key: 'season', seasonDir: 'desc', weekDir: 'desc', dir: 'desc' })
  const [sleeperInfo, setSleeperInfo] = useState(null)
  const [sleeperLoading, setSleeperLoading] = useState(false)

  const gameAppearances = useMemo(() => games.map(g => extractPlayerAppearances(g)), [games])
  const allAppearances = useMemo(() => gameAppearances.flat(), [gameAppearances])
  const identityMatcher = useMemo(() => {
    const targetRaw = String(player?.rawName || '').trim()
    return (name) => String(name || '').trim() === targetRaw
  }, [player?.rawName])

  const clubs = useMemo(() => {
    const map = new Map()
    games.forEach(g => {
      if (!extractPlayerAppearances(g).some(a => identityMatcher(a.name))) return
      const team = String(g?.Team || '').trim()
      if (!team) return
      if (!map.has(normalizeTeamName(team))) map.set(normalizeTeamName(team), { team, seasons: new Set() })
      map.get(normalizeTeamName(team)).seasons.add(String(g?.Season || '').trim())
    })
    return Array.from(map.values()).map(c => ({...c, seasons:Array.from(c.seasons).sort((a,b)=>Number(a)-Number(b))})).sort((a,b)=>normalizeTeamName(a.team).localeCompare(normalizeTeamName(b.team)))
  }, [games, identityMatcher])

  useEffect(() => {
    setSelectedTeams(clubs.map(c => c.team))
  }, [player?.identityKey, clubs.map(c=>c.team).join('|')])

  useEffect(() => {
    let cancelled=false
    const id=getPlayerId(player.rawName, playerLookup)
    if (!id) { setSleeperInfo(null); return () => {cancelled=true} }
    setSleeperLoading(true)
    fetchSleeperPlayers().then(data=>{ if(!cancelled) setSleeperInfo(data?.[String(id)] || null) }).catch(()=>{if(!cancelled)setSleeperInfo(null)}).finally(()=>{if(!cancelled)setSleeperLoading(false)})
    return ()=>{cancelled=true}
  }, [player?.identityKey, player?.rawName, playerLookup])

  useEffect(() => {
    const prev=document.body.style.overflow
    document.body.style.overflow='hidden'
    const esc=e=>{if(e.key==='Escape')onClose()}
    document.addEventListener('keydown',esc)
    return ()=>{document.body.style.overflow=prev;document.removeEventListener('keydown',esc)}
  }, [onClose])

  const profileGames = useMemo(() => games.flatMap(g => {
    const app=extractPlayerAppearances(g).find(a=>identityMatcher(a.name))
    if(!app) return []
    const team=String(g?.Team||'').trim()
    if(!selectedTeams.some(t=>normalizeTeamName(t)===normalizeTeamName(team))) return []
    const doubleWeek=isDoubleWeek(g)
    return [{
      season:String(g?.Season||'').trim(), week:String(g?.Week||'').trim(), team,
      opponent:String(g?.Opponent||'').trim(), status:app.status,
      pts:app.pts, avgPts:doubleWeek ? app.pts/2 : app.pts,
      isDoubleWeek:doubleWeek, teamPF:parseNumber(g?.PF),
      result:String(g?.Result||'').trim().toUpperCase(), stage:String(g?.GameStage||'').trim(),
      href:canonicalMatchupHref(g,games)
    }]
  }).sort((a,b)=>Number(b.season)-Number(a.season) || (parseFloat(b.week)||0)-(parseFloat(a.week)||0)), [games,identityMatcher,selectedTeams])

  const stats=profileGames.reduce((a,g)=>{
    a.apps++; if(g.status==='Starter')a.starts++;else a.bench++
    a.total+=g.pts||0; if(!(g.status==='Bench'&&g.pts===0)){a.avgTotal+=g.avgPts||0;a.avgCount++}
    if(!g.isDoubleWeek)a.best=Math.max(a.best,g.pts||0)
    a.seasons.add(g.season); return a
  },{apps:0,starts:0,bench:0,total:0,avgTotal:0,avgCount:0,best:0,seasons:new Set()})
  stats.avg=stats.avgCount?stats.avgTotal/stats.avgCount:0

  const filterOpts={
    opponent:['All',...Array.from(new Set(profileGames.map(g=>g.opponent).filter(Boolean))).sort()],
    status:['All',...Array.from(new Set(profileGames.map(g=>g.status).filter(Boolean))).sort()],
    result:['All',...Array.from(new Set(profileGames.map(g=>g.result).filter(Boolean))).sort()],
    stage:['All',...Array.from(new Set(profileGames.map(g=>g.stage).filter(Boolean))).sort()],
  }
  const filtered=profileGames.filter(g=>(opponentFilter==='All'||g.opponent===opponentFilter)&&(statusFilter==='All'||g.status===statusFilter)&&(resultFilter==='All'||g.result===resultFilter)&&(stageFilter==='All'||g.stage===stageFilter))
  const sorted=[...filtered].sort((a,b)=>{
    const sa=Number(a.season)||0,sb=Number(b.season)||0
    if(sa!==sb)return(sb-sa)*(sort.seasonDir==='desc'?1:-1)
    const wa=parseFloat(a.week)||0,wb=parseFloat(b.week)||0
    if(sort.key==='week'&&wa!==wb)return(wb-wa)*(sort.weekDir==='desc'?1:-1)
    if(sort.key==='pts'&&a.pts!==b.pts)return(b.pts-a.pts)*(sort.dir==='desc'?1:-1)
    if(sort.key==='teamPF'&&a.teamPF!==b.teamPF)return(b.teamPF-a.teamPF)*(sort.dir==='desc'?1:-1)
    return wb-wa
  })

  const toggleTeam=team=>setSelectedTeams(cur=>cur.length===1&&cur.includes(team)?cur:cur.some(t=>normalizeTeamName(t)===normalizeTeamName(team))?cur.filter(t=>normalizeTeamName(t)!==normalizeTeamName(team)):[...cur,team])
  const toggleSort=key=>setSort(cur=>key==='season'?{...cur,key,seasonDir:cur.key===key&&cur.seasonDir==='desc'?'asc':'desc'}:key==='week'?{...cur,key,weekDir:cur.key===key&&cur.weekDir==='desc'?'asc':'desc'}:{...cur,key,dir:cur.key===key&&cur.dir==='desc'?'asc':'desc'})

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-hidden bg-[#0A0A0A]/60 p-2 pt-3 sm:items-center sm:p-5" onClick={onClose}>
      <div className="flex h-[calc(100dvh-24px)] max-h-[960px] w-full max-w-5xl flex-col overflow-hidden border-2 border-[#0A0A0A] bg-white shadow-[6px_6px_0_#16274F] sm:h-auto sm:max-h-[94vh]" onClick={e=>e.stopPropagation()}>
        <div className="relative flex-shrink-0 overflow-hidden border-b-2 border-[#0A0A0A] bg-[#16274F] text-white">
          <div className="pointer-events-none absolute inset-0 opacity-25" style={{backgroundImage:'linear-gradient(135deg,transparent 0 58%,rgba(255,255,255,.13) 58% 59%,transparent 59% 68%,rgba(255,255,255,.08) 68% 69%,transparent 69%)'}} />
          <div className="relative border-b border-white/15 px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between"><div className="text-[11px] font-black uppercase tracking-[0.25em] sm:text-sm">Player Profile</div><button onClick={onClose} className="flex h-8 w-8 items-center justify-center border-2 border-white/70 bg-white/10 text-lg font-black">×</button></div>
          <div className="relative px-3 py-3 sm:px-6 sm:py-4"><div className="flex items-center gap-3 sm:gap-5">
            <PlayerAvatar name={player.rawName} playerLookup={playerLookup} size={76}/>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate text-[25px] font-black leading-none sm:text-4xl">{player.rawName}</h2>{player.position&&<span className={`px-2 py-1 text-[9px] font-black ${getPositionBadgeClasses(player.position)}`}>{player.position}</span>}</div>
            <div className="mt-2 flex items-center gap-2 text-[10px] font-black sm:text-xs">{sleeperInfo?.team&&<><img src={getNFLTeamLogo(sleeperInfo.team)} className="h-5 w-5 object-contain"/><span>{String(sleeperInfo.team).toUpperCase()}</span></>}{sleeperInfo?.status&&<><span className="text-white/35">·</span><span>{String(sleeperInfo.status).toLowerCase()==='active'?'Active':'Inactive'}</span></>}{sleeperLoading&&<span className="text-white/50">Loading…</span>}</div>
            <div className="mt-2 flex gap-2 whitespace-nowrap text-[9px] font-bold text-white/75 sm:text-[11px]"><span><b className="text-white">Jersey</b> {sleeperInfo?.number!=null?`#${sleeperInfo.number}`:'—'}</span><span>·</span><span><b className="text-white">Age</b> {sleeperInfo?.age!=null?`${sleeperInfo.age} yrs`:'—'}</span><span>·</span><span><b className="text-white">Experience</b> {sleeperInfo?.years_exp!=null?`${sleeperInfo.years_exp} yrs`:'—'}</span></div></div>
            <img src="https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png" className="h-10 w-10 object-contain sm:h-14 sm:w-14"/>
          </div></div>
        </div>
        <div className="flex-shrink-0 border-b-2 border-[#0A0A0A]/10 bg-white px-3 py-2 sm:px-6 sm:py-2.5"><div className="flex items-center justify-between"><div><span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#16274F]">Tapitas League Teams</span><span className="ml-1 text-[8px] font-bold text-[#6B7280]">— Select franchises to include</span></div><span className="text-[8px] font-black uppercase tracking-wider text-[#D01F2D]">{selectedTeams.length} selected</span></div>
          <div className="mt-1 flex max-w-full gap-1 overflow-x-auto pb-0.5 scrollbar-none">{clubs.map(c=><label key={c.team} className={`flex h-8 flex-shrink-0 cursor-pointer items-center gap-1 border px-1.5 ${selectedTeams.some(t=>normalizeTeamName(t)===normalizeTeamName(c.team))?'border-[#16274F] bg-[#EEF3FF] shadow-[2px_2px_0_#16274F]':'border-[#D6D6D6] bg-white'}`}><input type="checkbox" checked={selectedTeams.some(t=>normalizeTeamName(t)===normalizeTeamName(c.team))} onChange={()=>toggleTeam(c.team)} className="h-3.5 w-3.5 accent-[#16274F]"/><TeamAvatar name={c.team} size="xs"/><span className="text-[9px] font-black text-[#16274F]">{shortName(c.team)}</span><span className="text-[8px] font-bold text-[#6B7280]">{formatSeasonList(c.seasons)}</span></label>)}</div>
        </div>
        <div className="flex-shrink-0 border-b-2 border-[#0A0A0A]/10 bg-[#F7F8FB] p-2.5 sm:p-3"><div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2">{[['Apps',stats.apps],['Starts',stats.starts],['Bench',stats.bench],['Avg Pts',stats.avg.toFixed(2)],['Best Pts',stats.best.toFixed(2)],['Seasons',formatSeasonList(Array.from(stats.seasons))]].map(([l,v],i)=><div key={l} className={`border-2 px-2 py-2 sm:px-2.5 sm:py-2.5 ${['border-[#16274F]/25 bg-[#F3F6FC] shadow-[3px_3px_0_#16274F]','border-[#1E8E3E]/30 bg-[#F2F8F3] shadow-[3px_3px_0_#1E8E3E]','border-[#B8860B]/30 bg-[#FBF7EA] shadow-[3px_3px_0_#B8860B]','border-[#5B2CA0]/25 bg-[#F6F1FC] shadow-[3px_3px_0_#5B2CA0]','border-[#D01F2D]/25 bg-[#FDF1F2] shadow-[3px_3px_0_#D01F2D]','border-[#3F4757]/25 bg-[#F3F4F6] shadow-[3px_3px_0_#3F4757]'][i]}`}><div className="text-[7px] font-black uppercase tracking-[0.13em] text-[#6B7280]">{l}</div><div className="mt-0.5 text-xl font-black text-[#16274F] sm:text-2xl" style={{fontFamily:'"Bebas Neue",sans-serif'}}>{v}</div></div>)}</div></div>
        <div className="min-h-0 flex-1 overflow-auto"><table className="min-w-[900px] w-full"><thead className="sticky top-0 z-10 bg-[#F7F6F2]"><tr>{['Season','Week','Team','Opponent','Status','Player Pts','Team PF','Result','Stage'].map((h,i)=><th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[8px] font-black uppercase tracking-[0.18em] text-[#6B7280]">{h==='Opponent'?<HeaderFilter value={opponentFilter} onChange={setOpponentFilter} options={filterOpts.opponent} label="Opponent"/>:h==='Status'?<HeaderFilter value={statusFilter} onChange={setStatusFilter} options={filterOpts.status} label="Status"/>:h==='Result'?<HeaderFilter value={resultFilter} onChange={setResultFilter} options={filterOpts.result} label="Result"/>:h==='Stage'?<HeaderFilter value={stageFilter} onChange={setStageFilter} options={filterOpts.stage} label="Stage"/>:<button type="button" onClick={()=>toggleSort(['season','week','','','', 'pts','teamPF'][i])}>{h}</button>}</th>)}</tr></thead><tbody>{sorted.map((g,i)=><tr key={`${g.season}-${g.week}-${g.team}-${g.opponent}-${i}`} onClick={()=>window.location.href=g.href} className="cursor-pointer border-b border-[#0A0A0A]/8 hover:bg-[#F7F6F2]"><td className="px-4 py-3 text-xs font-black text-[#16274F]">{g.season}</td><td className="px-4 py-3 text-xs font-bold text-[#3F4757]">{g.week}</td><td className="px-4 py-3 text-xs font-black text-[#16274F]">{shortName(g.team)}</td><td className="px-4 py-3 text-xs font-black text-[#16274F]">{g.opponent}</td><td className="px-4 py-3 text-xs font-bold">{g.status}</td><td className="px-4 py-3 text-sm font-black text-[#16274F]">{g.pts.toFixed(2)}</td><td className="px-4 py-3 text-xs font-bold text-[#3F4757]">{g.teamPF.toFixed(2)}</td><td className={`px-4 py-3 text-xs font-black ${g.result==='W'?'text-[#1E8E3E]':'text-[#D01F2D]'}`}>{g.result||'—'}</td><td className="px-4 py-3 text-[10px] font-bold text-[#6B7280]">{g.stage||'—'}</td></tr>)}</tbody></table></div>
      </div>
    </div>
  )
}

export default function PlayersPage() {
  const [games,setGames]=useState([]), [playerLookup,setPlayerLookup]=useState(new Map()), [loading,setLoading]=useState(true)
  const [search,setSearch]=useState(''), [position,setPosition]=useState('All'), [teamFilter,setTeamFilter]=useState('All'), [season,setSeason]=useState('All'), [minApps,setMinApps]=useState('All'), [sort,setSort]=useState('Appearances'), [selected,setSelected]=useState(null)

  useEffect(() => {
    let alive = true
    const loadFacts = async () => {
      const rows = await safeFetch(`${BASE_URL}/GAME_FACTS_ALL`, 30000)
      if (!alive) return
      setGames(rows)
      setLoading(false)
    }
    const loadCache = async () => {
      const rows = await safeFetch(`${BASE_URL}/_PLAYER_CACHE`, 12000)
      if (!alive) return
      if (rows.length) setPlayerLookup(buildPlayerLookup(rows))
    }
    loadFacts()
    loadCache()
    return () => { alive = false }
  }, [])

  const gameAppearances = useMemo(() => games.map(g => extractPlayerAppearances(g)), [games])
  const allAppearances = useMemo(() => gameAppearances.flat(), [gameAppearances])
  const identityMap = useMemo(() => buildCanonicalIdentityMap(allAppearances, playerLookup), [allAppearances, playerLookup])

  const players = useMemo(() => {
    const map = new Map()
    gameAppearances.forEach((apps, gameIndex) => {
      const g = games[gameIndex]
      const doubleWeek = isDoubleWeek(g)
      const season = String(g?.Season || '').trim()
      const team = String(g?.Team || '').trim()
      const seen = new Set()
      apps.forEach(app => {
        const raw = String(app.name || '').trim()
        if (!raw || getNFLTeamLogo(raw)) return
        // GAME_FACTS_ALL is the source of truth for identity. Keep the exact
        // stored name as the key. In particular, full-name rows such as
        // "Bijan Robinson" and "Brian Robinson" must never be merged merely
        // because their display abbreviations collide.
        const key = `raw:${raw}`
        if (seen.has(key)) return
        seen.add(key)
        if (!map.has(key)) {
          const rawKey = normalizePlayerKey(raw)
          const displayName = raw
          map.set(key, {
            identityKey: key,
            rawName: raw,
            name: displayName,
            position: getPlayerPosition(raw, playerLookup),
            aliases: new Set(), appearances: 0, starts: 0, bench: 0,
            total: 0, avgTotal: 0, avgCount: 0, best: 0,
            seasons: new Set(), teams: new Set(), rostered: 0,
          })
        }
        const p = map.get(key)
        p.aliases.add(raw)
        p.appearances++
        if (app.status === 'Starter') p.starts++
        else p.bench++
        const points = doubleWeek ? app.pts / 2 : app.pts
        p.total += points
        if (season) p.seasons.add(season)
        if (team) p.teams.add(team)
        if (!(app.status === 'Bench' && app.pts === 0)) {
          p.avgTotal += points
          p.avgCount++
        }
        if (!doubleWeek) p.best = Math.max(p.best, app.pts || 0)
      })
    })
    return Array.from(map.values())
      .filter(p => p.position !== 'DEF')
      .map(p => ({ ...p, aliases: Array.from(p.aliases), teams: Array.from(p.teams), avg: p.avgCount ? p.avgTotal / p.avgCount : 0 }))
      .sort((a,b) => b.appearances - a.appearances || b.starts - a.starts || a.name.localeCompare(b.name))
  }, [games, gameAppearances, playerLookup])

  const positions=useMemo(()=>['All',...Array.from(new Set(players.map(p=>p.position).filter(Boolean))).sort()],[players])
  const seasons=useMemo(()=>['All',...Array.from(new Set(players.flatMap(p=>Array.from(p.seasons)))).sort((a,b)=>Number(b)-Number(a))],[players])
  const teams=useMemo(()=>['All',...Array.from(new Set(players.flatMap(p=>p.teams))).sort()],[players])
  const filtered=useMemo(()=>players.filter(p=>normalizePlayerKey(p.name).includes(normalizePlayerKey(search))).filter(p=>position==='All'||p.position===position).filter(p=>teamFilter==='All'||p.teams.some(t=>normalizeTeamName(t)===normalizeTeamName(teamFilter))).filter(p=>season==='All'||p.seasons.has(season)).filter(p=>minApps==='All'||p.appearances>Number(String(minApps).replace(/[^0-9]/g,''))).sort((a,b)=>sort==='Starts'?b.starts-a.starts||b.appearances-a.appearances||a.name.localeCompare(b.name):sort==='Bench'?b.bench-a.bench||b.appearances-a.appearances||a.name.localeCompare(b.name):sort==='Average Points'?b.avg-a.avg||b.appearances-a.appearances||a.name.localeCompare(b.name):sort==='Best Score'?b.best-a.best||b.appearances-a.appearances||a.name.localeCompare(b.name):b.appearances-a.appearances||b.starts-a.starts||a.name.localeCompare(b.name)),[players,search,position,teamFilter,season,minApps,sort])

  return <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A]"><style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');.tp-shadow-navy{box-shadow:6px 6px 0 #16274F}.tp-shadow-navy-sm{box-shadow:4px 4px 0 #16274F}`}</style><Header/>
    <section className="mx-auto max-w-[1680px] px-6 pb-24 pt-4">
      <div className="relative mb-8 overflow-hidden border-2 border-[#0A0A0A] tp-shadow-navy" style={{minHeight:'240px'}}><div className="absolute inset-0 overflow-hidden"><svg width="100%" height="100%" viewBox="0 0 900 240" preserveAspectRatio="xMidYMid slice"><g opacity=".06">{[280,355,400,475,520,595,640,715,760,835].map((x,i)=><rect key={i} x={x} y="-60" width={i%2===0?55:22} height="380" fill="#16274F" transform={`rotate(-18 ${x+(i%2===0?27:11)} 120)`}/>)}</g><g opacity=".1" fill="none" stroke="#16274F" strokeWidth="1">{['M380 -20 L460 80 L380 180 L300 80 Z','M540 -20 L620 80 L540 180 L460 80 Z','M700 -20 L780 80 L700 180 L620 80 Z','M860 -20 L940 80 L860 180 L780 80 Z'].map((d,i)=><path key={i} d={d}/>)}</g><g opacity=".08" fill="#D01F2D"><polygon points="900,0 900,110 790,0"/><polygon points="900,240 900,130 790,240"/></g><text x="820" y="230" fontFamily="'Bebas Neue',sans-serif" fontSize="240" fill="#16274F" opacity=".04" textAnchor="middle">PLY</text></svg><div className="absolute inset-0" style={{background:'linear-gradient(105deg,#F7F6F2 28%,rgba(247,246,242,.9) 48%,rgba(247,246,242,.15) 100%)'}}/></div><div className="relative z-10 p-10 md:p-14"><div className="mb-4 inline-flex items-center gap-2 bg-[#D01F2D] px-4 py-2" style={{clipPath:'polygon(0 0,100% 0,96% 100%,0% 100%)'}}><Users className="h-4 w-4 text-white"/><span className="text-xs font-black uppercase tracking-[0.25em] text-white">All Players</span></div><h1 className="leading-[.88] text-[#16274F]" style={{fontFamily:'"Bebas Neue",sans-serif',fontSize:'clamp(48px,7vw,88px)'}}><span className="block">THE</span><span className="block text-[#D01F2D]">PLAYERS</span></h1><p className="mt-4 max-w-xl text-sm font-semibold text-[#6B7280] sm:text-base">Every player who has left a mark on Tapitas League — across every franchise and every season.</p></div></div>
      {loading?<div className="py-20 text-center font-bold text-[#6B7280]">Loading...</div>:<div className="overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm"><div className="border-b-2 border-[#0A0A0A]/10 px-5 py-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F]"><Users className="h-4 w-4 text-white"/></div><div><div className="text-xs font-black uppercase tracking-[0.25em] text-[#16274F]">Player Archive</div><div className="text-sm text-[#6B7280]">{players.length} players across all Tapitas League franchises</div></div></div></div><div className="border-b-2 border-[#0A0A0A]/10 bg-white px-3 py-2.5 sm:px-6 sm:py-3"><div className="grid grid-cols-2 gap-1.5 lg:flex lg:items-center lg:gap-2"><div className="w-full lg:w-32"><CompactCheckFilter value={position} onChange={setPosition} options={positions} label="Position"/></div><div className="w-full lg:w-40"><CompactCheckFilter value={sort} onChange={setSort} options={['Appearances','Starts','Bench','Average Points','Best Score']} label="Sort by"/></div><div className="w-full lg:w-32"><CompactCheckFilter value={season} onChange={setSeason} options={seasons} label="Season"/></div><div className="w-full lg:w-36"><CompactCheckFilter value={teamFilter} onChange={setTeamFilter} options={teams} label="Franchise"/></div><div className="w-full lg:w-32"><CompactCheckFilter value={minApps} onChange={setMinApps} options={['All','>10 appearances','>20 appearances','>30 appearances']} label="Appearances"/></div><div className="col-span-2 w-full lg:w-64 lg:col-span-1"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search player..." className="w-full border-2 border-[#0A0A0A] bg-white px-4 py-2.5 text-sm font-bold text-[#16274F] outline-none placeholder:text-[#9CA3AF] focus:border-[#D01F2D]"/></div></div></div><div className="max-h-[720px] overflow-auto"><table className="min-w-[920px] w-full"><thead className="sticky top-0 z-10 bg-[#F7F6F2]"><tr>{['Player','Pos','Franchises','Apps','Starts','Avg Pts','Best','Seasons'].map(h=><th key={h} className="whitespace-nowrap border-b-2 border-[#0A0A0A]/10 px-4 py-3 text-left text-[8px] font-black uppercase tracking-[0.18em] text-[#6B7280]">{h}</th>)}</tr></thead><tbody>{filtered.map(p=><tr key={p.identityKey} onClick={()=>setSelected(p)} className="cursor-pointer border-b border-[#0A0A0A]/8 hover:bg-white"><td className="px-4 py-3"><div className="flex items-center gap-3"><PlayerAvatar name={p.rawName} playerLookup={playerLookup} size={40}/><div className="min-w-0"><div className="truncate text-sm font-black text-[#16274F]">{p.name}</div><div className="text-[9px] font-bold text-[#6B7280]">{p.teams.map(shortName).join(' · ')}</div></div></div></td><td className="px-4 py-3">{p.position&&<span className={`inline-flex px-1.5 py-0.5 text-[8px] font-black ${getPositionBadgeClasses(p.position)}`}>{p.position}</span>}</td><td className="max-w-[260px] px-4 py-3 text-xs font-bold text-[#3F4757]">{p.teams.map(shortName).join(', ')}</td><td className="px-4 py-3 text-sm font-black text-[#16274F]">{p.appearances}</td><td className="px-4 py-3 text-sm font-black text-[#16274F]">{p.starts}</td><td className="px-4 py-3 text-sm font-black text-[#16274F]">{p.avg.toFixed(2)}</td><td className="px-4 py-3 text-sm font-black text-[#16274F]">{p.best.toFixed(2)}</td><td className="px-4 py-3 text-xs font-bold text-[#3F4757]">{formatSeasonList(Array.from(p.seasons))}</td></tr>)}{filtered.length===0&&<tr><td colSpan="8" className="py-12 text-center text-sm font-bold text-[#6B7280]">No players found</td></tr>}</tbody></table></div></div>}
    </section><footer className="w-full border-t-4 border-[#D01F2D] bg-[#16274F]"><div className="mx-auto flex max-w-[1920px] items-center justify-center gap-3 px-5 py-6"><img src="/images/LogoFinalBlack.png" alt="" width="24" height="24" style={{filter:'invert(1)',opacity:.7}}/><span className="text-xs font-black uppercase tracking-[0.3em] text-white/70">Tapitas League · Est. 2014</span></div></footer>{selected&&<PlayerProfile player={selected} games={games} playerLookup={playerLookup} onClose={()=>setSelected(null)}/>}</main>
}
