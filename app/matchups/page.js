'use client'

import Image from 'next/image'
import { Suspense, useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, ChevronDown, Swords, Activity } from 'lucide-react'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'
import Header from '../components/Header'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
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

const ROSTER_CONFIG = {
  2014: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, def: 1 },
  2015: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, def: 1 },
  2016: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, def: 1 },
  2021: { qb: 2, rb: 3, wr: 3, te: 1, flex: 2, k: 1, def: 1 },
  2022: { qb: 2, rb: 3, wr: 3, te: 1, flex: 2, k: 1, def: 1 },
  2023: { qb: 2, rb: 2, wr: 2, te: 1, flex: 3, k: 1, def: 1 },
  2024: { qb: 2, rb: 2, wr: 2, te: 1, flex: 3, k: 1, def: 1 },
  2025: { qb: 2, rb: 2, wr: 2, te: 1, flex: 3, k: 1, def: 1 },
}

function HeaderFilter({ value, onChange, options, label }) {
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
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.18em] hover:text-[#D01F2D] ${value !== 'All' ? 'text-[#D01F2D]' : ''}`}
      >
        {value === 'All' ? label : value}
        <span className="text-[9px] text-[#D01F2D]">⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[150px] overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
          <div className="max-h-56 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`block w-full px-3 py-2 text-left text-[10px] font-black uppercase hover:bg-[#F7F6F2] ${opt === value ? 'bg-[#FDEDEE] text-[#D01F2D]' : 'text-[#3F4757]'}`}
              >
                {opt === 'All' ? label : opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getRosterPositions(seasonYear) {
  const config = ROSTER_CONFIG[Number(seasonYear)] || ROSTER_CONFIG[2025]
  const positions = []
  const add = (pos, count) => { for (let i = 0; i < count; i++) positions.push(pos) }
  add('QB', config.qb)
  add('RB', config.rb)
  add('WR', config.wr)
  add('TE', config.te)
  add('FLEX', config.flex)
  add('K', config.k)
  add('DEF', config.def)
  return positions
}

// Desempenho histórico: 45+ pts em um confronto é um outlier raro, digno de destaque
const HISTORIC_PTS_THRESHOLD = 45

function getPosColor(pos) {
  const colors = {
    'QB': 'text-white border-[#0A0A0A] bg-[#D01F2D]',
    'RB': 'text-white border-[#0A0A0A] bg-[#1E8E3E]',
    'WR': 'text-white border-[#0A0A0A] bg-[#16274F]',
    'TE': 'text-white border-[#0A0A0A] bg-[#B8860B]',
    'FLEX': 'text-white border-[#0A0A0A] bg-[#3F4757]',
    'K': 'text-white border-[#0A0A0A] bg-[#6B7280]',
    'DEF': 'text-white border-[#0A0A0A] bg-[#3F4757]',
  }
  return colors[pos] ?? 'text-[#3F4757] border-[#0A0A0A]/15 bg-[#F7F6F2]'
}

// Extrai jogadores de uma linha do GAME_FACTS_ALL
function extractPlayers(game, prefix) {
  const players = []
  for (let i = 1; i <= 13; i++) {
    const name = game?.[`${prefix}${i}_Name`]
    const pts = game?.[`${prefix}${i}_Pts`]
    if (name && name !== '--empty--' && name !== '') {
      players.push({ name: String(name).trim(), pts: parseNumber(pts) })
    }
  }
  return players
}

function normalizeString(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

const TEAM_AVATARS = {
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

function getTeamAvatar(name) {
  return TEAM_AVATARS[normalizeString(name)] || null
}

function getInitials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Avatar de time com fallback de iniciais (mesmo tamanho dos outros avatares)
function TeamAvatar({ name, className = '', textClassName = '' }) {
  const avatarSrc = getTeamAvatar(name)
  if (avatarSrc) {
    return <img src={avatarSrc} alt={name} className={`${className} object-contain block max-w-full max-h-full`} />
  }
  return (
    <div className={`${className} bg-[#16274F] flex items-center justify-center flex-shrink-0`}>
      <span className={`font-black text-white ${textClassName}`}>
        {getInitials(name)}
      </span>
    </div>
  )
}

function normalizePlayerKey(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Maps full/nickname team names → ESPN abbr
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
  'redskins': 'wsh', 'washington redskins': 'wsh',
  'football team': 'wsh', 'washington football team': 'wsh',
}

function getNFLTeamLogo(nameOrAbbr) {
  if (!nameOrAbbr || nameOrAbbr === '--') return null
  const raw = String(nameOrAbbr).toLowerCase().trim()
  // Try full name map first
  const mapped = NFL_TEAM_NAME_MAP[raw]
  if (mapped) return `https://a.espncdn.com/i/teamlogos/nfl/500/${mapped}.png`
  // Already an abbr (e.g. "kc", "sf") — remap wsh
  const abbr = raw === 'was' ? 'wsh' : raw
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`
}

const NFL_TEAM_SHORT = { ari:'Cardinals', atl:'Falcons', bal:'Ravens', buf:'Bills', car:'Panthers', chi:'Bears', cin:'Bengals', cle:'Browns', dal:'Cowboys', den:'Broncos', det:'Lions', gb:'Packers', hou:'Texans', ind:'Colts', jax:'Jaguars', kc:'Chiefs', lac:'Chargers', lar:'Rams', lv:'Raiders', mia:'Dolphins', min:'Vikings', ne:'Patriots', no:'Saints', nyg:'Giants', nyj:'Jets', phi:'Eagles', pit:'Steelers', sea:'Seahawks', sf:'49ers', tb:'Buccaneers', ten:'Titans', wsh:'Commanders' }
function getNFLTeamShortName(nameOrAbbr) {
  if (!nameOrAbbr) return ''
  const raw = String(nameOrAbbr).toLowerCase().trim()
  const mapped = NFL_TEAM_NAME_MAP[raw] || (raw === 'was' ? 'wsh' : raw)
  return NFL_TEAM_SHORT[mapped] || String(nameOrAbbr)
}

// Lookup: name|pos first, then name alone — NO sorting by id, first occurrence wins
function buildPlayerLookup(rows) {
  const map = new Map()
  rows.forEach(row => {
    const playerId = String(row?.player_id || '').trim()
    const abbreviated = String(row?.name || '').trim()
    const fullName = String(row?.full_name || '').trim()
    const team = String(row?.team || '').trim().toLowerCase()
    const pos = String(row?.position || '').trim().toUpperCase()
    if (!playerId) return
    const entry = { playerId, team, pos, abbreviated, fullName }
      ;[abbreviated, fullName].filter(Boolean).forEach(value => {
        const baseKey = normalizePlayerKey(value)
        if (!baseKey) return
        // With position: always set (last write wins per pos — acceptable)
        if (pos) map.set(`${baseKey}|${pos}`, entry)
        // Without position: first occurrence only (no sort, original order)
        if (!map.has(baseKey)) map.set(baseKey, entry)
      })
  })
  return map
}

function getPlayerData(name, pos, playerLookup) {
  if (!playerLookup || !name) return null
  const baseKey = normalizePlayerKey(name)
  const posUpper = String(pos || '').toUpperCase()
  if (posUpper) {
    const withPos = playerLookup.get(`${baseKey}|${posUpper}`)
    if (withPos) return withPos
    if (posUpper === 'FLEX') {
      for (const p of ['RB', 'WR', 'TE']) {
        const r = playerLookup.get(`${baseKey}|${p}`)
        if (r) return r
      }
    }
  }
  return playerLookup.get(baseKey) || null
}

// Fallback abbreviation for when the lookup doesn't resolve a match (e.g. player
// not yet in _PLAYER_CACHE): "Javonte Williams" -> "J. Williams". Names already
// abbreviated ("J. Love") pass through unchanged.
function formatAbbreviatedName(name) {
  const raw = String(name || '').trim()
  if (!raw) return raw
  if (/^[A-Za-z]\.\s/.test(raw)) return raw // already "X. Something"
  const parts = raw.split(/\s+/)
  if (parts.length < 2) return raw
  const first = parts[0]
  const last = parts[parts.length - 1]
  return `${first[0].toUpperCase()}. ${last}`
}

// Some GAME_FACTS_ALL rows spell out the full name to disambiguate homonyms
// (e.g. "Javonte Williams" vs "Jamaal Williams" — both would collide as "J.
// Williams"). The full name is what's used to resolve the correct player_id
// and photo; the display should still show the standard abbreviated form,
// taken from the matched _PLAYER_CACHE entry so it's guaranteed consistent
// with every other player on the page.
function getDisplayPlayerName(name, pos, playerLookup) {
  const data = getPlayerData(name, pos, playerLookup)
  if (data?.abbreviated) return data.abbreviated
  return formatAbbreviatedName(name)
}

const POS_RING = {
  QB: '#D01F2D',
  RB: '#1E8E3E',
  WR: '#16274F',
  TE: '#B8860B',
  FLEX: '#3F4757',
  K: '#6B7280',
  DEF: '#3F4757',
  BN: '#6B7280',
}


function getDisplayPlayerPos(name, pos, playerLookup) {
  const data = getPlayerData(name, pos, playerLookup)
  const realPos = String(data?.pos || data?.position || '').toUpperCase()
  if (realPos === 'DST') return 'DEF'
  if (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(realPos)) return realPos
  if (pos === 'DEF') return 'DEF'
  return String(pos || '').toUpperCase()
}

function PlayerRowAvatar({ name, pos, playerLookup, size = 36, mirror = false }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)

  const data = getPlayerData(name, pos, playerLookup)
  const resolvedPos = getDisplayPlayerPos(name, pos, playerLookup)
  const isDefense = resolvedPos === 'DEF'
  const playerId = data?.playerId
  const nflTeam = data?.team

  useEffect(() => {
    setPhotoFailed(false)
  }, [name, playerId, pos])

  useEffect(() => {
    setLogoFailed(false)
  }, [name, nflTeam, pos])

  const photoSrc = !photoFailed
    ? (
      isDefense
        ? getNFLTeamLogo(name)
        : (playerId
          ? `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`
          : null)
    )
    : null

  const teamLogoSrc = !logoFailed && !isDefense && nflTeam
    ? getNFLTeamLogo(nflTeam)
    : null

  const ring = POS_RING[resolvedPos] || POS_RING[pos] || '#475569'

    const initials = String(name || '?')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const badgeSize = Math.round(size * 0.56)
  const ringWidth = 2

  const photo = (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        boxSizing: 'border-box',
        border: `${ringWidth}px solid ${ring}`,
        background: '#F7F6F2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {photoSrc ? (
        <img
          src={photoSrc}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setPhotoFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
            objectPosition: isDefense ? 'center center' : '50% 18%',
          }}
        />
      ) : (
        <span
          style={{
            fontSize: size * 0.3,
            fontWeight: 900,
            color: '#16274F',
            lineHeight: 1,
          }}
        >
          {initials}
        </span>
      )}
    </div>
  )

  const badge = teamLogoSrc ? (
    <div
      style={{
        width: badgeSize,
        height: badgeSize,
        minWidth: badgeSize,
        minHeight: badgeSize,
        borderRadius: '50%',
        flexShrink: 0,
        background: '#FFFFFF',
        border: '1px solid #0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <img
        src={teamLogoSrc}
        alt={nflTeam}
        width={badgeSize - 6}
        height={badgeSize - 6}
        loading="lazy"
        onError={() => setLogoFailed(true)}
        style={{
          width: badgeSize - 6,
          height: badgeSize - 6,
          display: 'block',
          objectFit: 'contain',
        }}
      />
    </div>
  ) : null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        paddingLeft: ringWidth,
        paddingTop: ringWidth,
        paddingBottom: ringWidth,
      }}
    >
      {mirror && badge}
      {photo}
      {!mirror && badge}
    </div>
  )
}


// Helper: last week in a season that has at least one played game (PF > 0)
function findLastPlayedWeek(data, seasonVal) {
  const played = data.filter(g =>
    String(g?.Season || '').trim() === seasonVal &&
    parseNumber(g?.PF || g?.Score || 0) > 0
  )
  const weeks = [...new Set(played.map(g => String(g?.Week || '').trim()).filter(Boolean))]
    .sort((a, b) => parseFloat(a) - parseFloat(b))
  return weeks[weeks.length - 1] || null
}

// Helper: first game of a given week (deduped)
function firstGameOfWeek(data, seasonVal, weekVal) {
  const seen = new Set()
  for (const g of data) {
    if (String(g?.Season || '').trim() !== seasonVal) continue
    if (String(g?.Week || '').trim() !== weekVal) continue
    const team = String(g?.Team || '').trim()
    const opp = String(g?.Opponent || '').trim()
    const key = [team, opp].sort().join('|')
    if (!seen.has(key)) return g
  }
  return null
}


let SLEEPER_PLAYERS_PROMISE = null
const SLEEPER_WEEKLY_PROMISES = new Map()
const SLEEPER_SCHEDULE_PROMISES = new Map()

async function fetchSleeperRegularSchedule(season) {
  const key = String(season)
  if (!SLEEPER_SCHEDULE_PROMISES.has(key)) {
    const promise = fetch(`https://api.sleeper.app/schedule/nfl/regular/${encodeURIComponent(season)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      .then(r => { if (!r.ok) throw new Error(`Sleeper schedule request failed: ${r.status}`); return r.json() })
      .catch(e => { SLEEPER_SCHEDULE_PROMISES.delete(key); throw e })
    SLEEPER_SCHEDULE_PROMISES.set(key, promise)
  }
  return SLEEPER_SCHEDULE_PROMISES.get(key)
}

function getSleeperNflOpponent(schedule, team, week) {
  const t = String(team || '').toUpperCase()
  const w = Number.parseInt(String(week || '').split(/[-–]/)[0], 10)
  if (!t || !Number.isFinite(w) || !Array.isArray(schedule)) return null
  const game = schedule.find(g => Number(g?.week) === w && (String(g?.home || '').toUpperCase() === t || String(g?.away || '').toUpperCase() === t))
  if (!game) return null
  const opponent = String(game.home || '').toUpperCase() === t ? game.away : game.home
  if (!opponent) return null
  return { abbr: String(opponent).toLowerCase(), home: String(game.home || '').toUpperCase() === t ? 'home' : 'away' }
}

async function fetchSleeperPlayers() {
  if (!SLEEPER_PLAYERS_PROMISE) {
    SLEEPER_PLAYERS_PROMISE = fetch('https://api.sleeper.app/v1/players/nfl').then(r => {
      if (!r.ok) throw new Error(`Sleeper players request failed: ${r.status}`)
      return r.json()
    }).catch(e => { SLEEPER_PLAYERS_PROMISE = null; throw e })
  }
  return SLEEPER_PLAYERS_PROMISE
}

async function fetchSleeperWeeklyStats(season, week, seasonType = 'regular') {
  const key = `${season}:${seasonType}:${week}`
  if (!SLEEPER_WEEKLY_PROMISES.has(key)) {
    const promise = fetch(`https://api.sleeper.app/v1/stats/nfl/${seasonType}/${encodeURIComponent(season)}/${encodeURIComponent(week)}`)
      .then(r => { if (!r.ok) throw new Error(`Sleeper weekly stats request failed: ${r.status}`); return r.json() })
      .catch(e => { SLEEPER_WEEKLY_PROMISES.delete(key); throw e })
    SLEEPER_WEEKLY_PROMISES.set(key, promise)
  }
  return SLEEPER_WEEKLY_PROMISES.get(key)
}

function getPlayerId(name, playerLookup) {
  return playerLookup?.get(normalizePlayerKey(name))?.playerId || null
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
  return colors[String(position || '').toUpperCase()] || 'border-white/20 bg-white/10 text-white'
}

function formatPlayerStatLine(stats, pos) {
  if (!stats) return []
  const n = key => Number(stats?.[key] ?? 0)
  const items = []
  const p = String(pos || '').toUpperCase()
  if (p === 'QB') {
    if (n('pass_cmp') || n('pass_att')) items.push(`${n('pass_cmp')}/${n('pass_att')}`)
    if (n('pass_yd')) items.push(`${n('pass_yd')} YDS`)
    if (n('pass_td')) items.push(`${n('pass_td')} TD`)
    if (n('pass_int')) items.push(`${n('pass_int')} INT`)
  } else if (p === 'RB') {
    if (n('rush_att')) items.push(`${n('rush_att')} CAR`)
    if (n('rush_yd')) items.push(`${n('rush_yd')} RUSH YDS`)
    if (n('rec_tgt')) items.push(`${n('rec_tgt')} TAR`)
    if (n('rec')) items.push(`${n('rec')} REC`)
    if (n('rec_yd')) items.push(`${n('rec_yd')} REC YDS`)
    if (n('rush_td') || n('rec_td')) items.push(`${n('rush_td') + n('rec_td')} TD`)
  } else if (p === 'WR' || p === 'TE' || p === 'FLEX') {
    if (n('rec_tgt')) items.push(`${n('rec_tgt')} TAR`)
    if (n('rec')) items.push(`${n('rec')} REC`)
    if (n('rec_yd')) items.push(`${n('rec_yd')} YDS`)
    if (n('rec_td')) items.push(`${n('rec_td')} TD`)
  } else if (p === 'K') {
    if (n('fgm') || n('fga')) items.push(`${n('fgm')}/${n('fga')} FG`)
    if (n('xpm') || n('xpa')) items.push(`${n('xpm')}/${n('xpa')} XP`)
  } else if (p === 'DEF') {
    if (n('def_tkl')) items.push(`${n('def_tkl')} TKL`)
    if (n('def_sack')) items.push(`${n('def_sack')} SACK`)
    if (n('def_int')) items.push(`${n('def_int')} INT`)
    if (n('def_td')) items.push(`${n('def_td')} TD`)
  }
  return items.filter(Boolean)
}

function extractPlayerAppearances(game, max = 13) {
  const appearances = []
  for (let i = 1; i <= max; i++) {
    const starterName = game?.[`S${i}_Name`]
    const starterPts = game?.[`S${i}_Pts`]
    if (starterName && starterName !== '--empty--' && String(starterName).trim()) appearances.push({ name: String(starterName).trim(), status: 'Starter', pts: parseNumber(starterPts) })
    const benchName = game?.[`B${i}_Name`]
    const benchPts = game?.[`B${i}_Pts`]
    if (benchName && benchName !== '--empty--' && String(benchName).trim()) appearances.push({ name: String(benchName).trim(), status: 'Bench', pts: parseNumber(benchPts) })
  }
  return appearances
}

function normalizeTeamName(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function getTeamShortName(name) {
  const map = {
    'peytao da massa': 'Peytao', 'moneyball': 'Moneyball', 'ocupa e resiste': 'Ocupa',
    'i am megatron': 'Megatron', 'oldbrady': 'OldBrady', 'patrolao squad': 'Patrolao',
    'howmuch': 'Howmuch', 'pequers verde': 'Pequers', 'h-lera do mahl': 'H-Lera', 'rincao settlers': 'Rincao'
  }
  return map[normalizeTeamName(name)] || String(name || '')
}

function getTeamSeasonHistory(playerName, games) {
  const seen = new Map()
  for (const g of games || []) {
    if (String(g?.Week || '').includes('-')) continue
    const appears = extractPlayerAppearances(g).some(a => String(a.name).trim() === String(playerName).trim())
    if (!appears) continue
    const team = String(g?.Team || '').trim()
    if (!team) continue
    if (!seen.has(normalizeTeamName(team))) seen.set(normalizeTeamName(team), { team, seasons: new Set() })
    const season = String(g?.Season || '').trim()
    if (season) seen.get(normalizeTeamName(team)).seasons.add(season)
  }
  return Array.from(seen.values()).map(x => ({ ...x, seasons: Array.from(x.seasons).sort((a,b) => Number(a)-Number(b)) }))
}

function PlayerProfileModal({ profile, games, playerLookup, onClose }) {
  const [sleeperInfo, setSleeperInfo] = useState(null)
  const [weeklyStats, setWeeklyStats] = useState(null)
  const [selectedTeams, setSelectedTeams] = useState([profile.team])
  const [loadingStats, setLoadingStats] = useState(false)
  const [logSeasonFilter, setLogSeasonFilter] = useState('All')
  const [logOpponentFilter, setLogOpponentFilter] = useState('All')
  const [logStatusFilter, setLogStatusFilter] = useState('All')
  const [logResultFilter, setLogResultFilter] = useState('All')
  const [logStageFilter, setLogStageFilter] = useState('All')
  const [logSort, setLogSort] = useState({ key: 'season', dir: 'desc' })

  useEffect(() => {
    setSelectedTeams([profile.team])
    setLogSeasonFilter('All')
    setLogOpponentFilter('All')
    setLogStatusFilter('All')
    setLogResultFilter('All')
    setLogStageFilter('All')
    setLogSort({ key: 'season', dir: 'desc' })
  }, [profile.team, profile.rawName])

  useEffect(() => {
    let cancelled = false
    const positionForLookup = String(profile.position || '').toUpperCase()
    const id = getPlayerData(profile.rawName, positionForLookup, playerLookup)?.playerId || getPlayerId(profile.rawName, playerLookup)
    if (!id) {
      setSleeperInfo(null)
      setWeeklyStats(null)
      setLoadingStats(false)
      return undefined
    }
    setLoadingStats(true)
    const weeks = String(profile.week || '').split(/[-–]/).map(w => w.trim()).filter(Boolean)
    // Tapitas playoff/consolation weeks 15–17 are still NFL regular-season weeks.
    // Sleeper's season_type refers to the NFL season, not our fantasy stage.
    // Use post only when the actual NFL week is 18+ (or explicitly outside numeric week data).
    const numericWeeks = weeks.map(w => Number.parseInt(w, 10)).filter(Number.isFinite)
    const seasonType = numericWeeks.some(w => w >= 18) ? 'post' : 'regular'
    Promise.all([
      fetchSleeperPlayers(),
      fetchSleeperRegularSchedule(profile.season).catch(() => []),
      Promise.all(weeks.map(w => fetchSleeperWeeklyStats(profile.season, w, seasonType)))
    ])
      .then(([players, schedule, weeklyList]) => {
        const mergedPlayerStats = {}
        weeklyList.forEach(row => {
          if (!row || typeof row !== 'object') return
          const playerWeek = row?.[String(id)]
          if (!playerWeek || typeof playerWeek !== 'object') return
          Object.entries(playerWeek).forEach(([key, value]) => {
            const numeric = Number(value)
            if (Number.isFinite(numeric)) mergedPlayerStats[key] = (mergedPlayerStats[key] || 0) + numeric
            else if (mergedPlayerStats[key] == null) mergedPlayerStats[key] = value
          })
        })
        if (cancelled) return
        const info = players?.[String(id)] || getPlayerData(profile.rawName, positionForLookup, playerLookup) || null
        const nflTeam = info?.team || mergedPlayerStats?.team || null
        const nflOpponent = getSleeperNflOpponent(schedule, nflTeam, profile.week)
        setSleeperInfo(info ? { ...info, matchupOpponent: nflOpponent?.abbr || null, matchupHomeAway: nflOpponent?.home || null } : null)
        setWeeklyStats(Object.keys(mergedPlayerStats).length ? mergedPlayerStats : null)
      })
      .catch(() => {
        if (cancelled) return
        setSleeperInfo(getPlayerData(profile.rawName, positionForLookup, playerLookup) || null)
        setWeeklyStats(null)
      })
      .finally(() => { if (!cancelled) setLoadingStats(false) })
    return () => { cancelled = true }
  }, [profile.rawName, profile.position, profile.season, profile.week, profile.gameStage, playerLookup])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const selectedGames = useMemo(() => (games || []).filter(g => !String(g?.Week || '').includes('-')).flatMap(g => {
    const appearance = extractPlayerAppearances(g).find(a => String(a.name).trim() === profile.rawName)
    if (!appearance) return []
    const team = String(g?.Team || '').trim()
    if (!selectedTeams.some(t => normalizeTeamName(t) === normalizeTeamName(team))) return []
    const season = String(g?.Season || '').trim()
    const week = String(g?.Week || '').trim()
    const opponent = String(g?.Opponent || '').trim()
    const profileWeeks = String(profile.week || '').split(/[-–]/).map(w => w.trim()).filter(Boolean)
    const gameWeeks = String(week || '').split(/[-–]/).map(w => w.trim()).filter(Boolean)
    const sameWeek = profileWeeks.length > 0 && gameWeeks.length > 0 && profileWeeks.some(w => gameWeeks.includes(w))
    const isCurrentGame = season === String(profile.season || '').trim() && sameWeek && normalizeTeamName(team) === normalizeTeamName(profile.team) && normalizeTeamName(opponent) === normalizeTeamName(profile.opponent)
    return [{ g, appearance, team, season, week, opponent, isCurrentGame, result: String(g?.Result || '').trim().toUpperCase() }]
  }), [games, profile.rawName, profile.week, profile.season, profile.team, profile.opponent, selectedTeams])

  const currentGameRow = useMemo(() => selectedGames.find(x => x.isCurrentGame) || null, [selectedGames])

  const stats = useMemo(() => {
    const validForAverage = selectedGames.filter(x => !(x.appearance.status === 'Bench' && x.appearance.pts === 0))
    const total = validForAverage.reduce((a, x) => a + x.appearance.pts, 0)
    const starts = selectedGames.filter(x => x.appearance.status === 'Starter').length
    const best = selectedGames.reduce((m, x) => Math.max(m, x.appearance.pts), 0)
    return { apps: selectedGames.length, starts, bench: selectedGames.length - starts, avg: validForAverage.length ? total / validForAverage.length : 0, best, seasons: new Set(selectedGames.map(x => x.season)) }
  }, [selectedGames])

  const versus = useMemo(() => {
    const rows = (games || []).filter(g => !String(g?.Week || '').includes('-')).flatMap(g => {
      if (normalizeTeamName(g?.Team) !== normalizeTeamName(profile.team)) return []
      if (normalizeTeamName(g?.Opponent) !== normalizeTeamName(profile.opponent)) return []
      const a = extractPlayerAppearances(g).find(x => String(x.name).trim() === profile.rawName)
      return a ? [{ pts: a.pts, status: a.status }] : []
    })
    const validForAverage = rows.filter(x => !(x.status === 'Bench' && x.pts === 0))
    const total = validForAverage.reduce((a, x) => a + x.pts, 0)
    return { games: rows.length, avg: validForAverage.length ? total / validForAverage.length : 0, best: rows.reduce((m,x) => Math.max(m,x.pts),0), starts: rows.filter(x => x.status === 'Starter').length }
  }, [games, profile.rawName, profile.team, profile.opponent])

  const position = String(profile.position || '').toUpperCase()
  const statLine = formatPlayerStatLine(weeklyStats, position)
  const history = useMemo(() => getTeamSeasonHistory(profile.rawName, games), [profile.rawName, games])

  const logSeasonOptions = useMemo(() => ['All', ...Array.from(new Set(selectedGames.map(x => x.season))).sort((a,b) => Number(b)-Number(a))], [selectedGames])
  const logOpponentOptions = useMemo(() => ['All', ...Array.from(new Set(selectedGames.map(x => x.opponent).filter(Boolean))).sort()], [selectedGames])
  const logStatusOptions = useMemo(() => ['All', ...Array.from(new Set(selectedGames.map(x => x.appearance.status).filter(Boolean))).sort()], [selectedGames])
  const logResultOptions = ['All', 'W', 'L']
  const logStageOptions = useMemo(() => ['All', ...Array.from(new Set(selectedGames.map(x => String(x.g?.GameStage || '').trim()).filter(Boolean))).sort()], [selectedGames])

  const filteredGames = useMemo(() => selectedGames
    .filter(x => logSeasonFilter === 'All' || x.season === logSeasonFilter)
    .filter(x => logOpponentFilter === 'All' || x.opponent === logOpponentFilter)
    .filter(x => logStatusFilter === 'All' || x.appearance.status === logStatusFilter)
    .filter(x => logResultFilter === 'All' || x.result === logResultFilter)
    .filter(x => logStageFilter === 'All' || String(x.g?.GameStage || '').trim() === logStageFilter), [selectedGames, logSeasonFilter, logOpponentFilter, logStatusFilter, logResultFilter, logStageFilter])

  const sortedGames = useMemo(() => [...filteredGames].sort((a,b) => {
    const dir = logSort.dir === 'asc' ? 1 : -1
    if (logSort.key === 'season') {
      const sa = Number(a.season)||0, sb = Number(b.season)||0
      if (sa !== sb) return (sa - sb) * dir
      return ((parseFloat(String(a.week).replace(/[^0-9.]/g,''))||0) - (parseFloat(String(b.week).replace(/[^0-9.]/g,''))||0)) * -1
    }
    if (logSort.key === 'week') return ((parseFloat(String(a.week).replace(/[^0-9.]/g,''))||0) - (parseFloat(String(b.week).replace(/[^0-9.]/g,''))||0)) * dir
    if (logSort.key === 'pts') return (a.appearance.pts - b.appearance.pts) * dir
    if (logSort.key === 'opponent') return getTeamShortName(a.opponent).localeCompare(getTeamShortName(b.opponent)) * dir
    return 0
  }), [filteredGames, logSort])

  const toggleTeam = team => setSelectedTeams(cur => {
    const exists = cur.some(t => normalizeTeamName(t) === normalizeTeamName(team))
    if (exists) return cur.length === 1 ? cur : cur.filter(t => normalizeTeamName(t) !== normalizeTeamName(team))
    return [...cur, team]
  })

  const toggleSort = key => setLogSort(cur => ({ key, dir: cur.key === key && cur.dir === 'desc' ? 'asc' : 'desc' }))

  const MinimalMenu = ({ label, value, options, onChange }) => (
    <details className="relative min-w-0">
      <summary className="flex min-h-7 cursor-pointer list-none items-center gap-1 border border-[#D6D6D6] bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-[#16274F] [&::-webkit-details-marker]:hidden">
        <span className="truncate">{label}: {value === 'All' ? 'All' : value}</span><ChevronDown className="h-3 w-3 flex-shrink-0 text-[#6B7280]" />
      </summary>
      <div className="absolute left-0 top-full z-30 mt-1 max-h-56 min-w-[150px] overflow-auto border-2 border-[#0A0A0A] bg-white p-1.5 shadow-[3px_3px_0_#16274F]">
        {options.map(opt => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[8px] font-black uppercase text-[#16274F] hover:bg-[#F3F6FC]">
            <input type="checkbox" checked={value === opt} onChange={() => onChange(opt)} className="h-3.5 w-3.5 accent-[#16274F]" />
            <span>{opt === 'All' ? 'All' : opt === label ? opt : getTeamShortName(opt)}</span>
          </label>
        ))}
      </div>
    </details>
  )

  const sortLabel = { season: 'Season', week: 'Week', opponent: 'Opponent', pts: 'Pts' }[logSort.key]
  const sortDirLabel = logSort.dir === 'desc' ? '↓' : '↑'

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-hidden bg-[#0A0A0A]/60 p-2 pt-3 sm:items-center sm:p-5" onClick={onClose}>
      <div className="flex h-[calc(100dvh-24px)] max-h-[960px] w-full max-w-5xl flex-col overflow-hidden border-2 border-[#0A0A0A] bg-white shadow-[6px_6px_0_#16274F] sm:h-auto sm:max-h-[94vh]" onClick={e => e.stopPropagation()}>
        <div className="relative flex-shrink-0 overflow-hidden border-b-2 border-[#0A0A0A] bg-[#16274F] text-white">
          <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(135deg, transparent 0 58%, rgba(255,255,255,.13) 58% 59%, transparent 59% 68%, rgba(255,255,255,.08) 68% 69%, transparent 69%)' }} />
          <div className="relative border-b border-white/15 px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-[0.25em]">Player Profile</div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center border-2 border-white/70 bg-white/10 text-lg font-black hover:bg-white/20">×</button>
          </div>
          <div className="relative px-3 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3 sm:gap-5">
              <PlayerRowAvatar name={profile.rawName} pos={position} playerLookup={playerLookup} size={76} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2"><h2 className="truncate text-[22px] font-black leading-none tracking-tight sm:text-3xl">{profile.displayName}</h2><span className={`inline-flex flex-shrink-0 px-2 py-1 text-[9px] font-black uppercase tracking-wide ${getPositionBadgeClasses(position)}`}>{position}</span></div>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-black sm:text-xs">
                  {sleeperInfo?.team && <span className="flex items-center gap-1.5">{getNFLTeamLogo(sleeperInfo.team) && <img src={getNFLTeamLogo(sleeperInfo.team)} alt="" className="h-5 w-5 object-contain" />}{String(sleeperInfo.team).toUpperCase()}</span>}
                  <span className="text-white/35">·</span><span className={String(sleeperInfo?.status || '').toLowerCase() === 'active' ? 'text-[#69C174]' : 'text-[#FFB84D]'}>{sleeperInfo?.status ? (String(sleeperInfo.status).toLowerCase() === 'active' ? 'Active' : 'Inactive') : (loadingStats ? 'Loading…' : 'Status —')}</span>
                </div>
                <div className="mt-2 flex min-w-0 items-center gap-2 whitespace-nowrap text-[9px] font-bold text-white/75 sm:text-[11px]"><span><b className="text-white">Jersey</b> {sleeperInfo?.number != null ? `#${sleeperInfo.number}` : '—'}</span><span className="text-white/30">·</span><span><b className="text-white">Age</b> {sleeperInfo?.age != null ? `${sleeperInfo.age} yrs` : '—'}</span><span className="text-white/30">·</span><span><b className="text-white">Experience</b> {sleeperInfo?.years_exp != null ? `${sleeperInfo.years_exp} yrs` : '—'}</span></div>
              </div>
              <img src="https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png" alt="NFL" className="h-10 w-10 flex-shrink-0 object-contain sm:h-14 sm:w-14" />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-b-2 border-[#0A0A0A]/10 bg-white px-3 py-2 sm:px-6">
          <div className="flex items-center justify-between gap-2"><div className="whitespace-nowrap"><span className="text-[11px] font-black uppercase tracking-[0.1em] text-[#16274F]">Tapitas League Teams</span><span className="ml-1 text-[8px] font-bold text-[#6B7280]">— Select franchises to include</span></div><span className="text-[8px] font-black uppercase text-[#D01F2D]">{selectedTeams.length} selected</span></div>
          <div className="mt-1 flex max-w-full flex-nowrap gap-1 overflow-x-auto overflow-y-hidden pb-0.5">
            {history.map(h => { const checked = selectedTeams.some(t => normalizeTeamName(t) === normalizeTeamName(h.team)); return <label key={h.team} className={`flex h-8 flex-shrink-0 cursor-pointer items-center gap-1 border px-1.5 ${checked ? 'border-[#16274F] bg-[#EEF3FF] shadow-[2px_2px_0_#16274F]' : 'border-[#D6D6D6] bg-white'}`}><input type="checkbox" checked={checked} onChange={() => toggleTeam(h.team)} className="h-3.5 w-3.5 accent-[#16274F]"/><span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center overflow-hidden"><TeamAvatar name={h.team} className="h-[22px] w-[22px]" textClassName="text-[7px]"/></span><span className="text-[9px] font-black text-[#16274F]">{getTeamShortName(h.team)}</span><span className="text-[8px] font-bold text-[#6B7280]">{h.seasons.map(y=>`'${String(y).slice(-2)}`).join(', ')}</span></label> })}
          </div>
        </div>

        <div className="flex-shrink-0 bg-[#F7F8FB] p-2.5">
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2">{[['Apps',stats.apps],['Starts',stats.starts],['Bench',stats.bench],['Avg Pts',stats.avg.toFixed(2)],['Best Pts',stats.best.toFixed(2)],['Seasons',Array.from(stats.seasons).sort((a,b)=>Number(a)-Number(b)).map(y=>`'${String(y).slice(-2)}`).join(', ')||'—']].map(([l,v],i)=><div key={l} className={`border-2 px-2 py-2 ${['border-[#16274F]/25 bg-[#F3F6FC] shadow-[3px_3px_0_#16274F]','border-[#1E8E3E]/30 bg-[#F2F8F3] shadow-[3px_3px_0_#1E8E3E]','border-[#B8860B]/30 bg-[#FBF7EA] shadow-[3px_3px_0_#B8860B]','border-[#5B2CA0]/25 bg-[#F6F1FC] shadow-[3px_3px_0_#5B2CA0]','border-[#D01F2D]/25 bg-[#FDF1F2] shadow-[3px_3px_0_#D01F2D]','border-[#3F4757]/25 bg-[#F3F4F6] shadow-[3px_3px_0_#3F4757]'][i]}`}><div className="text-[7px] font-black uppercase tracking-[0.13em] text-[#6B7280]">{l}</div><div className="mt-0.5 text-xl font-black text-[#16274F]">{v}</div></div>)}</div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-shrink-0 border-b-2 border-[#0A0A0A]/10 bg-[#F7F8FB] p-2.5">
            <div className="grid grid-cols-2 items-stretch gap-3">
              <div className="min-w-0">
                <div className="flex min-h-[78px] min-w-0 flex-col border-2 border-[#16274F]/25 bg-[#F3F6FC] px-3 py-2.5 shadow-[3px_3px_0_#16274F] sm:min-h-[86px] sm:px-4 sm:py-3">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-[clamp(9px,0.58vw,10px)] font-black uppercase tracking-[0.16em] text-[#16274F]">{profile.season} Week {profile.week} Stats</div>
                    {sleeperInfo?.matchupOpponent ? (
                      <div className="flex min-w-0 shrink-0 items-center gap-1.5 text-[clamp(9px,0.58vw,10px)] font-black uppercase tracking-[0.08em] text-[#16274F]/80">
                        <span className="truncate">vs {getNFLTeamShortName(sleeperInfo.matchupOpponent)}</span>
                        <img src={getNFLTeamLogo(sleeperInfo.matchupOpponent)} alt="" style={{ width: 'clamp(18px, 1.5vw, 24px)', height: 'clamp(18px, 1.5vw, 24px)', maxWidth: '24px', maxHeight: '24px', flexShrink: 0, objectFit: 'contain', display: 'block' }} />
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-2.5 flex min-w-0 w-full flex-nowrap items-baseline justify-between gap-[clamp(4px,0.8vw,12px)] overflow-hidden whitespace-nowrap">
                    {statLine.length ? statLine.map((x,i) => {
                      const parts = String(x).match(/^(.+?)\s+(YDS|REC YDS|RUSH YDS|TD|TAR|REC|CAR|INT|FG|XP|TKL|SACK)$/)
                      return (
                        <div key={i} className="flex min-w-0 shrink-0 flex-row items-baseline gap-1 whitespace-nowrap">
                          <strong className="truncate text-[clamp(18px,1.35vw,27px)] font-black leading-none tracking-tight text-[#16274F]">{parts ? parts[1] : x}</strong>
                          {parts && <span className="shrink-0 text-[clamp(7px,0.48vw,9px)] font-black uppercase tracking-[0.07em] text-[#6B7280]">{parts[2]}</span>}
                        </div>
                      )
                    }) : (
                      <span className="text-[clamp(7px,0.7vw,10px)] font-bold text-[#6B7280]">{loadingStats ? 'Loading…' : 'Stats unavailable'}</span>
                    )}
                    {currentGameRow && (
                      <div className="flex min-w-0 shrink items-baseline gap-1 whitespace-nowrap">
                        <strong className="truncate text-[clamp(18px,1.35vw,27px)] font-black leading-none tracking-tight text-[#16274F]">{currentGameRow.appearance.pts.toFixed(2)}</strong>
                        <span className="shrink-0 text-[clamp(7px,0.48vw,9px)] font-black uppercase tracking-[0.07em] text-[#6B7280]">PTS</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex min-h-[78px] min-w-0 flex-col border-2 border-[#5B2CA0]/25 bg-[#F6F1FC] px-3 py-2.5 shadow-[3px_3px_0_#5B2CA0] sm:min-h-[86px] sm:px-4 sm:py-3">
                  <div className="flex min-w-0 items-center justify-between gap-2 text-[clamp(9px,0.58vw,10px)] font-black uppercase tracking-[0.16em] text-[#5B2CA0]">
                    <span className="min-w-0 truncate">HISTORIC</span>
                    <div className="flex min-w-0 shrink-0 items-center gap-1.5">
                      <span className="truncate">VS {getTeamShortName(profile.opponent)}</span>
                      <div style={{ width: 'clamp(18px, 1.5vw, 24px)', height: 'clamp(18px, 1.5vw, 24px)', maxWidth: '24px', maxHeight: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <TeamAvatar name={profile.opponent} className="h-full w-full" textClassName="text-[6px]" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex min-w-0 w-full flex-nowrap items-baseline justify-between gap-[clamp(7px,0.9vw,16px)] overflow-hidden whitespace-nowrap">
                    <div className="flex min-w-0 shrink-0 flex-row items-baseline gap-1 whitespace-nowrap">
                      <strong className="truncate text-[clamp(19px,1.45vw,28px)] font-black leading-none tracking-tight text-[#5B2CA0]">{versus.avg.toFixed(2)}</strong>
                      <span className="shrink-0 text-[clamp(7px,0.52vw,9px)] font-black uppercase tracking-[0.08em] text-[#6B7280]">AVG</span>
                    </div>
                    <span className="text-[clamp(9px,1vw,16px)] font-black text-[#5B2CA0]/35">·</span>
                    <div className="flex min-w-0 shrink-0 flex-row items-baseline gap-1 whitespace-nowrap">
                      <strong className="truncate text-[clamp(19px,1.45vw,28px)] font-black leading-none tracking-tight text-[#16274F]">{versus.best.toFixed(2)}</strong>
                      <span className="shrink-0 text-[clamp(7px,0.52vw,9px)] font-black uppercase tracking-[0.08em] text-[#6B7280]">BEST</span>
                    </div>
                    <span className="text-[clamp(9px,1vw,16px)] font-black text-[#5B2CA0]/35">·</span>
                    <div className="flex min-w-0 shrink-0 flex-row items-baseline gap-1 whitespace-nowrap">
                      <strong className="truncate text-[clamp(19px,1.45vw,28px)] font-black leading-none tracking-tight text-[#16274F]">{versus.games}</strong>
                      <span className="shrink-0 text-[clamp(7px,0.52vw,9px)] font-black uppercase tracking-[0.08em] text-[#6B7280]">GAMES</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[900px] table-fixed">
              <thead className="sticky top-0 z-20 bg-[#F7F6F2]">
                <tr className="border-b-2 border-[#0A0A0A]/10">
                  <th className="w-[9%] px-2 py-2.5 text-left text-[8px] font-black uppercase tracking-[0.16em] text-[#6B7280]"><button onClick={() => toggleSort('season')} className="hover:text-[#D01F2D]">Season <span className="text-[#D01F2D]">{logSort.key === 'season' ? sortDirLabel : '↕'}</span></button></th>
                  <th className="w-[7%] px-2 py-2.5 text-left text-[8px] font-black uppercase tracking-[0.16em] text-[#6B7280]"><button onClick={() => toggleSort('week')} className="hover:text-[#D01F2D]">Week <span className="text-[#D01F2D]">{logSort.key === 'week' ? sortDirLabel : '↕'}</span></button></th>
                  <th className="w-[13%] px-2 py-2.5 text-left text-[8px] font-black uppercase tracking-[0.16em] text-[#6B7280]">Team</th>
                  <th className="w-[18%] px-2 py-2.5 text-left text-[8px] font-black uppercase tracking-[0.16em] text-[#6B7280]"><HeaderFilter label="Opponent" value={logOpponentFilter} options={logOpponentOptions} onChange={setLogOpponentFilter} /></th>
                  <th className="w-[13%] px-2 py-2.5 text-left text-[8px] font-black uppercase tracking-[0.16em] text-[#6B7280]"><HeaderFilter label="Status" value={logStatusFilter} options={logStatusOptions} onChange={setLogStatusFilter} /></th>
                  <th className="w-[11%] px-2 py-2.5 text-right text-[8px] font-black uppercase tracking-[0.16em] text-[#6B7280]"><button onClick={() => toggleSort('pts')} className="hover:text-[#D01F2D]">Player Pts <span className="text-[#D01F2D]">{logSort.key === 'pts' ? sortDirLabel : '↕'}</span></button></th>
                  <th className="w-[11%] px-2 py-2.5 text-right text-[8px] font-black uppercase tracking-[0.16em] text-[#6B7280]">Team PF</th>
                  <th className="w-[9%] px-2 py-2.5 text-left text-[8px] font-black uppercase tracking-[0.16em] text-[#6B7280]"><HeaderFilter label="Result" value={logResultFilter} options={logResultOptions} onChange={setLogResultFilter} /></th>
                  <th className="w-[9%] px-2 py-2.5 text-left text-[8px] font-black uppercase tracking-[0.16em] text-[#6B7280]"><HeaderFilter label="Stage" value={logStageFilter} options={logStageOptions} onChange={setLogStageFilter} /></th>
                </tr>
              </thead>
              <tbody>
                    {sortedGames.map((x,i) => (
                      <tr key={i} className={`border-b border-[#0A0A0A]/8 ${x.isCurrentGame ? 'bg-[#FFF3F4]' : 'bg-white'}`}>
                        <td className="px-2 py-2.5 text-[10px] font-black text-[#16274F]">{x.season}</td>
                        <td className="px-2 py-2.5 text-[10px] font-bold text-[#3F4757]">{x.week}</td>
                        <td className="px-2 py-2.5 text-[10px] font-black text-[#16274F]">{getTeamShortName(x.team)}</td>
                        <td className="px-2 py-2.5 text-[10px] font-black text-[#16274F]">{getTeamShortName(x.opponent)}</td>
                        <td className="px-2 py-2.5"><span className={`inline-block border px-2 py-1 text-[8px] font-black uppercase tracking-wide ${x.appearance.status === 'Starter' ? 'border-[#1E8E3E] bg-[#F4FAF5] text-[#1E8E3E]' : 'border-[#0A0A0A]/20 bg-[#F7F6F2] text-[#6B7280]'}`}>{x.appearance.status}</span></td>
                        <td className="px-3 py-2.5 text-right text-[11px] font-black text-[#16274F]">{x.appearance.pts.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-[10px] font-bold text-[#3F4757]">{parseNumber(x.g?.PF).toFixed(2)}</td>
                        <td className={`px-2 py-2.5 text-[10px] font-black ${x.result === 'W' ? 'text-[#1E8E3E]' : x.result === 'L' ? 'text-[#D01F2D]' : 'text-[#6B7280]'}`}>{x.result || '—'}</td>
                        <td className="px-2 py-2.5 text-[9px] font-bold text-[#6B7280]">{x.g?.GameStage || '—'}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function MatchupsPageContent() {
  const [games, setGames] = useState([])
  const [playerLookup, setPlayerLookup] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState('')
  const [week, setWeek] = useState('')
  const [selected, setSelected] = useState(null)
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState(null)

  const seasonsRef = useRef(null)
  const weeksRef = useRef(null)
  const activeSeasonRef = useRef(null)
  const activeWeekRef = useRef(null)
  const activeGameRef = useRef(null)
  const matchupsFrameRef = useRef(null)
  const [matchupsCanCenter, setMatchupsCanCenter] = useState(false)
  const searchParams = useSearchParams()

  const router = useRouter()
  const searchParamsAppliedRef = useRef(false)


  // Efeito para rolar até a Semana Ativa
  useEffect(() => {
    if (week && activeWeekRef.current) {
      const timer = setTimeout(() => {
        activeWeekRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [week]); // Roda sempre que a semana mudar

  // Deixe este efeito SEPARADO do seu useEffect de load
  useEffect(() => {
    if (season && activeSeasonRef.current) {
      const timer = setTimeout(() => {
        activeSeasonRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [season]);

  useEffect(() => {
    async function load() {
      const [data, cacheRows] = await Promise.all([
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        safeFetch(`${BASE_URL}/_PLAYER_CACHE`),
      ])
      setGames(data)
      setPlayerLookup(buildPlayerLookup(cacheRows))

      // Only consider seasons that have at least one played game
      const allSeasons = [...new Set(
        data
          .filter(g => parseNumber(g?.PF || g?.Score || 0) > 0)
          .map(g => String(g?.Season || '').trim()).filter(Boolean)
      )].sort((a, b) => Number(a) - Number(b))

      if (allSeasons.length > 0) {
        const latestSeason = allSeasons[allSeasons.length - 1]
        setSeason(latestSeason)

        // Default to last week that actually has played games
        const lastPlayed = findLastPlayedWeek(data, latestSeason)
        if (lastPlayed) {
          setWeek(lastPlayed)
          const g = firstGameOfWeek(data, latestSeason, lastPlayed)
          if (g) setSelected(g)
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!games.length) return
    if (searchParamsAppliedRef.current) return

    const urlSeason = String(searchParams.get('season') || '').trim()
    const urlWeek = String(searchParams.get('week') || '').trim()
    const urlTeam = String(searchParams.get('team') || '').trim()
    const urlOpp = String(searchParams.get('opp') || '').trim()

    if (!urlSeason || !urlWeek) {
      searchParamsAppliedRef.current = true
      return
    }

    const hasSeason = games.some(
      (g) => String(g?.Season || '').trim() === urlSeason
    )

    if (!hasSeason) {
      searchParamsAppliedRef.current = true
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/matchups')
      }
      return
    }

    setSeason(urlSeason)
    setWeek(urlWeek)

    let targetGame = null

    if (urlTeam && urlOpp) {
      targetGame =
        games.find((g) => {
          return (
            String(g?.Season || '').trim() === urlSeason &&
            String(g?.Week || '').trim() === urlWeek &&
            String(g?.Team || '').trim() === urlTeam &&
            String(g?.Opponent || '').trim() === urlOpp
          )
        }) ||
        games.find((g) => {
          return (
            String(g?.Season || '').trim() === urlSeason &&
            String(g?.Week || '').trim() === urlWeek &&
            String(g?.Team || '').trim() === urlOpp &&
            String(g?.Opponent || '').trim() === urlTeam
          )
        })
    }

    if (!targetGame) {
      targetGame = firstGameOfWeek(games, urlSeason, urlWeek)
    }

    setSelected(targetGame || null)
    searchParamsAppliedRef.current = true

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/matchups')
    }
  }, [games, searchParams])


  const seasons = useMemo(() => {
    return [...new Set(games.map(g => String(g?.Season || '').trim()).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b))
  }, [games])

  const weeks = useMemo(() => {
    if (!season) return []
    const raw = [...new Set(
      games
        .filter(g => String(g?.Season || '').trim() === season)
        .map(g => String(g?.Week || '').trim())
        .filter(w => w !== '' && w !== '0')
    )]
    // Ordena: números simples primeiro, depois os compostos (14-15)
    return raw.sort((a, b) => {
      const numA = parseFloat(a)
      const numB = parseFloat(b)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      if (!isNaN(numA)) return -1
      if (!isNaN(numB)) return 1
      return a.localeCompare(b)
    })
  }, [games, season])

  // Matchups da semana selecionada — deduplicados (pega só um lado de cada confronto)
  const matchups = useMemo(() => {
    if (!season || !week) return []
    const filtered = games.filter(g =>
      String(g?.Season || '').trim() === season &&
      String(g?.Week || '').trim() === week
    )
    // Deduplicar: pega só os jogos onde Result === 'W' ou só um lado
    const seen = new Set()
    const result = []
    filtered.forEach(g => {
      const team = String(g?.Team || '').trim()
      const opp = String(g?.Opponent || '').trim()
      const key = [team, opp].sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        result.push(g)
      }
    })
    return result
  }, [games, season, week])

  // Mede o espaço real do frame: centraliza apenas quando todos os jogos cabem.
  useEffect(() => {
    const frame = matchupsFrameRef.current
    if (!frame) return

    const updateCentering = () => {
      setMatchupsCanCenter(frame.scrollWidth <= frame.clientWidth + 1)
    }

    updateCentering()
    const observer = new ResizeObserver(updateCentering)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [matchups.length, season, week])

  // Mantém o confronto selecionado em destaque quando os jogos não cabem no frame.
  useEffect(() => {
    if (!selected || matchupsCanCenter || !matchupsFrameRef.current || !activeGameRef.current) return

    const timer = setTimeout(() => {
      activeGameRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }, 120)

    return () => clearTimeout(timer)
  }, [selected, matchupsCanCenter])

  // Jogo do outro lado do confronto selecionado (para pegar os jogadores do oponente)
  const selectedOpponentGame = useMemo(() => {
    if (!selected) return null
    const team = String(selected?.Team || '').trim()
    const opp = String(selected?.Opponent || '').trim()
    return games.find(g =>
      String(g?.Season || '').trim() === season &&
      String(g?.Week || '').trim() === week &&
      String(g?.Team || '').trim() === opp &&
      String(g?.Opponent || '').trim() === team
    ) || null
  }, [selected, games, season, week])

  const handleSeasonClick = (s) => {
    setSeason(s)
    setSelected(null)
    const lastPlayed = findLastPlayedWeek(games, s)
    const targetWeek = lastPlayed || ''
    setWeek(targetWeek)
    if (targetWeek) {
      const g = firstGameOfWeek(games, s, targetWeek)
      if (g) setSelected(g)
    }
  }

  const handleWeekClick = (w) => {
    setWeek(String(w))
    setSelected(null)
    // Seleciona o primeiro matchup da semana automaticamente
    const seen = new Set()
    for (const g of games) {
      if (
        String(g?.Season || '').trim() === season &&
        String(g?.Week || '').trim() === String(w)
      ) {
        const team = String(g?.Team || '').trim()
        const opp = String(g?.Opponent || '').trim()
        const key = [team, opp].sort().join('|')
        if (!seen.has(key)) {
          setSelected(g)
          break
        }
      }
    }
  }

  useEffect(() => {
    if (!games.length) return

    const urlSeason = String(searchParams.get('season') || '').trim()
    const urlWeek = String(searchParams.get('week') || '').trim()
    const urlTeam = String(searchParams.get('team') || '').trim()
    const urlOpp = String(searchParams.get('opp') || '').trim()

    if (!urlSeason || !urlWeek) return

    const hasSeason = games.some((g) => String(g?.Season || '').trim() === urlSeason)
    if (hasSeason && season !== urlSeason) {
      setSeason(urlSeason)
    }

    if (week !== urlWeek) {
      setWeek(urlWeek)
    }

    if (!urlTeam || !urlOpp) return

    const targetGame = games.find((g) => {
      return (
        String(g?.Season || '').trim() === urlSeason &&
        String(g?.Week || '').trim() === urlWeek &&
        String(g?.Team || '').trim() === urlTeam &&
        String(g?.Opponent || '').trim() === urlOpp
      )
    })

    if (targetGame) {
      setSelected(targetGame)
      return
    }

    const reverseGame = games.find((g) => {
      return (
        String(g?.Season || '').trim() === urlSeason &&
        String(g?.Week || '').trim() === urlWeek &&
        String(g?.Team || '').trim() === urlOpp &&
        String(g?.Opponent || '').trim() === urlTeam
      )
    })

    if (reverseGame) {
      setSelected(reverseGame)
    }
  }, [games, searchParams, season, week])

  const teamPF = selected ? parseNumber(selected?.PF) : 0
  const teamPA = selected ? parseNumber(selected?.PA) : 0
  const teamWon = selected ? String(selected?.Result || '').trim().toUpperCase() === 'W' : false

  const starters = selected ? extractPlayers(selected, 'S') : []
  const bench = selected ? extractPlayers(selected, 'B') : []
  const oppStarters = selected ? extractPlayers(selected, 'OS') : []
  const oppBench = selected ? extractPlayers(selected, 'OB') : []

  const openPlayerProfile = (player, pos, teamSide) => {
    if (!player?.name || !selected) return
    const team = teamSide === 'away' ? String(selected?.Opponent || '').trim() : String(selected?.Team || '').trim()
    const opponent = teamSide === 'away' ? String(selected?.Team || '').trim() : String(selected?.Opponent || '').trim()
    setSelectedPlayerProfile({
      rawName: String(player.name).trim(),
      displayName: getDisplayPlayerName(player.name, pos, playerLookup),
      position: getDisplayPlayerPos(player.name, pos, playerLookup),
      pts: player.pts,
      status: teamSide === 'away' ? 'Starter' : 'Starter',
      team,
      opponent,
      season: String(selected?.Season || '').trim(),
      week: String(selected?.Week || '').trim(),
      gameStage: String(selected?.GameStage || '').trim(),
    })
  }

  const recap = selected
    ? String(selected?.['Recap da Partida'] || '').trim()
    : ''

  // Anos sem dados de jogadores (ex: 2015/2016) — mostra apenas o recap
  const hasPlayerData = starters.length > 0 || oppStarters.length > 0 || bench.length > 0 || oppBench.length > 0

  // Semanas duplas (ex: "14-15") distorcem o total de pontos — destaque histórico só vale em semana simples
  const isSingleWeek = selected ? !/[-–]/.test(String(selected?.Week || '').trim()) : false

  // Um jogador é "histórico" se bateu o threshold E a semana é simples (não dupla)
  const isHistoricPlayer = (player) => isSingleWeek && !!player && player.pts >= HISTORIC_PTS_THRESHOLD

  // 200+ pts em semana simples também é feito histórico — para o time, não para o jogador
  const HISTORIC_TEAM_PTS_THRESHOLD = 200
  const isHistoricTeamScore = (pts) => isSingleWeek && (pts ?? 0) >= HISTORIC_TEAM_PTS_THRESHOLD

  // Conta qual é o Nº jogo de 200+ pts (em semana simples) na história de cada time.
  // Ordena cronologicamente por Season + Week e localiza a posição do jogo atual na lista.
  const team200Ordinal = useMemo(() => {
    if (!selected) return { team: null, opp: null }

    const sortKey = (g) => {
      const s = parseNumber(g?.Season)
      const w = parseFloat(String(g?.Week || '0').split(/[-–]/)[0]) || 0
      return s * 100 + w
    }

    const buildOrdinalMap = (teamName) => {
      const teamGames = games
        .filter(g =>
          String(g?.Team || '').trim() === teamName &&
          !/[-–]/.test(String(g?.Week || '').trim()) &&
          parseNumber(g?.PF) >= HISTORIC_TEAM_PTS_THRESHOLD
        )
        .sort((a, b) => sortKey(a) - sortKey(b))
      return teamGames
    }

    const findOrdinal = (teamName, currentGame) => {
      const list = buildOrdinalMap(teamName)
      const idx = list.findIndex(g =>
        String(g?.Season || '').trim() === String(currentGame?.Season || '').trim() &&
        String(g?.Week || '').trim() === String(currentGame?.Week || '').trim() &&
        String(g?.Team || '').trim() === String(currentGame?.Team || '').trim() &&
        String(g?.Opponent || '').trim() === String(currentGame?.Opponent || '').trim()
      )
      return idx === -1 ? null : idx + 1
    }

    const teamName = String(selected?.Team || '').trim()
    const oppName = String(selected?.Opponent || '').trim()

    const oppGame = games.find(g =>
      String(g?.Season || '').trim() === String(selected?.Season || '').trim() &&
      String(g?.Week || '').trim() === String(selected?.Week || '').trim() &&
      String(g?.Team || '').trim() === oppName &&
      String(g?.Opponent || '').trim() === teamName
    )

    return {
      team: isHistoricTeamScore(teamPF) ? findOrdinal(teamName, selected) : null,
      opp: (oppGame && isHistoricTeamScore(parseNumber(oppGame?.PF))) ? findOrdinal(oppName, oppGame) : null,
    }
  }, [selected, games])

  // Sufixo ordinal em português: 1º, 2º, 3º...
  const ordinalLabel = (n) => `${n}º`

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .tp-shadow-navy { box-shadow: 6px 6px 0 0 #16274F; }
        .tp-shadow-navy-sm { box-shadow: 4px 4px 0 0 #16274F; }
        .tp-shadow-red { box-shadow: 6px 6px 0 0 #D01F2D; }
        .tp-shadow-red-sm { box-shadow: 4px 4px 0 0 #D01F2D; }
        .tp-shadow-black { box-shadow: 5px 5px 0 0 #0A0A0A; }
        .tp-stack-title { color: #D01F2D; text-shadow: 4px 4px 0 #0A0A0A; }
      `}</style>

      {/* Header */}
      <Header />

      <section className="px-3 md:px-6 mx-auto pb-20">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden border-2 border-[#0A0A0A] tp-shadow-navy">

          {/* Background */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">

            <svg
              className="absolute inset-y-0 left-1/2 -translate-x-[60%] h-full w-[140%] max-w-none"
              preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 900 340"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >

              {/* Listras diagonais */}
              <g opacity="0.06">
                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                  <rect
                    key={i}
                    x={x}
                    y="-80"
                    width={i % 2 === 0 ? 55 : 22}
                    height="520"
                    fill="#16274F"
                    transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 170)`}
                  />
                ))}
              </g>

              {/* Losangos */}
              <g opacity="0.10" fill="none" stroke="#16274F" strokeWidth="1">
                {[
                  "M380 -30 L460 85 L380 200 L300 85 Z",
                  "M460 85 L540 200 L460 315 L380 200 Z",
                  "M540 -30 L620 85 L540 200 L460 85 Z",
                  "M620 85 L700 200 L620 315 L540 200 Z",
                  "M700 -30 L780 85 L700 200 L620 85 Z",
                  "M780 85 L860 200 L780 315 L700 200 Z",
                ].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              {/* Losangos preenchidos */}
              <g opacity="0.05" fill="#D01F2D">
                {[
                  "M420 30 L440 58 L420 86 L400 58 Z",
                  "M500 120 L520 148 L500 176 L480 148 Z",
                  "M580 30 L600 58 L580 86 L560 58 Z",
                  "M660 120 L680 148 L660 176 L640 148 Z",
                  "M740 30 L760 58 L740 86 L720 58 Z",
                ].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              {/* Chevrons */}
              <g
                opacity="0.08"
                fill="none"
                stroke="#16274F"
                strokeWidth="2"
                strokeLinejoin="round"
              >
                {[520, 600, 680].map((x, i) => (
                  <polyline
                    key={i}
                    points={`${x},0 ${x + 160},170 ${x},340`}
                  />
                ))}
              </g>

              {/* Triângulos */}
              <g opacity="0.08" fill="#16274F">
                <polygon points="900,0 900,140 760,0" />
                <polygon points="900,340 900,200 760,340" />
              </g>

              {/* Círculos */}
              <g opacity="0.08" fill="none" stroke="#16274F" strokeWidth="1">
                {[30, 50, 70].map((r) => (
                  <circle key={r} cx="870" cy="60" r={r} />
                ))}
              </g>

              {/* Grid pontos */}
              <g opacity="0.10" fill="#16274F">
                {[40, 60, 80, 100].map((y) =>
                  [310, 330, 350].map((x) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />
                  ))
                )}
              </g>

              {/* Linhas */}
              <g opacity="0.10" stroke="#16274F" strokeWidth="0.5">
                {[56, 113, 226, 284].map((y) => (
                  <line key={y} x1="0" y1={y} x2="900" y2={y} />
                ))}
              </g>

              {/* Número fantasma */}
              <text
                x="820"
                y="310"
                fontFamily="'Bebas Neue', sans-serif"
                fontSize="340"
                fill="#16274F"
                opacity="0.04"
                textAnchor="middle"
              >
                12
              </text>
            </svg>

            {/* Overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(105deg, #F7F6F2 28%, rgba(247,246,242,0.90) 48%, rgba(247,246,242,0.25) 100%)',
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 p-6 sm:p-8 md:p-10">

            {/* Bloco "Game by Game" Responsivo */}
            <div
              className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 bg-[#D01F2D] px-3 py-1.5 sm:px-4 sm:py-2"
              style={{ clipPath: 'polygon(0 0, 100% 0, 96% 100%, 0% 100%)' }}
            >
              <Swords className="h-3 w-3 sm:h-4 sm:w-4 text-white shrink-0" />
              <span
                className="font-black uppercase tracking-[0.25em] text-white whitespace-nowrap"
                style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
              >
                Game by Game
              </span>
            </div>

            {/* Título Principal */}
            <h1
              className="leading-[0.9] tracking-[-0.02em] text-[#16274F]"
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 'clamp(48px, 7vw, 96px)',
              }}
            >
              Match
              <span className="tp-stack-title">ups</span>
            </h1>

            {/* Subtítulo */}
            <p
              className="mt-3 sm:mt-4 max-w-xs sm:max-w-lg text-[#3F4757]"
              style={{ fontSize: 'clamp(14px, 1.5vw, 16px)' }}
            >
              Every game. Every score. Every moment.
            </p>

          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#6B7280] font-bold">Loading...</div>
        ) : (
          <>
            {/* Seletor de temporada */}
            <div className="mb-6 overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
              <div className="border-b-2 border-[#0A0A0A]/10 px-6 py-4">
                <div
                  className="font-black uppercase tracking-[0.3em] text-[#16274F]"
                  style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                >
                  Season
                </div>
              </div>

              {/* Container com o scroll horizontal ajustado */}
              <div
                ref={seasonsRef}
                className="scroll-hide flex justify-start md:justify-center gap-2 overflow-x-auto px-6 py-4"
              >
                {seasons.map(s => {
                  const isActive = season === s;
                  return (
                    <button
                      key={s}
                      // ESSA LINHA É CRUCIAL: Ela liga o botão ativo à referência do JS
                      ref={isActive ? activeSeasonRef : null}
                      onClick={() => handleSeasonClick(s)}
                      className={`flex-shrink-0 border-2 px-5 py-2.5 text-sm font-black transition-all ${isActive
                        ? 'border-[#0A0A0A] bg-[#D01F2D] text-white'
                        : 'border-[#0A0A0A] bg-white text-[#3F4757] hover:bg-[#F7F6F2]'
                        }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seletor de semana */}
            {season && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 50,
                  filter: 'blur(10px)',
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                }}
                viewport={{
                  once: true,
                  amount: 0.15,
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }} className="mb-6 overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
                <div className="border-b-2 border-[#0A0A0A]/10 px-6 py-4">
                  <div
                    className="font-black uppercase tracking-[0.3em] text-[#16274F]"
                    style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                  >
                    Week
                  </div>
                </div>

                {/* Mudado de justify-center para justify-start md:justify-center */}
                <div ref={weeksRef} className="scroll-hide flex justify-start md:justify-center gap-2 overflow-x-auto px-6 py-4">
                  {weeks.map(w => {
                    const isActive = week === String(w);
                    return (
                      <button
                        key={w}
                        // LIGAÇÃO DA REF: Identifica qual semana está ativa
                        ref={isActive ? activeWeekRef : null}
                        onClick={() => handleWeekClick(w)}
                        className={`flex-shrink-0 h-11 w-11 border-2 text-sm font-black transition-all ${isActive
                          ? 'border-[#0A0A0A] bg-[#D01F2D] text-white'
                          : 'border-[#0A0A0A] bg-white text-[#3F4757] hover:bg-[#F7F6F2]'
                          }`}
                      >
                        {w}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Cards de matchups */}
            {week && matchups.length > 0 && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 50,
                  filter: 'blur(10px)',
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                }}
                viewport={{
                  once: true,
                  amount: 0.15,
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }} className="mb-8 overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
                <div className="border-b-2 border-[#0A0A0A]/10 px-6 py-4">
                  <div
                    className="font-black uppercase tracking-[0.3em] text-[#16274F]"
                    style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                  >
                    {season} — Week {week}
                  </div>
                </div>

                {/* Centraliza quando cabe tudo na tela (poucos jogos); começa do início quando precisa rolar */}
                <div
                  ref={matchupsFrameRef}
                  className={`scroll-hide flex gap-4 overflow-x-auto p-6 ${matchupsCanCenter ? 'justify-center' : 'justify-start'}`}
                >
                  {matchups.map((g, i) => {
                    const pf = parseNumber(g?.PF)
                    const pa = parseNumber(g?.PA)
                    const won = String(g?.Result || '').trim().toUpperCase() === 'W'
                    const isSelected = selected === g
                    const team = String(g?.Team || '').trim()
                    const opp = String(g?.Opponent || '').trim()
                    const stage = String(g?.GameStage || g?.GameType || '').trim()

                    return (
                      <button
                        key={i}
                        // LIGAÇÃO DA REF: Identifica qual card de confronto está ativo
                        ref={isSelected ? activeGameRef : null}
                        onClick={() => setSelected(isSelected ? null : g)}
                        className={`flex-shrink-0 w-56 border-2 p-4 text-left transition-all ${isSelected
                          ? 'border-[#D01F2D] bg-[#FDEDEE] tp-shadow-red-sm'
                          : 'border-[#0A0A0A] bg-white hover:bg-[#F7F6F2]'
                          }`}
                      >
                        {/* Stage badge */}
                        {(() => {
                          const gameType = String(g?.GameType || '').trim()
                          if (!gameType || gameType === 'Reg Season') return null
                          return (
                            <div className="mb-2 inline-block border-2 border-[#0A0A0A] bg-[#16274F] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                              {gameType}
                            </div>
                          )
                        })()}

                        {/* Time A */}
                        <div className="flex items-center justify-between mb-1">
                          <a
                            href={`/teams?team=${encodeURIComponent(team)}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 min-w-0 group"
                          >
                            <TeamAvatar name={team} className="h-5 w-5 rounded-lg flex-shrink-0" textClassName="text-[8px]" />
                            <span className={`text-sm font-black truncate max-w-[100px] group-hover:text-[#D01F2D] transition-colors ${won ? 'text-[#16274F]' : 'text-[#6B7280]'}`}>
                              {team}
                            </span>
                          </a>
                          <span className={`text-lg font-black ml-2 flex-shrink-0 ${won ? 'text-[#D01F2D]' : 'text-[#6B7280]'}`}>
                            {pf > 0 ? pf.toFixed(2) : '—'}
                          </span>
                        </div>

                        <div className="my-1 h-px bg-[#0A0A0A]/8" />

                        {/* Time B */}
                        <div className="flex items-center justify-between mt-1">
                          <a
                            href={`/teams?team=${encodeURIComponent(opp)}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 min-w-0 group"
                          >
                            <TeamAvatar name={opp} className="h-5 w-5 rounded-lg flex-shrink-0" textClassName="text-[8px]" />
                            <span className={`text-sm font-black truncate max-w-[100px] group-hover:text-[#D01F2D] transition-colors ${!won ? 'text-[#16274F]' : 'text-[#6B7280]'}`}>
                              {opp}
                            </span>
                          </a>
                          <span className={`text-lg font-black ml-2 flex-shrink-0 ${!won ? 'text-[#D01F2D]' : 'text-[#6B7280]'}`}>
                            {pa > 0 ? pa.toFixed(2) : '—'}
                          </span>
                        </div>

                        {/* Margem */}
                        <div className="mt-3 text-[10px] font-bold text-[#6B7280]">
                          Margin: {Math.abs(pf - pa).toFixed(2)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Detalhe do matchup selecionado */}
            {selected && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 50,
                  filter: 'blur(10px)',
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                }}
                viewport={{
                  once: false,
                  amount: 0.05,
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy">

                {/* Header do confronto */}
                {(() => {
                  // Calcula record até aquela semana para cada time
                  const calcRecord = (teamName) => {
                    const teamGames = games.filter(g => {
                      const s = String(g?.Season || '').trim()
                      const w = parseFloat(String(g?.Week || '0'))
                      const currentW = parseFloat(String(week || '0'))
                      const t = String(g?.Team || '').trim()
                      return s === season && w <= currentW && t === teamName
                    })
                    const w = teamGames.filter(g => String(g?.Result || '').trim().toUpperCase() === 'W').length
                    const l = teamGames.filter(g => String(g?.Result || '').trim().toUpperCase() === 'L').length
                    return { w, l }
                  }

                  const teamName = String(selected?.Team || '').trim()
                  const oppName = String(selected?.Opponent || '').trim()
                  const teamRecord = calcRecord(teamName)
                  const oppRecord = calcRecord(oppName)
                  const teamStreak = String(selected?.Streak_Total || '').trim()

                  // Streak do oponente — busca o jogo oposto
                  const oppGame = games.find(g =>
                    String(g?.Season || '').trim() === season &&
                    String(g?.Week || '').trim() === week &&
                    String(g?.Team || '').trim() === oppName &&
                    String(g?.Opponent || '').trim() === teamName
                  )
                  const oppStreak = String(oppGame?.Streak_Total || '').trim()

                  const gameType = String(selected?.GameType || '').trim()

                  return (
                    <div className="border-b-2 border-[#0A0A0A]/10 px-6 py-8">

                      {/* Badge do tipo de jogo */}
                      <div className="flex justify-center mb-6">
                        <div className="inline-flex items-center gap-2 border-2 border-[#0A0A0A] bg-[#16274F] px-4 py-1.5">
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
                            {season} · Week {week}{gameType && gameType !== 'Reg Season' ? ` · ${gameType}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Confronto principal */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">

                        {/* Time A */}
                        <div className="flex flex-col items-center gap-2">
                          <TeamAvatar name={teamName} className="h-14 w-14 rounded-2xl" textClassName="text-lg" />
                          <a href={`/teams?team=${encodeURIComponent(teamName)}`}
                            className={`text-center font-black leading-tight hover:text-[#D01F2D] transition-colors ${teamWon ? 'text-[#16274F]' : 'text-[#6B7280]'}`}
                            style={{ fontSize: 'clamp(14px, 2.5vw, 22px)' }}>
                            {teamName}
                          </a>
                          <div className={`font-black leading-none ${teamWon ? 'text-[#D01F2D]' : 'text-[#6B7280]'} ${
                            isHistoricTeamScore(teamPF) ? 'text-[#B8860B]' : ''
                            }`}
                            style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(42px, 7vw, 80px)' }}>
                            {teamPF.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-black text-[#6B7280]">
                              {teamRecord.w}–{teamRecord.l}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 border-2 ${teamStreak.startsWith('W')
                              ? 'text-white border-[#0A0A0A] bg-[#1E8E3E]'
                              : 'text-white border-[#0A0A0A] bg-[#D01F2D]'
                              }`}>
                              {teamStreak}
                            </span>
                          </div>
                          {isHistoricTeamScore(teamPF) && (
                            <div className="flex items-center gap-1 border-2 border-[#0A0A0A] bg-[#F5C518] px-2 py-0.5">
                              <span className="text-xs">🚀</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#0A0A0A]">
                                {team200Ordinal.team ? `${ordinalLabel(team200Ordinal.team)} 200+` : '200+'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* VS central */}
                        <div className="flex flex-col items-center gap-1 self-center">
                          <div className="text-[#6B7280] font-black text-lg">VS</div>
                          <div className="text-[10px] font-bold text-[#6B7280]">
                            {Math.abs(teamPF - teamPA).toFixed(2)}
                          </div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-[#6B7280]">margin</div>
                          {teamWon ? (
                            <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-[#D01F2D]">← WIN</div>
                          ) : (
                            <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-[#D01F2D]">WIN →</div>
                          )}
                        </div>

                        {/* Time B */}
                        <div className="flex flex-col items-center gap-2">
                          <TeamAvatar name={oppName} className="h-14 w-14 rounded-2xl" textClassName="text-lg" />
                          <a href={`/teams?team=${encodeURIComponent(oppName)}`}
                            className={`text-center font-black leading-tight hover:text-[#D01F2D] transition-colors ${!teamWon ? 'text-[#16274F]' : 'text-[#6B7280]'}`}
                            style={{ fontSize: 'clamp(14px, 2.5vw, 22px)' }}>
                            {oppName}
                          </a>
                          <div className={`font-black leading-none ${!teamWon ? 'text-[#D01F2D]' : 'text-[#6B7280]'} ${
                            isHistoricTeamScore(teamPA) ? 'text-[#B8860B]' : ''
                            }`}
                            style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(42px, 7vw, 80px)' }}>
                            {teamPA.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-black text-[#6B7280]">
                              {oppRecord.w}–{oppRecord.l}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 border-2 ${oppStreak.startsWith('W')
                              ? 'text-white border-[#0A0A0A] bg-[#1E8E3E]'
                              : 'text-white border-[#0A0A0A] bg-[#D01F2D]'
                              }`}>
                              {oppStreak}
                            </span>
                          </div>
                          {isHistoricTeamScore(teamPA) && (
                            <div className="flex items-center gap-1 border-2 border-[#0A0A0A] bg-[#F5C518] px-2 py-0.5">
                              <span className="text-xs">🚀</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#0A0A0A]">
                                {team200Ordinal.opp ? `${ordinalLabel(team200Ordinal.opp)} 200+` : '200+'}
                              </span>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )
                })()}

                {/* Starters */}
                {/* Ajustado: px-3 no mobile para economizar espaço nas bordas, px-8 no desktop */}
                {hasPlayerData && (
                <div className="px-3 md:px-8 py-6 border-b-2 border-[#0A0A0A]/10">
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-[#16274F] mb-4">Starters</div>

                  {/* Header colunas */}
                  <div className="grid grid-cols-[1fr_1px_1fr] gap-1 md:gap-2 mb-3">
                    <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-[#6B7280] pb-2 border-b-2 border-[#0A0A0A]/10 truncate">
                      {String(selected?.Team || '').trim()}
                    </div>
                    <div className="border-b-2 border-[#0A0A0A]/10" />
                    <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-[#6B7280] pb-2 border-b-2 border-[#0A0A0A]/10 text-right truncate">
                      {String(selected?.Opponent || '').trim()}
                    </div>
                  </div>

                  {/* Jogadores */}
                  {(() => {
                    const positions = getRosterPositions(season)
                    const rows = Math.max(starters.length, oppStarters.length, positions.length)
                    return Array.from({ length: rows }).map((_, i) => {
                      const home = starters[i]
                      const away = oppStarters[i]
                      const pos = positions[i] || ''
                      return (
                        <React.Fragment key={i}>
                          <div className="grid grid-cols-[1fr_1px_1fr] gap-1 md:gap-2 mb-2 items-center">

                            {/* Time A — Nome → Pts */}
                            <div onClick={() => home && openPlayerProfile(home, pos, 'home')} role={home ? 'button' : undefined} tabIndex={home ? 0 : undefined} className={`px-2 md:px-3 py-2 min-w-0 cursor-pointer ${
                              home
                                ? (isHistoricPlayer(home)
                                  ? 'bg-[#FFF9E5] border-2 border-[#F5C518]'
                                  : 'bg-white border-2 border-[#0A0A0A]/10')
                                : 'opacity-0'
                              }`}>
                              <div style={{ display: 'grid', gridTemplateRows: 'auto auto', rowGap: 4 }} className="min-w-0">
                                <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                                  <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                    <PlayerRowAvatar name={home?.name} pos={pos} playerLookup={playerLookup} size={42} />
                                  </div>
                                  <span className={`text-[22px] md:text-[28px] font-black flex items-center gap-1 flex-shrink-0 tabular-nums leading-none ${
                                    isHistoricPlayer(home)
                                      ? 'text-[#B8860B]'
                                      : ((home?.pts ?? 0) > 0 ? 'text-[#16274F]' : 'text-[#6B7280]')
                                    }`}>
                                    {isHistoricPlayer(home) && <span className="text-base md:text-lg">🔥</span>}
                                    {home ? home.pts.toFixed(1) : '—'}
                                  </span>
                                </div>
                                <div className="min-w-0 flex items-center justify-between gap-1.5">
                                  <div className={`text-[15px] md:text-base font-black truncate leading-tight min-w-0 block ${
                                    isHistoricPlayer(home) ? 'text-[#8A6600]' : 'text-[#16274F]'
                                    }`}>
                                    {getDisplayPlayerName(home?.name, pos, playerLookup)}
                                  </div>
                                  <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest px-1.5 py-0.5 border-2 ${getPosColor(getDisplayPlayerPos(home?.name, pos, playerLookup))} whitespace-nowrap flex-shrink-0`}>
                                    {getDisplayPlayerPos(home?.name, pos, playerLookup)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Divisória central */}
                            <div className="self-stretch w-px bg-[#0A0A0A]/8" />

                            {/* Time B — Pts → Nome (espelhado) */}
                            <div onClick={() => away && openPlayerProfile(away, pos, 'away')} role={away ? 'button' : undefined} tabIndex={away ? 0 : undefined} className={`px-2 md:px-3 py-2 min-w-0 cursor-pointer ${
                              away
                                ? (isHistoricPlayer(away)
                                  ? 'bg-[#FFF9E5] border-2 border-[#F5C518]'
                                  : 'bg-white border-2 border-[#0A0A0A]/10')
                                : 'opacity-0'
                              }`}>
                              <div style={{ display: 'grid', gridTemplateRows: 'auto auto', rowGap: 4 }} className="min-w-0">
                                <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                                  <span className={`text-[22px] md:text-[28px] font-black flex items-center gap-1 flex-shrink-0 tabular-nums leading-none ${
                                    isHistoricPlayer(away)
                                      ? 'text-[#B8860B]'
                                      : ((away?.pts ?? 0) > 0 ? 'text-[#16274F]' : 'text-[#6B7280]')
                                    }`}>
                                    {away ? away.pts.toFixed(1) : '—'}
                                    {isHistoricPlayer(away) && <span className="text-base md:text-lg">🔥</span>}
                                  </span>
                                  <div className="flex items-center justify-end gap-1.5 min-w-0 overflow-hidden">
                                    <PlayerRowAvatar name={away?.name} pos={pos} playerLookup={playerLookup} size={42} mirror />
                                  </div>
                                </div>
                                <div className="min-w-0 flex items-center justify-between gap-1.5 w-full">
                                  <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest px-1.5 py-0.5 border-2 ${getPosColor(getDisplayPlayerPos(away?.name, pos, playerLookup))} whitespace-nowrap flex-shrink-0`}>
                                    {getDisplayPlayerPos(away?.name, pos, playerLookup)}
                                  </span>
                                  <div className={`text-[15px] md:text-base font-black truncate leading-tight text-right min-w-0 block ${
                                    isHistoricPlayer(away) ? 'text-[#8A6600]' : 'text-[#16274F]'
                                    }`}>
                                    {getDisplayPlayerName(away?.name, pos, playerLookup)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      )
                    })
                  })()}
                </div>
                )}

                {/* Bench */}
                {hasPlayerData && (bench.length > 0 || oppBench.length > 0) && (
                  <div className="px-3 md:px-8 py-6 border-b-2 border-[#0A0A0A]/10">
                    <div className="text-xs font-black uppercase tracking-[0.3em] text-[#6B7280] mb-4">Bench</div>

                    <div className="grid grid-cols-[1fr_1px_1fr] gap-1 md:gap-2 mb-3">
                      <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-[#6B7280] pb-2 border-b-2 border-[#0A0A0A]/10 truncate">
                        {String(selected?.Team || '').trim()}
                      </div>
                      <div className="pb-2 border-b-2 border-[#0A0A0A]/10" />
                      <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-[#6B7280] pb-2 border-b-2 border-[#0A0A0A]/10 text-right truncate">
                        {String(selected?.Opponent || '').trim()}
                      </div>
                    </div>

                    {Array.from({ length: Math.max(bench.length, oppBench.length) }).map((_, i) => {
                      const home = bench[i]
                      const away = oppBench[i]
                      return (
                        <React.Fragment key={i}>
                          <div className="grid grid-cols-[1fr_1px_1fr] gap-1 md:gap-2 mb-2 items-center">

                            <div onClick={() => home && openPlayerProfile(home, getDisplayPlayerPos(home?.name, 'BN', playerLookup), 'home')} role={home ? 'button' : undefined} tabIndex={home ? 0 : undefined} className={`px-2 md:px-3 py-2 min-w-0 cursor-pointer ${
                              home
                                ? (isHistoricPlayer(home)
                                  ? 'bg-[#FFF9E5] border-2 border-[#F5C518]'
                                  : 'bg-[#F7F6F2] border-2 border-[#0A0A0A]/8')
                                : 'opacity-0'
                              }`}>
                              <div style={{ display: 'grid', gridTemplateRows: 'auto auto', rowGap: 4 }} className="min-w-0">
                                <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                                  <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                    <PlayerRowAvatar name={home?.name} pos="BN" playerLookup={playerLookup} size={32} />
                                  </div>
                                  <span className={`text-[18px] md:text-[20px] font-black flex items-center gap-1 flex-shrink-0 tabular-nums leading-none ${
                                    isHistoricPlayer(home)
                                      ? 'text-[#B8860B]'
                                      : ((home?.pts ?? 0) > 0 ? 'text-[#3F4757]' : 'text-[#6B7280]')
                                    }`}>
                                    {isHistoricPlayer(home) && <span className="text-sm md:text-base">🔥</span>}
                                    {home ? home.pts.toFixed(1) : '—'}
                                  </span>
                                </div>
                                <div className="min-w-0 flex items-center justify-between gap-1.5">
                                  <div className={`text-[13px] md:text-sm font-bold truncate leading-tight min-w-0 block ${
                                    isHistoricPlayer(home) ? 'text-[#8A6600]' : 'text-[#3F4757]'
                                    }`}>
                                    {getDisplayPlayerName(home?.name, 'BN', playerLookup)}
                                  </div>
                                  <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 border-2 ${getPosColor(getDisplayPlayerPos(home?.name, 'BN', playerLookup))} whitespace-nowrap flex-shrink-0`}>
                                    {getDisplayPlayerPos(home?.name, 'BN', playerLookup)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Divisória central */}
                            <div className="self-stretch w-px bg-[#0A0A0A]/8" />

                            <div onClick={() => away && openPlayerProfile(away, getDisplayPlayerPos(away?.name, 'BN', playerLookup), 'away')} role={away ? 'button' : undefined} tabIndex={away ? 0 : undefined} className={`px-2 md:px-3 py-2 min-w-0 cursor-pointer ${
                              away
                                ? (isHistoricPlayer(away)
                                  ? 'bg-[#FFF9E5] border-2 border-[#F5C518]'
                                  : 'bg-[#F7F6F2] border-2 border-[#0A0A0A]/8')
                                : 'opacity-0'
                              }`}>
                              <div style={{ display: 'grid', gridTemplateRows: 'auto auto', rowGap: 4 }} className="min-w-0">
                                <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                                  <span className={`text-[18px] md:text-[20px] font-black flex items-center gap-1 flex-shrink-0 tabular-nums leading-none ${
                                    isHistoricPlayer(away)
                                      ? 'text-[#B8860B]'
                                      : ((away?.pts ?? 0) > 0 ? 'text-[#3F4757]' : 'text-[#6B7280]')
                                    }`}>
                                    {away ? away.pts.toFixed(1) : '—'}
                                    {isHistoricPlayer(away) && <span className="text-sm md:text-base">🔥</span>}
                                  </span>
                                  <div className="flex items-center justify-end gap-1.5 min-w-0 overflow-hidden">
                                    <PlayerRowAvatar name={away?.name} pos="BN" playerLookup={playerLookup} size={32} mirror />
                                  </div>
                                </div>
                                <div className="min-w-0 flex items-center justify-between gap-1.5 w-full">
                                  <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 border-2 ${getPosColor(getDisplayPlayerPos(away?.name, 'BN', playerLookup))} whitespace-nowrap flex-shrink-0`}>
                                    {getDisplayPlayerPos(away?.name, 'BN', playerLookup)}
                                  </span>
                                  <div className={`text-[13px] md:text-sm font-bold truncate leading-tight text-right min-w-0 block ${
                                    isHistoricPlayer(away) ? 'text-[#8A6600]' : 'text-[#3F4757]'
                                    }`}>
                                    {getDisplayPlayerName(away?.name, 'BN', playerLookup)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                )}

                {/* Recap */}
                {recap && (
                  <div className="px-8 py-6">
                    <div className="text-xs font-black uppercase tracking-[0.3em] text-[#16274F] mb-4">
                      📝 Game Recap
                    </div>
                    <div className="text-[#3F4757] text-sm leading-relaxed text-justify">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-2xl font-black text-[#16274F] mb-4 mt-6 leading-tight">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-black text-[#16274F] mb-3 mt-5 leading-tight">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-black text-[#16274F] mb-2 mt-4">{children}</h3>,
                          p: ({ children }) => <p className="text-[#3F4757] mb-3 leading-relaxed text-justify">{children}</p>,
                          strong: ({ children }) => <strong className="text-[#16274F] font-black">{children}</strong>,
                          em: ({ children }) => <em className="text-[#D01F2D] not-italic font-bold">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-3 text-[#3F4757] space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 text-[#3F4757] space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-[#3F4757]">{children}</li>,
                          hr: () => <hr className="border-[#0A0A0A]/10 my-4" />,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-[#D01F2D] pl-4 my-3 text-[#3F4757] italic">{children}</blockquote>,
                        }}
                      >
                        {recap}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

              </motion.div>
            )}
          </>
        )}

        {selectedPlayerProfile && (
          <PlayerProfileModal
            profile={selectedPlayerProfile}
            games={games}
            playerLookup={playerLookup}
            onClose={() => setSelectedPlayerProfile(null)}
          />
        )}

      </section>

      {/* Footer */}
      <footer className="w-full border-t-4 border-[#D01F2D] bg-[#16274F]">
        <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-3 px-5 py-6 sm:px-8 lg:px-12">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={24} height={24} style={{ filter: 'invert(1)' }} className="opacity-70" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-white/70">
            Tapitas League · Est. 2014
          </span>
        </div>
      </footer>

    </main>
  )
}

export default function MatchupsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A]">
          <Header />
          <section className="px-3 md:px-6 mx-auto">
            <div className="flex items-center justify-center py-20 text-[#6B7280] font-bold">
              Loading...
            </div>
          </section>
        </main>
      }
    >
      <MatchupsPageContent />
    </Suspense>
  )
}