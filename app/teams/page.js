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

function CompactCheckFilter({ value, onChange, options, label, multiple = false, displayOption, neutral = false }) {
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
        className={`flex min-h-9 w-full items-center justify-between gap-2 border-2 bg-white px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.12em] transition-all ${open ? (neutral ? 'border-[#16274F] shadow-[2px_2px_0_#16274F]' : 'border-[#D01F2D] shadow-[2px_2px_0_#D01F2D]') : 'border-[#16274F]/20 hover:border-[#16274F]/50'} ${activeCount && !neutral ? 'text-[#D01F2D]' : 'text-[#16274F]'}`}
      >
        <span className="truncate">{display}</span>
        <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center border text-[9px] transition-transform ${open ? (neutral ? 'rotate-180 border-[#16274F] text-[#16274F]' : 'rotate-180 border-[#D01F2D] text-[#D01F2D]') : 'border-[#16274F]/30 text-[#6B7280]'}`}>⌄</span>
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

const TeamList = ({ teams, selectTeam, getTeamHistory }) => {
  const SectionHeader = ({ eyebrow, title, meta, icon: Icon }) => (
    <div className="flex items-end justify-between gap-3 border-b border-[#EEF0F2] px-3 py-3 sm:px-4">
      <div className="min-w-0 flex items-center gap-2.5">
        {Icon && <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F4F5F7] text-[#16274F]"><Icon className="h-4 w-4" /></div>}
        <div className="min-w-0">
          {eyebrow && <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">{eyebrow}</div>}
          <div className="truncate text-[14px] font-semibold text-[#111]">{title}</div>
        </div>
      </div>
      {meta && <div className="flex-shrink-0 text-[11px] text-[#6B7280]">{meta}</div>}
    </div>
  )

  return (
    <div className="overflow-hidden rounded-xl bg-white">
      <SectionHeader eyebrow="Tapitas League" title="Current franchises" meta={`${teams.length} teams`} icon={Users} />
      <div className="grid gap-px bg-[#EEF0F2] md:grid-cols-2">
        {teams.map((team, i) => {
          const teamHistory = getTeamHistory(team.team)
          const teamTitles = teamHistory.filter(r => isTrueFlag(r?.Champion)).length
          const currentSeason = teamHistory[0]
          const seasonCount = new Set(teamHistory.map(r => String(r?.Season || '').trim()).filter(Boolean)).size
          const record = `${parseNumber(team.W)}–${parseNumber(team.L)}`
          const pct = String(team?.['W%'] || '').trim()
          const isChampion = teamTitles > 0
          return (
            <button key={i} type="button" onClick={() => selectTeam(team)} className="group flex min-w-0 items-center gap-3 bg-white px-3 py-3.5 text-left transition-colors hover:bg-[#F7F8FA] md:px-4">
              <TeamAvatar name={team.team} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-[#111] group-hover:text-[#D01F2D]">{shortName(team.team)}</span>
                  {isChampion && <span className="flex-shrink-0 text-[11px]">🏆</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-[#6B7280]">
                  <span>{seasonCount} seasons</span><span>·</span><span>{teamTitles} titles</span>
                  {currentSeason?.Season && <><span>·</span><span>{currentSeason.Season}</span></>}
                </div>
              </div>
              <div className="flex w-[136px] flex-shrink-0 items-center justify-end gap-3 tabular-nums">
                <div className="text-right">
                  <div className="text-[16px] font-semibold leading-none text-[#111]">{record}</div>
                  <div className="mt-1 text-[10px] text-[#6B7280]">{pct}</div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-[#6B7280]">PF</div>
                  <div className="mt-0.5 text-[12px] font-medium text-[#3F4757]">{Math.round(parseNumber(team.PF)).toLocaleString()}</div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#A0A5AD] transition-transform group-hover:translate-x-0.5 group-hover:text-[#D01F2D]" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function TeamsPage() {
  const [allTime, setAllTime] = useState([])
  const [history, setHistory] = useState([])
  const [historyRaw, setHistoryRaw] = useState([])
  const [h2hData, setH2hData] = useState([])
  const [games, setGames] = useState([])
  const [playerLookup, setPlayerLookup] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [mobileTeamView, setMobileTeamView] = useState('overview')
  const gameLogRef = useRef(null)

  // ── Game Log filters ─────────────────────────────────────────────
  const [logSeason, setLogSeason] = useState('All')
  const [logOpponent, setLogOpponent] = useState('All')
  const [logGameType, setLogGameType] = useState('All')
  const [log200Only, setLog200Only] = useState(false)
  const [logHighestOnly, setLogHighestOnly] = useState(false)
  const [selectedPlayerKey, setSelectedPlayerKey] = useState(null)
  const [selectedPlayerTeams, setSelectedPlayerTeams] = useState([])
  const [sleeperPlayerInfo, setSleeperPlayerInfo] = useState(null)
  const [sleeperPlayerLoading, setSleeperPlayerLoading] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')
  const [playerPositionFilter, setPlayerPositionFilter] = useState('All')
  const [playerSort, setPlayerSort] = useState('Appearances')
  const [playerSeasonFilter, setPlayerSeasonFilter] = useState('All')
  const [playerMinApps, setPlayerMinApps] = useState('All')
  const [playerLogSort, setPlayerLogSort] = useState({ key: 'season', dir: 'desc', seasonDir: 'desc', weekDir: 'desc' })
  const [playerLogOpponentFilter, setPlayerLogOpponentFilter] = useState('All')
  const [playerLogStatusFilter, setPlayerLogStatusFilter] = useState('All')
  const [playerLogResultFilter, setPlayerLogResultFilter] = useState('All')
  const [playerLogStageFilter, setPlayerLogStageFilter] = useState('All')

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

  const openPlayerProfile = (playerKey, teamName = selected?.team) => {
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
    setSelectedPlayerTeams(cleanTeam ? [cleanTeam] : [])
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
    setPlayerLogSort({ key: 'season', dir: 'desc', seasonDir: 'desc', weekDir: 'desc' })
    setPlayerLogOpponentFilter('All')
    setPlayerLogStatusFilter('All')
    setPlayerLogResultFilter('All')
    setPlayerLogStageFilter('All')
  }, [selected])

  // Lock the document behind the Player Profile modal. This hook must stay
  // at the component's top level so the hook order never changes between renders.
  useEffect(() => {
    if (!selectedPlayerKey) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleEscape = (event) => {
      if (event.key === 'Escape') closePlayerProfile()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [selectedPlayerKey])

  // Player Profile state/effects MUST stay at TeamsPage's top level.
  // They cannot live inside `if (selected)` because that changes the hook order.
  useEffect(() => {
    if (!selectedPlayerKey || !selected?.team) {
      setSelectedPlayerTeams([])
      return
    }
    setSelectedPlayerTeams([String(selected.team).trim()])
  }, [selectedPlayerKey, selected?.team])

  // Resolve the player's Sleeper ID from the existing identity lookup, then
  // fetch the richer player object directly from Sleeper (not _PLAYER_CACHE).
  useEffect(() => {
    let cancelled = false
    const rawName = selectedPlayerKey?.startsWith('raw:') ? selectedPlayerKey.slice(4) : ''
    if (!rawName) {
      setSleeperPlayerInfo(null)
      setSleeperPlayerLoading(false)
      return () => { cancelled = true }
    }

    const playerId = getPlayerId(rawName, playerLookup)
    if (!playerId) {
      setSleeperPlayerInfo(null)
      setSleeperPlayerLoading(false)
      return () => { cancelled = true }
    }

    setSleeperPlayerLoading(true)
    fetchSleeperPlayers()
      .then(players => {
        if (cancelled) return
        setSleeperPlayerInfo(players?.[String(playerId)] || null)
      })
      .catch(() => {
        if (!cancelled) setSleeperPlayerInfo(null)
      })
      .finally(() => {
        if (!cancelled) setSleeperPlayerLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedPlayerKey, playerLookup])

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
      if (teamParam) {
        const match = at.find(r =>
          String(r?.Team || '').trim().toLowerCase() === teamParam.toLowerCase()
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
    const bestAvgPlayer = [...playerArchive]
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

    const selectedPlayerGames = selectedPlayer
      ? games.flatMap(g => {
          const appearance = extractPlayerAppearances(g).find(a => {
            const rawName = String(a?.name || '').trim()
            return `raw:${rawName}` === selectedPlayer.archiveKey
          })
          if (!appearance) return []
          const team = String(g?.Team || '').trim()
          if (!selectedPlayerTeams.some(teamName => normalizeTeamName(teamName) === normalizeTeamName(team))) return []
          return [{
            season: String(g?.Season || '').trim(),
            week: String(g?.Week || '').trim(),
            team,
            opponent: String(g?.Opponent || '').trim(),
            status: appearance.status,
            pts: isDoubleWeek(g) ? appearance.pts / 2 : appearance.pts,
            rawPts: appearance.pts,
            isDoubleWeek: isDoubleWeek(g),
            position: getPlayerPosition(appearance.name, playerLookup),
            matchupHref: canonicalMatchupHref(g, games),
            teamPF: parseNumber(g?.PF),
            result: String(g?.Result || '').trim().toUpperCase(),
            gameStage: String(g?.GameStage || '').trim(),
          }]
        }).sort((a, b) => {
          const sa = Number(a.season) || 0, sb = Number(b.season) || 0
          if (sb !== sa) return sb - sa
          return (parseFloat(b.week.replace(/[^0-9.]/g, '')) || 0) - (parseFloat(a.week.replace(/[^0-9.]/g, '')) || 0)
        })
      : []

    const selectedPlayerStats = selectedPlayerGames.reduce((acc, game) => {
      acc.appearances += 1
      if (game.status === 'Starter') acc.starts += 1
      else acc.bench += 1
      acc.totalPts += game.pts || 0
      if (!(game.status === 'Bench' && game.pts === 0)) {
        acc.avgTotal += game.pts || 0
        acc.avgCount += 1
      }
      // Double-weeks are valid for AVG but never qualify for BEST.
      if (!game.isDoubleWeek) acc.bestPts = Math.max(acc.bestPts, game.pts || 0)
      if (game.season) acc.seasons.add(game.season)
      return acc
    }, { appearances: 0, starts: 0, bench: 0, totalPts: 0, avgTotal: 0, avgCount: 0, bestPts: 0, seasons: new Set() })
    selectedPlayerStats.avgPts = selectedPlayerStats.avgCount ? selectedPlayerStats.avgTotal / selectedPlayerStats.avgCount : 0

    const playerLogOpponentOptions = ['All', ...Array.from(new Set(selectedPlayerGames.map(g => g.opponent).filter(Boolean))).sort()]
    const playerLogStatusOptions = ['All', ...Array.from(new Set(selectedPlayerGames.map(g => g.status).filter(Boolean))).sort()]
    const playerLogResultOptions = ['All', ...Array.from(new Set(selectedPlayerGames.map(g => g.result).filter(Boolean))).sort()]
    const playerLogStageOptions = ['All', ...Array.from(new Set(selectedPlayerGames.map(g => g.gameStage).filter(Boolean))).sort()]

    const filteredSelectedPlayerGames = selectedPlayerGames
      .filter(g => playerLogOpponentFilter === 'All' || g.opponent === playerLogOpponentFilter)
      .filter(g => playerLogStatusFilter === 'All' || g.status === playerLogStatusFilter)
      .filter(g => playerLogResultFilter === 'All' || g.result === playerLogResultFilter)
      .filter(g => playerLogStageFilter === 'All' || g.gameStage === playerLogStageFilter)

    const sortedSelectedPlayerGames = [...filteredSelectedPlayerGames].sort((a, b) => {
      const seasonA = Number(a.season) || 0
      const seasonB = Number(b.season) || 0
      const weekA = parseFloat(String(a.week || '').replace(/[^0-9.]/g, '')) || 0
      const weekB = parseFloat(String(b.week || '').replace(/[^0-9.]/g, '')) || 0
      const seasonDirection = playerLogSort.seasonDir === 'asc' ? 1 : -1
      const weekDirection = playerLogSort.weekDir === 'asc' ? 1 : -1
      const direction = playerLogSort.dir === 'asc' ? 1 : -1

      // Season is always the primary grouping. Week sorting happens inside
      // each season, so years never get interleaved.
      if (seasonA !== seasonB) return (seasonA - seasonB) * seasonDirection

      if (playerLogSort.key === 'week') {
        if (weekA !== weekB) return (weekA - weekB) * weekDirection
      } else if (playerLogSort.key === 'pts' || playerLogSort.key === 'teamPF') {
        const av = playerLogSort.key === 'pts' ? a.pts || 0 : a.teamPF || 0
        const bv = playerLogSort.key === 'pts' ? b.pts || 0 : b.teamPF || 0
        if (av !== bv) return (av - bv) * direction
      } else {
        if (weekA !== weekB) return (weekA - weekB) * weekDirection
      }

      return `${a.season}-${a.week}-${a.opponent}`.localeCompare(`${b.season}-${b.week}-${b.opponent}`)
    })

    const handlePlayerLogSort = (key) => {
      setPlayerLogSort(current => {
        if (key === 'season') {
          const nextDir = current.key === 'season' && current.seasonDir === 'desc' ? 'asc' : 'desc'
          return { ...current, key, dir: nextDir, seasonDir: nextDir }
        }
        if (key === 'week') {
          const nextDir = current.key === 'week' && current.weekDir === 'desc' ? 'asc' : 'desc'
          return { ...current, key, dir: nextDir, weekDir: nextDir }
        }
        const nextDir = current.key === key && current.dir === 'desc' ? 'asc' : 'desc'
        return { ...current, key, dir: nextDir }
      })
    }

    // Historic clubs: scan the COMPLETE GAME_FACTS_ALL dataset using the
    // player's exact raw name as identity. This intentionally does not use
    // normalized/abbreviated names, so different players with the same
    // display abbreviation are never merged.
    const selectedPlayerClubs = selectedPlayer
      ? Array.from(new Map(
          games
            .filter(g => extractPlayerAppearances(g).some(a => {
              const rawName = String(a?.name || '').trim()
              return `raw:${rawName}` === selectedPlayer.archiveKey
            }))
            .map(g => {
              const teamName = String(g?.Team || '').trim()
              return [teamName, null]
            })
        ).keys())
          .filter(Boolean)
          .map(teamName => ({
            team: teamName,
            seasons: Array.from(new Set(
              games
                .filter(g => normalizeTeamName(g?.Team) === normalizeTeamName(teamName))
                .filter(g => extractPlayerAppearances(g).some(a => {
                  const rawName = String(a?.name || '').trim()
                  return `raw:${rawName}` === selectedPlayer.archiveKey
                }))
                .map(g => String(g?.Season || '').trim())
                .filter(Boolean)
            )).sort((a, b) => Number(a) - Number(b)),
          }))
          .sort((a, b) => {
            const selectedKey = normalizeTeamName(selected.team)
            return normalizeTeamName(a.team) === selectedKey ? -1 : normalizeTeamName(b.team) === selectedKey ? 1 : normalizeTeamName(a.team).localeCompare(normalizeTeamName(b.team))
          })
      : []


    const togglePlayerTeam = (teamName) => {
      const normalized = normalizeTeamName(teamName)
      setSelectedPlayerTeams(current => {
        const exists = current.some(team => normalizeTeamName(team) === normalized)
        if (exists) {
          // Never leave the profile without a franchise selected.
          if (current.length === 1) return current
          return current.filter(team => normalizeTeamName(team) !== normalized)
        }
        return [...current, teamName]
      })
    }

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

    const accentMap = {
      gold: { text: 'text-[#8D6A00]', bg: 'bg-[#FFF8DA]' },
      navy: { text: 'text-[#16274F]', bg: 'bg-[#F3F6FC]' },
      green: { text: 'text-[#1E8E3E]', bg: 'bg-[#F2F8F3]' },
      red: { text: 'text-[#D01F2D]', bg: 'bg-[#FDF1F2]' },
    }

    const SectionHeader = ({ eyebrow, title, meta, icon: Icon }) => (
      <div className="flex items-end justify-between gap-3 border-b border-[#EEF0F2] px-3 py-3 sm:px-4">
        <div className="min-w-0 flex items-center gap-2.5">
          {Icon && <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F4F5F7] text-[#16274F]"><Icon className="h-4 w-4" /></div>}
          <div className="min-w-0">
            {eyebrow && <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">{eyebrow}</div>}
            <div className="truncate text-[14px] font-semibold text-[#111]">{title}</div>
          </div>
        </div>
        {meta && <div className="flex-shrink-0 text-[11px] text-[#6B7280]">{meta}</div>}
      </div>
    )

    const TeamList = () => (
      <div className="overflow-hidden rounded-xl bg-white">
        <SectionHeader eyebrow="Tapitas League" title="Current franchises" meta={`${teams.length} teams`} icon={Users} />
        <div className="grid gap-px bg-[#EEF0F2] md:grid-cols-2">
          {teams.map((team, i) => {
            const teamHistory = getTeamHistory(team.team)
            const teamTitles = teamHistory.filter(r => isTrueFlag(r?.Champion)).length
            const currentSeason = teamHistory[0]
            const seasonCount = new Set(teamHistory.map(r => String(r?.Season || '').trim()).filter(Boolean)).size
            const record = `${parseNumber(team.W)}–${parseNumber(team.L)}`
            const pct = String(team?.['W%'] || '').trim()
            const isChampion = teamTitles > 0
            return (
              <button key={i} type="button" onClick={() => selectTeam(team)} className="group flex min-w-0 items-center gap-3 bg-white px-3 py-3.5 text-left transition-colors hover:bg-[#F7F8FA] md:px-4">
                <TeamAvatar name={team.team} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-[#111] group-hover:text-[#D01F2D]">{shortName(team.team)}</span>
                    {isChampion && <span className="flex-shrink-0 text-[11px]">🏆</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-[#6B7280]">
                    <span>{seasonCount} seasons</span><span>·</span><span>{teamTitles} titles</span>
                    {currentSeason?.Season && <><span>·</span><span>{currentSeason.Season}</span></>}
                  </div>
                </div>
                <div className="flex w-[136px] flex-shrink-0 items-center justify-end gap-3 tabular-nums">
                  <div className="text-right">
                    <div className="text-[16px] font-semibold leading-none text-[#111]">{record}</div>
                    <div className="mt-1 text-[10px] text-[#6B7280]">{pct}</div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-[9px] uppercase tracking-[0.12em] text-[#6B7280]">PF</div>
                    <div className="mt-0.5 text-[12px] font-medium text-[#3F4757]">{Math.round(parseNumber(team.PF)).toLocaleString()}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#A0A5AD] transition-transform group-hover:translate-x-0.5 group-hover:text-[#D01F2D]" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )

    const HeadToHeadCard = () => (
      <div className="overflow-hidden rounded-xl bg-white">
        <SectionHeader eyebrow="Matchups" title="Head to Head" meta="vs all franchises" icon={Swords} />
        <div className="divide-y divide-[#F1F2F4]">
          {teamH2H.map((h, i) => {
            const total = h.wins + h.losses
            const pct = total > 0 ? Math.round((h.wins / total) * 100) : 0
            const ahead = h.wins > h.losses
            const tied = h.wins === h.losses
            return (
              <a key={i} href={`/rivalries?teamA=${encodeURIComponent(selected.team)}&teamB=${encodeURIComponent(h.opponent)}`} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-[#F7F8FA] sm:px-4">
                <TeamAvatar name={h.opponent} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-[#111]">{shortName(h.opponent)}</div>
                  <div className="mt-0.5 text-[10px] text-[#6B7280]">{h.games} games · {h.streak || '—'}</div>
                </div>
                <div className="text-right tabular-nums">
                  <div className={`text-[12px] font-semibold ${ahead ? 'text-[#1E8E3E]' : tied ? 'text-[#6B7280]' : 'text-[#D01F2D]'}`}>{h.wins}–{h.losses}</div>
                  <div className="text-[9px] text-[#6B7280]">{pct}%</div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#A0A5AD]" />
              </a>
            )
          })}
        </div>
      </div>
    )

    const SeasonHistoryCard = () => (
      <div className="overflow-hidden rounded-xl bg-white">
        <SectionHeader eyebrow="History" title="Season History" meta={`${teamSeasons} seasons`} icon={Activity} />
        <div className="overflow-x-auto">
          <table className="min-w-[680px] w-full">
            <thead className="bg-[#F7F8FA]">
              <tr className="border-b border-[#EEF0F2]">
                {['Season','RS','Overall','PF','Finish','Result'].map(h => <th key={h} className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-[0.13em] text-[#6B7280] sm:px-4">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {teamH.map((r, i) => {
                const isChamp = isTrueFlag(r?.Champion)
                const isFinal = isTrueFlag(r?.Reached_Final)
                const isPlayoff = String(r?.Made_Playoffs || '').toUpperCase() === 'TRUE'
                return (
                  <tr key={i} onClick={() => { setLogSeason(String(r.Season)); setLogOpponent('All'); setLogGameType('All'); setLog200Only(false); setLogHighestOnly(false); setMobileTeamView('games'); requestAnimationFrame(() => gameLogRef.current?.scrollIntoView({behavior:'smooth',block:'start'})) }} className="cursor-pointer border-b border-[#F1F2F4] transition-colors hover:bg-[#F7F8FA]">
                    <td className="px-3 py-3 text-[12px] font-semibold text-[#16274F] sm:px-4">{r.Season}</td>
                    <td className="px-3 py-3 text-[12px] tabular-nums text-[#3F4757] sm:px-4">{parseNumber(r.RS_W)}–{parseNumber(r.RS_L)}</td>
                    <td className="px-3 py-3 text-[12px] tabular-nums text-[#3F4757] sm:px-4">{parseNumber(r.W)}–{parseNumber(r.L)}</td>
                    <td className="px-3 py-3 text-[12px] tabular-nums text-[#3F4757] sm:px-4">{Math.round(parseNumber(r.RS_PF))}</td>
                    <td className="px-3 py-3 text-[10px] text-[#6B7280] sm:px-4">{parseNumber(r.Standing) > 0 ? `#${parseNumber(r.Standing)}` : '—'}</td>
                    <td className="px-3 py-3 sm:px-4">
                      {isChamp ? <span className="inline-flex rounded-full bg-[#FFF2B8] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#6B5A00]">Champion</span>
                        : isFinal ? <span className="inline-flex rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#16274F]">Final</span>
                        : isPlayoff ? <span className="inline-flex rounded-full bg-[#F4F5F7] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#6B7280]">Playoffs</span>
                        : <span className="text-[9px] text-[#9CA3AF]">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )

    const GameLogCard = () => (
      <div ref={gameLogRef} className="overflow-hidden rounded-xl bg-white scroll-mt-3">
        <SectionHeader eyebrow="Performance" title="Game Log" meta={`${filteredLog.length} of ${teamGames.length} games`} icon={Filter} />
        <div className="border-b border-[#EEF0F2] p-2.5 sm:p-3">
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
            <CompactCheckFilter value={logSeason} onChange={setLogSeason} options={logSeasonOptions} label="Season" />
            <CompactCheckFilter value={logOpponent} onChange={setLogOpponent} options={logOpponentOptions} label="Opponent" displayOption={opt => opt === 'All' ? opt : shortName(opt)} />
            <CompactCheckFilter value={logGameType} onChange={setLogGameType} options={logGameTypeOptions} label="Game Type" displayOption={opt => ({'Reg Season':'Regular','Playoffs':'Playoffs','Consolation':'Consol.'}[opt] || opt)} />
            <button onClick={() => setLog200Only(p => !p)} className={`flex min-h-9 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.12em] sm:w-auto ${log200Only ? 'border-[#16274F] bg-[#EEF3FF] text-[#16274F]' : 'border-[#E4E6EA] bg-white text-[#3F4757]'}`}><span className={`flex h-4 w-4 items-center justify-center rounded border text-[9px] ${log200Only ? 'border-[#16274F] bg-[#16274F] text-white' : 'border-[#C9CDD4]'}`}>{log200Only ? '✓' : ''}</span>200+ pts</button>
            <button onClick={() => setLogHighestOnly(p => !p)} className={`flex min-h-9 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.12em] sm:w-auto ${logHighestOnly ? 'border-[#16274F] bg-[#EEF3FF] text-[#16274F]' : 'border-[#E4E6EA] bg-white text-[#3F4757]'}`}><span className={`flex h-4 w-4 items-center justify-center rounded border text-[9px] ${logHighestOnly ? 'border-[#16274F] bg-[#16274F] text-white' : 'border-[#C9CDD4]'}`}>{logHighestOnly ? '✓' : ''}</span>Week High</button>
            {(logSeason !== 'All' || logOpponent !== 'All' || logGameType !== 'All' || log200Only || logHighestOnly) && <button onClick={() => { setLogSeason('All'); setLogOpponent('All'); setLogGameType('All'); setLog200Only(false); setLogHighestOnly(false) }} className="col-span-2 min-h-9 rounded-lg border border-[#E4E6EA] bg-[#F7F8FA] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] sm:col-span-1">Clear</button>}
          </div>
        </div>
        <div className="max-h-[560px] overflow-auto">
          {filteredLog.map((g, i) => {
            const won = String(g?.Result || '').trim().toUpperCase() === 'W'
            const pf = parseWeeklyPoints(g?.PF)
            const pa = parseWeeklyPoints(g?.PA)
            const gType = String(g?.GameStage || '').trim()
            const key = `${String(g?.Season || '').trim()}|${String(g?.Week || '').trim()}`
            const isWeekHigh = gType === 'Reg Season' && pf > 0 && pf === weeklyMaxPFRS[key]
            const canonical = games.find(row => String(row?.Season || '').trim() === String(g?.Season || '').trim() && String(row?.Week || '').trim() === String(g?.Week || '').trim() && ((normalizeTeamName(row?.Team) === normalizeTeamName(selected.team) && normalizeTeamName(row?.Opponent) === normalizeTeamName(g?.Opponent)) || (normalizeTeamName(row?.Team) === normalizeTeamName(g?.Opponent) && normalizeTeamName(row?.Opponent) === normalizeTeamName(selected.team)))) || g
            const href = canonicalMatchupHref(canonical, games)
            return (
              <a key={i} href={href} className="grid grid-cols-[56px_28px_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#F1F2F4] px-3 py-3 transition-colors hover:bg-[#F7F8FA] sm:grid-cols-[78px_32px_minmax(0,1fr)_auto] sm:gap-3 sm:px-4">
                <div><div className="text-[11px] font-semibold text-[#16274F]">{g.Season}</div><div className="text-[9px] text-[#6B7280]">Wk {g.Week}</div></div>
                <TeamAvatar name={g.Opponent} size="xs" />
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-[#111]">vs {shortName(g.Opponent)}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {gType !== 'Reg Season' && <span className="rounded-full bg-[#F4F5F7] px-1.5 py-0.5 text-[8px] font-medium uppercase text-[#6B7280]">{gType}</span>}
                    {pf >= 200 && <span className="rounded-full bg-[#FFF2B8] px-1.5 py-0.5 text-[8px] font-semibold uppercase text-[#6B5A00]">200+</span>}
                    {isWeekHigh && <span className="rounded-full bg-[#EEF3FF] px-1.5 py-0.5 text-[8px] font-semibold uppercase text-[#16274F]">Week High</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 tabular-nums"><span className={`text-[12px] font-semibold whitespace-nowrap ${won ? 'text-[#1E8E3E]' : 'text-[#D01F2D]'}`}>{won ? 'W' : 'L'} {pf.toFixed(1)}–{pa.toFixed(1)}</span><ChevronRight className="h-4 w-4 text-[#A0A5AD]" /></div>
              </a>
            )
          })}
          {filteredLog.length === 0 && <div className="py-12 text-center text-[12px] text-[#6B7280]">No games match these filters</div>}
        </div>
      </div>
    )

    const PlayerArchiveCard = () => (
      <div className="overflow-hidden rounded-xl bg-white">
        <SectionHeader eyebrow="Roster history" title="Player Archive" meta={`${playerArchive.length} players`} icon={Users} />
        <div className="border-b border-[#EEF0F2] p-2.5 sm:p-3">
          <div className="grid grid-cols-2 gap-1.5 lg:flex lg:items-center">
            <CompactCheckFilter value={playerPositionFilter} onChange={setPlayerPositionFilter} options={playerPositionOptions} label="Position" />
            <CompactCheckFilter value={playerSort} onChange={setPlayerSort} options={['Appearances','Starts','Benchs','Average Points','Highest Score']} label="Sort by" neutral />
            <CompactCheckFilter value={playerSeasonFilter} onChange={setPlayerSeasonFilter} options={playerSeasonOptions} label="Season" />
            <CompactCheckFilter value={playerMinApps} onChange={setPlayerMinApps} options={playerMinAppOptions} label="Min apps" />
            <div className="col-span-2 lg:w-64"><input value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} placeholder="Search player..." className="w-full rounded-lg border border-[#E4E6EA] bg-white px-3 py-2.5 text-[12px] text-[#111] outline-none placeholder:text-[#9CA3AF] focus:border-[#D01F2D]" /></div>
          </div>
        </div>
        <div className="grid max-h-[660px] grid-cols-1 gap-px overflow-y-auto bg-[#EEF0F2] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {filteredPlayers.map(player => (
            <button key={player.archiveKey} onClick={() => openPlayerProfile(player.archiveKey)} className="group flex items-center gap-3 bg-white px-3 py-3.5 text-left transition-colors hover:bg-[#F7F8FA] sm:px-4">
              <PlayerAvatar name={player.rawName} playerLookup={playerLookup} size={46} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[12px] font-semibold text-[#111] group-hover:text-[#D01F2D]">{player.name}</span>{player.position && <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-semibold uppercase ${getPositionBadgeClasses(player.position).replace(/border-\S+/g,'border-transparent')}`}>{player.position}</span>}</div>
                <div className="mt-1 text-[9px] text-[#6B7280]">{player.appearances} apps · {player.starts} starts · {player.bench} bench</div>
              </div>
              <div className="hidden text-right sm:block"><div className="text-[11px] font-semibold text-[#16274F]">{player.avgPts.toFixed(2)}</div><div className="text-[8px] uppercase tracking-[0.1em] text-[#6B7280]">AVG</div></div>
              <div className="text-right"><div className="text-[11px] font-semibold text-[#16274F]">{player.bestPts.toFixed(2)}</div><div className="text-[8px] uppercase tracking-[0.1em] text-[#6B7280]">BEST</div></div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#A0A5AD]" />
            </button>
          ))}
          {filteredPlayers.length === 0 && <div className="col-span-full bg-white py-12 text-center text-[12px] text-[#6B7280]">No players found</div>}
        </div>
      </div>
    )

    const PlayerProfile = selectedPlayer ? (
      <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-[#111]/55 p-0 sm:items-center sm:p-4" onClick={closePlayerProfile}>
        <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white sm:h-[92vh]" onClick={e => e.stopPropagation()}>
          <div className="flex-shrink-0 border-b border-[#EEF0F2] bg-[#16274F] px-3 py-3 text-white sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Player Profile</div>
              <button onClick={closePlayerProfile} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg text-white hover:bg-white/15" aria-label="Close player profile">×</button>
            </div>
            <div className="mt-3 flex items-center gap-3 sm:gap-4">
              <PlayerAvatar name={selectedPlayer.rawName} playerLookup={playerLookup} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2"><h2 className="truncate text-[20px] font-semibold sm:text-3xl">{selectedPlayer.rawName}</h2>{selectedPlayer.position && <span className={`rounded-full px-2 py-1 text-[8px] font-semibold uppercase ${getPositionBadgeClasses(selectedPlayer.position).replace(/border-\S+/g,'border-transparent')}`}>{selectedPlayer.position}</span>}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-white/65 sm:text-[11px]">
                  {sleeperPlayerInfo?.team && <><span>{String(sleeperPlayerInfo.team).toUpperCase()}</span><span>·</span></>}
                  <span>Jersey {sleeperPlayerInfo?.number != null ? `#${sleeperPlayerInfo.number}` : '—'}</span><span>·</span><span>Age {sleeperPlayerInfo?.age != null ? `${sleeperPlayerInfo.age}` : '—'}</span><span>·</span><span>Exp {sleeperPlayerInfo?.years_exp != null ? `${sleeperPlayerInfo.years_exp}` : '—'}</span>
                  {sleeperPlayerLoading && <span>Loading…</span>}
                </div>
              </div>
              <img src="https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png" alt="NFL" className="hidden h-12 w-12 object-contain opacity-90 sm:block" />
            </div>
          </div>
          <div className="flex-shrink-0 border-b border-[#EEF0F2] bg-white px-3 py-2 sm:px-5">
            <div className="flex gap-1 overflow-x-auto">
              {selectedPlayerClubs.map(c => {
                const checked = selectedPlayerTeams.some(team => normalizeTeamName(team) === normalizeTeamName(c.team))
                return <label key={normalizeTeamName(c.team)} className={`flex h-8 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2 transition-colors ${checked ? 'border-[#16274F] bg-[#EEF3FF]' : 'border-[#E4E6EA] bg-white'}`}><input type="checkbox" checked={checked} onChange={() => togglePlayerTeam(c.team)} className="h-3.5 w-3.5 accent-[#16274F]" /><span className="flex h-5 w-5 items-center justify-center"><TeamAvatar name={c.team} size="xs" /></span><span className="text-[9px] font-semibold text-[#16274F]">{shortName(c.team)}</span></label>
              })}
            </div>
          </div>
          <div className="flex-shrink-0 grid grid-cols-3 gap-px bg-[#EEF0F2] sm:grid-cols-6">
            {[
              ['Apps', selectedPlayerStats.appearances], ['Starts', selectedPlayerStats.starts], ['Bench', selectedPlayerStats.bench], ['Avg Pts', selectedPlayerStats.avgPts.toFixed(2)], ['Best Pts', selectedPlayerStats.bestPts.toFixed(2)], ['Seasons', selectedPlayerStats.seasons.size ? formatSeasonList(Array.from(selectedPlayerStats.seasons)) : '—'],
            ].map(([label,value]) => <div key={label} className="bg-[#F7F8FA] px-2 py-2.5 text-center"><div className="text-[7px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">{label}</div><div className="mt-0.5 text-[15px] font-semibold tabular-nums text-[#16274F]">{value}</div></div>)}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="min-w-[820px] w-full">
              <thead className="sticky top-0 z-10 bg-white"><tr className="border-b border-[#EEF0F2]">{['Season','Week','Team','Opponent','Status','Player Pts','Team PF','Result','Stage'].map((h,i) => <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[8px] font-semibold uppercase tracking-[0.14em] text-[#6B7280] sm:px-4">{h}</th>)}</tr></thead>
              <tbody>
                {sortedSelectedPlayerGames.map((g,i)=><tr key={`${g.season}-${g.week}-${g.opponent}-${i}`} onClick={()=>{window.location.href=g.matchupHref}} className="cursor-pointer border-b border-[#F1F2F4] hover:bg-[#F7F8FA]"><td className="px-3 py-2.5 text-[11px] font-semibold text-[#16274F] sm:px-4">{g.season}</td><td className="px-3 py-2.5 text-[11px] text-[#3F4757] sm:px-4">{g.week}</td><td className="px-3 py-2.5 text-[11px] font-medium text-[#111] sm:px-4">{shortName(g.team)}</td><td className="px-3 py-2.5 text-[11px] font-medium text-[#111] sm:px-4">{shortName(g.opponent)}</td><td className="px-3 py-2.5 sm:px-4"><span className={`rounded-full px-2 py-0.5 text-[8px] font-medium uppercase ${g.status === 'Starter' ? 'bg-[#F2F8F3] text-[#1E8E3E]' : 'bg-[#F4F5F7] text-[#6B7280]'}`}>{g.status}</span></td><td className="px-3 py-2.5 text-[11px] font-semibold tabular-nums text-[#16274F] sm:px-4">{g.pts.toFixed(2)}</td><td className="px-3 py-2.5 text-[11px] tabular-nums text-[#3F4757] sm:px-4">{g.teamPF.toFixed(2)}</td><td className={`px-3 py-2.5 text-[11px] font-semibold sm:px-4 ${g.result==='W'?'text-[#1E8E3E]':'text-[#D01F2D]'}`}>{g.result || '—'}</td><td className="px-3 py-2.5 text-[10px] text-[#6B7280] sm:px-4">{g.gameStage || '—'}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ) : null

    return (
      <main className="mx-root min-h-screen bg-[#EDEEF0] text-[#111]">
        <style>{`\n          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');\n          .mx-root { font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; text-rendering:optimizeLegibility; font-variant-numeric:tabular-nums; }\n          .scroll-hide::-webkit-scrollbar{display:none;} .scroll-hide{-ms-overflow-style:none;scrollbar-width:none;}\n        `}</style>
        <Header />
        <section className="mx-auto w-full max-w-[1400px] px-0 pb-6 pt-0 sm:px-2 lg:px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[12px] font-semibold text-[#6B7280]">Loading...</div>
          ) : (
            <>
              <div className="mb-2 overflow-hidden rounded-xl bg-white">
                <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
                  <div className="min-w-0">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#D01F2D]">Tapitas League</div>
                    <div className="mt-0.5 text-[17px] font-semibold tracking-tight text-[#111] sm:text-[19px]">Franchises</div>
                    <div className="mt-0.5 text-[11px] text-[#6B7280]">The active teams, records and history of the league.</div>
                  </div>
                  <div className="hidden flex-shrink-0 items-center gap-2 sm:flex"><span className="rounded-full bg-[#F4F5F7] px-2.5 py-1 text-[9px] font-medium uppercase tracking-wide text-[#6B7280]">{teams.length} current</span></div>
                </div>
              </div>

              {!selected ? <TeamList /> : (
                <>
                  <div className="mb-2 overflow-hidden rounded-xl bg-white">
                    <div className="flex items-center gap-2 border-b border-[#EEF0F2] px-3 py-2.5 sm:px-4">
                      <button type="button" onClick={showAllTeams} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F4F5F7] text-[#3F4757] hover:bg-[#ECEEF1]" aria-label="Back to all franchises"><ChevronRight className="h-4 w-4 rotate-180" /></button>
                      <div className="min-w-0 flex-1"><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#D01F2D]">Franchise</div><div className="truncate text-[14px] font-semibold text-[#111]">{shortName(selected.team)}</div></div>
                      <div className="hidden items-center gap-2 text-[10px] text-[#6B7280] sm:flex"><span>{teamRecordLabel}</span><span>·</span><span>{winPct}</span><span>·</span><span>{teamSeasons} seasons</span></div>
                    </div>
                    <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
                      <TeamAvatar name={selected.team} size="md" />
                      <div className="min-w-0 flex-1"><div className="truncate text-[20px] font-semibold tracking-tight text-[#111] sm:text-[24px]">{selected.team}</div><div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-[#6B7280] sm:text-[11px]"><span>{teamRecordLabel}</span><span>·</span><span>{winPct} win rate</span><span>·</span><span>{teamSeasons} seasons</span>{titles.length > 0 && <><span>·</span><span className="text-[#8D6A00]">{titles.length} title{titles.length===1?'':'s'}</span></>}</div></div>
                      <div className="hidden text-right sm:block"><div className="text-[9px] uppercase tracking-[0.12em] text-[#6B7280]">Current</div><div className="mt-0.5 text-[14px] font-semibold text-[#16274F]">{recentSeason?.Season || '—'} {recentSeason ? `${parseNumber(recentSeason.RS_W)}–${parseNumber(recentSeason.RS_L)}` : ''}</div></div>
                    </div>
                  </div>

                  <div className="mb-2 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[#EEF0F2] sm:grid-cols-3 lg:grid-cols-6">
                    {profileStats.map(stat => { const a=accentMap[stat.accent]; return <div key={stat.label} className="bg-white px-3 py-3 sm:px-4"><div className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${a.text}`}>{stat.label}</div><div className="mt-1 text-[22px] font-semibold leading-none text-[#111]">{stat.value}</div><div className="mt-1 truncate text-[9px] text-[#6B7280]">{stat.sub}</div></div> })}
                  </div>

                  <div className="mb-2 flex overflow-hidden rounded-xl bg-white lg:hidden">
                    {[['overview','Overview'],['games','Game Log'],['players','Players'],['h2h','H2H']].map(([key,label]) => <button key={key} type="button" onClick={()=>setMobileTeamView(key)} className={`flex-1 border-b-2 px-2 py-2.5 text-[12px] ${mobileTeamView===key?'border-[#D01F2D] font-semibold text-[#111]':'border-transparent text-[#6B7280]'}`}>{label}</button>)}
                  </div>

                  <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className={`${mobileTeamView === 'overview' ? 'block' : 'hidden'} lg:block`}>
                        <SeasonHistoryCard />
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {recordHighlights.map(item => { const a=accentMap[item.accent]; return <a key={item.label} href={item.href} className="rounded-xl bg-white px-3 py-3 transition-colors hover:bg-[#F7F8FA]"><div className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${a.text}`}>{item.label}</div><div className="mt-1 text-[23px] font-semibold leading-none tabular-nums text-[#111]">{item.value}</div><div className="mt-1 line-clamp-2 text-[9px] text-[#6B7280]">{item.sub}</div></a> })}
                        </div>
                        {(bestSeason || worstSeason) && <div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white px-3 py-3"><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#1E8E3E]">Best Season</div><div className="mt-1 text-[22px] font-semibold text-[#111]">{bestSeason ? `${parseNumber(bestSeason.RS_W)}–${parseNumber(bestSeason.RS_L)}` : '—'}</div><div className="mt-1 text-[9px] text-[#6B7280]">{bestSeason ? `${bestSeason.Season} · ${Math.round(parseNumber(bestSeason.RS_PF))} pts` : '—'}</div></div><div className="rounded-xl bg-white px-3 py-3"><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#D01F2D]">Worst Season</div><div className="mt-1 text-[22px] font-semibold text-[#111]">{worstSeason ? `${parseNumber(worstSeason.RS_W)}–${parseNumber(worstSeason.RS_L)}` : '—'}</div><div className="mt-1 text-[9px] text-[#6B7280]">{worstSeason ? `${worstSeason.Season} · ${Math.round(parseNumber(worstSeason.RS_PF))} pts` : '—'}</div></div></div>}
                      </div>
                      <div className={`${mobileTeamView === 'games' ? 'block' : 'hidden'} lg:block`}><GameLogCard /></div>
                      <div className={`${mobileTeamView === 'players' ? 'block' : 'hidden'} lg:block`}><PlayerArchiveCard /></div>
                    </div>
                    <div className="mt-2 space-y-2 lg:mt-0">
                      <div className={`${mobileTeamView === 'h2h' ? 'block' : 'hidden'} lg:block`}><HeadToHeadCard /></div>
                      <div className="hidden lg:block overflow-hidden rounded-xl bg-white"><SectionHeader eyebrow="League records" title="At a glance" meta="all-time" icon={Trophy} /><div className="grid grid-cols-2 gap-px bg-[#EEF0F2]"><div className="bg-white p-3"><div className="text-[9px] uppercase tracking-[0.12em] text-[#6B7280]">PR #1</div><div className="mt-1 text-[18px] font-semibold text-[#111]">{pr1Weeks}</div></div><div className="bg-white p-3"><div className="text-[9px] uppercase tracking-[0.12em] text-[#6B7280]">200+</div><div className="mt-1 text-[18px] font-semibold text-[#111]">{games200}</div></div><div className="bg-white p-3"><div className="text-[9px] uppercase tracking-[0.12em] text-[#6B7280]">High scorer</div><div className="mt-1 text-[18px] font-semibold text-[#111]">{topScoringWeeks}</div></div><div className="bg-white p-3"><div className="text-[9px] uppercase tracking-[0.12em] text-[#6B7280]">Playoff W</div><div className="mt-1 text-[18px] font-semibold text-[#111]">{poWins}</div></div></div></div>
                      <div className="hidden lg:block overflow-hidden rounded-xl bg-white"><SectionHeader eyebrow="Roster leaders" title="Franchise players" meta="all-time" icon={Star} />{[mostRostered.length>0?{label:'Most Apps',p:mostRostered[0]}:null,mostStarted.length>0?{label:'Most Starts',p:mostStarted[0]}:null,bestAvgPlayer?{label:'Best AVG',p:bestAvgPlayer}:null,bestScorePlayer?{label:'Best Score',p:bestScorePlayer}:null].filter(Boolean).map(item=><button key={item.label} onClick={()=>openPlayerProfile(item.p.archiveKey || `raw:${item.p.rawName}`)} className="flex w-full items-center gap-2.5 border-b border-[#F1F2F4] px-3 py-3 text-left hover:bg-[#F7F8FA]"><PlayerAvatar name={item.p.rawName} playerLookup={playerLookup} size={30}/><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold text-[#111]">{item.p.name}</div><div className="mt-0.5 text-[9px] text-[#6B7280]">{item.label}</div></div><div className="text-right"><div className="text-[11px] font-semibold text-[#16274F]">{item.p.count ?? (item.label==='Best AVG'?item.p.avgPts:item.p.bestPts).toFixed(2)}</div><ChevronRight className="ml-auto mt-1 h-3 w-3 text-[#A0A5AD]"/></div></button>)}</div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
        {PlayerProfile}
      </main>
    )
  }

  return (
    <main className="mx-root min-h-screen bg-[#EDEEF0] text-[#111]">
      <style>{`\n        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');\n        .mx-root { font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; text-rendering:optimizeLegibility; font-variant-numeric:tabular-nums; }\n      `}</style>
      <Header />
      <section className="mx-auto w-full max-w-[1400px] px-0 pb-6 pt-0 sm:px-2 lg:px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[12px] font-semibold text-[#6B7280]">Loading...</div>
        ) : (
          <>
            <div className="mb-2 overflow-hidden rounded-xl bg-white">
              <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
                <div className="min-w-0"><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#D01F2D]">Tapitas League</div><div className="mt-0.5 text-[17px] font-semibold tracking-tight text-[#111] sm:text-[19px]">Franchises</div><div className="mt-0.5 text-[11px] text-[#6B7280]">The active teams, records and history of the league.</div></div>
                <span className="flex-shrink-0 rounded-full bg-[#F4F5F7] px-2.5 py-1 text-[9px] font-medium uppercase tracking-wide text-[#6B7280]">{teams.length} current</span>
              </div>
            </div>
            <TeamList teams={teams} selectTeam={selectTeam} getTeamHistory={getTeamHistory} />
          </>
        )}
      </section>
    </main>
  )
}

