'use client'

import { Suspense, useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, ChevronDown, Swords, BarChart3, Activity, Send, Radio } from 'lucide-react'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import Header from '../components/Header'
import SharedPlayerProfile from '../components/PlayerProfileModal'
import PlayerCutout from '../components/PlayerCutout'
import { PageShell, PageSkeleton, SiteFooter, getTeamAbbr, PositionBadge as UiPositionBadge } from '../components/ui'
import { getTeamFocus, useTeamFocus } from '../context/TeamFocus'

const BASE_URL = '/api/sheet'

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
    'QB': 'text-white bg-[#D01F2D]',
    'RB': 'text-white bg-[#1E8E3E]',
    'WR': 'text-white bg-[#16274F]',
    'TE': 'text-white bg-[#B8860B]',
    'FLEX': 'text-white bg-[#3F4757]',
    'K': 'text-white bg-[#6B7280]',
    'DEF': 'text-white bg-[#3F4757]',
  }
  return colors[pos] ?? 'text-[#3F4757] border-[#EEF0F2] bg-[#F4F5F7]'
}

// Extrai jogadores de uma linha do GAME_FACTS_ALL
// Centraliza um item na sua faixa com rolagem horizontal, sem mexer na rolagem
// vertical da página (scrollIntoView também rolava a página para cima)
function centerInRow(el) {
  if (!el) return
  const row = el.closest('.overflow-x-auto')
  if (!row) return
  const r = row.getBoundingClientRect()
  const e = el.getBoundingClientRect()
  row.scrollTo({ left: row.scrollLeft + (e.left - r.left) - (row.clientWidth - e.width) / 2, behavior: 'smooth' })
}

function extractPlayers(game, prefix) {
  const players = []
  for (let i = 1; i <= 13; i++) {
    const name = game?.[`${prefix}${i}_Name`]
    const pts = game?.[`${prefix}${i}_Pts`]
    // Semana em andamento (Sleeper): projeção, ID exato e estado do jogo da NFL
    const proj = game?.[`${prefix}${i}_Proj`]
    if (name && name !== '--empty--' && name !== '') {
      players.push({
        name: String(name).trim(),
        pts: parseNumber(pts),
        proj: proj != null && proj !== '' ? parseNumber(proj) : null,
        id: game?.[`${prefix}${i}_Id`] ? String(game[`${prefix}${i}_Id`]) : null,
        gs: game?.[`${prefix}${i}_GS`] || null,
        gt: game?.[`${prefix}${i}_GT`] || null,
      })
    }
  }
  return players
}

function computeMaxPoints(pool, seasonYear) {
  const config = ROSTER_CONFIG[Number(seasonYear)] || ROSTER_CONFIG[2025]
  const buckets = { QB: [], RB: [], WR: [], TE: [], K: [], DEF: [] }
  pool.forEach(p => {
    if (buckets[p.pos]) buckets[p.pos].push(p)
  })
  Object.keys(buckets).forEach(k => buckets[k].sort((a, b) => b.pts - a.pts))

  let total = 0
  const flexPool = []
  const need = { QB: config.qb, RB: config.rb, WR: config.wr, TE: config.te, K: config.k, DEF: config.def }
  Object.keys(need).forEach(pos => {
    const taken = buckets[pos].slice(0, need[pos])
    total += taken.reduce((s, p) => s + p.pts, 0)
    if (['RB', 'WR', 'TE'].includes(pos)) {
      flexPool.push(...buckets[pos].slice(need[pos]))
    }
  })
  flexPool.sort((a, b) => b.pts - a.pts)
  total += flexPool.slice(0, config.flex).reduce((s, p) => s + p.pts, 0)
  return total
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
      <span className={`font-semibold text-white ${textClassName}`}>
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

// Todos os jogadores com o mesmo nome abreviado (ex.: "T. Etienne" = Travis e
// Trevor), por posição. A tabela principal guarda só um por nome.
function buildPlayerCandidates(rows) {
  const map = new Map()
  rows.forEach(row => {
    const playerId = String(row?.player_id || '').trim()
    if (!playerId) return
    const pos = String(row?.position || '').trim().toUpperCase()
    const entry = { playerId, pos, team: String(row?.team || '').trim().toLowerCase(), abbreviated: String(row?.name || '').trim(), fullName: String(row?.full_name || '').trim() }
    ;[row?.name, row?.full_name].filter(Boolean).forEach(v => {
      const key = normalizePlayerKey(v)
      if (!key) return
      ;[`${key}|${pos}`, key].forEach(k => {
        if (!map.has(k)) map.set(k, [])
        if (!map.get(k).some(e => e.playerId === playerId)) map.get(k).push(entry)
      })
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

// ── Estado do jogo de cada jogador (semana em andamento) ─────────────
// Em campo: fundo verde claro + borda fina verde em volta + relógio pulsando.
// Já jogou: normal, com "Final". Ainda vai jogar: pontos apagados + horário.
function kickoffShort(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} ${time}`
}

// Semana em andamento: jogador cujo jogo ainda não aconteceu (ou de folga)
// mostra "—" em vez de 0.00. Quem jogou e zerou continua com 0.00.
const notPlayedYet = p => p?.gs === 'pre' || p?.gs === 'bye'

function gameCellClass(p, base, side) {
  if (p?.gs === 'in') return 'rounded-md bg-[#EAF7EE] ring-1 ring-inset ring-[#1E8E3E]/35'
  if (p?.gs === 'pre' || p?.gs === 'bye') return `${base} [&_img]:opacity-60`
  return base
}

// Embaixo dos pontos: só a projeção
function PlayerGameLine({ p }) {
  if (p?.proj == null) return null
  return <span className="mt-0.5 whitespace-nowrap text-[10px] font-medium text-[#9CA3AF]">proj {p.proj.toFixed(1)}</span>
}

// Embaixo do nome: estado do jogo da NFL (relógio ao vivo, Final, horário ou Bye)
function PlayerGameState({ p, align = 'left' }) {
  if (!p?.gs) return null
  const state = p.gs === 'in' ? { text: p.gt || 'Live', cls: 'font-semibold text-[#1E8E3E]', dot: true }
    : p.gs === 'post' ? { text: 'Final', cls: 'text-[#6B7280]' }
      : p.gs === 'bye' ? { text: 'Bye', cls: 'text-[#9CA3AF]' }
        : { text: kickoffShort(p.gt), cls: 'text-[#9CA3AF]' }
  return (
    <span className={`mt-0.5 flex items-center gap-1 text-[10px] font-medium ${align === 'right' ? 'justify-end' : ''} ${state.cls}`}>
      {state.dot && <span className="inline-block h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-[#1E8E3E]" />}
      <span className="truncate">{state.text}</span>
    </span>
  )
}

function PlayerRowAvatar({ name, pos, playerLookup, size = 36, mirror = false, playerId: idOverride = null }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)

  const data = getPlayerData(name, pos, playerLookup)
  const resolvedPos = getDisplayPlayerPos(name, pos, playerLookup)
  const isDefense = resolvedPos === 'DEF'
  const playerId = idOverride || data?.playerId
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
  const ringWidth = 1

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
        background: '#F4F5F7',
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
        border: '1px solid #E3E5E8',
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
  // Time em foco (filtro geral do header): abre direto no confronto dele
  const focus = getTeamFocus()
  if (focus) {
    const mine = data.find(g => String(g?.Season || '').trim() === seasonVal && String(g?.Week || '').trim() === weekVal && String(g?.Team || '').trim() === focus)
    if (mine) return mine
  }
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

function getPlayerId(name, playerLookup) {
  return playerLookup?.get(normalizePlayerKey(name))?.playerId || null
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

// "16-17" → 17; "4" → 4
function weekNum(label) {
  const nums = String(label || '').match(/\d+/g)
  return nums ? Math.max(...nums.map(Number)) : 0
}

// ---- Componentes de card no padrão ESPN (usados no Week Recap e no Power Ranking)
function CardShell({ title, subtitle, action, children }) {
  return (
    <section className="mb-2 overflow-hidden rounded-xl bg-white lg:bg-[#F6F7F9]">
      <div className="flex items-start gap-2 px-3 pb-2 pt-3 lg:px-4 lg:pb-3 lg:pt-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold leading-tight text-[#111]">{title}</h2>
          {subtitle && <div className="mt-0.5 text-[12px] text-[#6B7280]">{subtitle}</div>}
        </div>
        {action}
      </div>
      <div className="mx-3 border-t border-[#E6E8EB] lg:mx-4" />
      {children}
    </section>
  )
}

function MatchupsPageContent() {
  const [games, setGames] = useState([])
  const sheetRowsRef = useRef([])
  const [playerLookup, setPlayerLookup] = useState(new Map())
  const [playerCandidates, setPlayerCandidates] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState('')
  const [week, setWeek] = useState('')
  const [selected, setSelected] = useState(null)
  // Game Recap ou Week Recap (mesmo espaço, o usuário escolhe) e aba do Week Recap
  const [recapView, setRecapView] = useState('game')
  const [weekTab, setWeekTab] = useState('players')
  // Starters e Bench podem ser recolhidos (para ler o recap rapidinho)
  const [startersOpen, setStartersOpen] = useState(true)
  const [benchOpen, setBenchOpen] = useState(true)
  // Abas do celular: Matchup | Head to head | Game recap | Rankings
  const [mobileTab, setMobileTab] = useState('matchup')
  // Página dos "Last meetings" do head to head (volta à 1ª ao trocar de confronto)
  const [h2hPageState, setH2hPageState] = useState({ key: '', page: 0 })
  // Card da direita: Power Rankings ou Standings
  const [rankTab, setRankTab] = useState('pr')
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
        centerInRow(activeWeekRef.current)
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [week]); // Roda sempre que a semana mudar

  // Deixe este efeito SEPARADO do seu useEffect de load
  useEffect(() => {
    if (season && activeSeasonRef.current) {
      const timer = setTimeout(() => {
        centerInRow(activeSeasonRef.current)
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [season]);

  useEffect(() => {
    async function load() {
      const [sheetData, cacheRows, sleeperRows] = await Promise.all([
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        safeFetch(`${BASE_URL}/_PLAYER_CACHE`),
        // Semana em andamento e semanas futuras da temporada atual (Sleeper)
        safeFetch('/api/league/sleeper-rows'),
      ])
      sheetRowsRef.current = sheetData
      const data = [...sheetData, ...sleeperRows]
      setGames(data)
      setPlayerLookup(buildPlayerLookup(cacheRows))
      setPlayerCandidates(buildPlayerCandidates(cacheRows))

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
  // Ao vivo: a semana em andamento vem do Sleeper e é buscada de novo a cada
  // 10s com jogo rolando (60s no resto da semana), no mesmo ritmo do placar da
  // Home. O confronto aberto é trocado pela versão nova, para placar e pontos
  // dos jogadores acompanharem o jogo. Falhas não interrompem; voltar para a
  // aba atualiza na hora.
  const liveMode = games.some(g => String(g?.Status || '').trim() === 'live') ? 'live'
    : games.some(g => String(g?.Status || '').trim() === 'current') ? 'current' : null
  useEffect(() => {
    if (!liveMode) return
    let cancelled = false
    let timer = null
    const sameGame = (a, b) => a && b && ['Season', 'Week', 'Team', 'Opponent'].every(k => String(a?.[k] || '').trim() === String(b?.[k] || '').trim())
    const refresh = async () => {
      clearTimeout(timer)
      const rows = await safeFetch(`/api/league/sleeper-rows?_=${Math.floor(Date.now() / 5000)}`)
      if (cancelled) return
      if (rows.length) {
        setGames([...sheetRowsRef.current, ...rows])
        setSelected(prev => (prev ? rows.find(r => sameGame(r, prev)) || prev : prev))
      }
      timer = setTimeout(refresh, liveMode === 'live' ? 10000 : 60000)
    }
    timer = setTimeout(refresh, liveMode === 'live' ? 10000 : 60000)
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { cancelled = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [liveMode])

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

  // Week Recap — nos moldes do relatório semanal do Sleeper. Só considera
  // temporada regular pros awards, já que playoffs distorceriam comparações.
  // Power Ranking resumido da semana selecionada. Usa diretamente os campos
  // já calculados no GAME_FACTS_ALL, mantendo o mesmo resultado da página completa.
  const powerRankingPreview = useMemo(() => {
    if (!season || !week) return []

    const filtered = games.filter(g =>
      String(g?.Season || '').trim() === season &&
      String(g?.Week || '').trim() === String(week) &&
      parseNumber(g?.['Power Ranking']) > 0
    )

    const rows = filtered.map(g => ({
      team: String(g?.Team || '').trim(),
      rank: parseNumber(g?.['Power Ranking']),
      wins: parseNumber(g?.Wins),
      losses: parseNumber(g?.Losses),
      avgPF: parseNumber(g?.AVG_PF),
      ovw: parseNumber(g?.OVW),
      streak: String(g?.Streak_Total || g?.Streak || '').trim(),
      result: String(g?.Result || '').trim().toUpperCase(),
    }))

    const metricRank = (value, key) =>
      1 + rows.reduce((count, row) => count + (row[key] > value ? 1 : 0), 0)

    return rows
      .map(row => ({
        ...row,
        avgRank: metricRank(row.avgPF, 'avgPF'),
        ovwRank: metricRank(row.ovw, 'ovw'),
      }))
      .sort((a, b) => a.rank - b.rank || a.team.localeCompare(b.team))
  }, [games, season, week])

  // Classificação da temporada regular até a semana escolhida
  const standings = useMemo(() => {
    if (!season || !week) return []
    const upTo = weekNum(week)
    const map = new Map()
    games.forEach(g => {
      if (String(g?.Season || '').trim() !== season || weekNum(g?.Week) > upTo) return
      const type = String(g?.GameType || '').trim()
      if (type && !/^reg/i.test(type)) return
      const result = String(g?.Result || '').trim().toUpperCase()
      if (!['W', 'L', 'T'].includes(result)) return
      const team = String(g?.Team || '').trim()
      const row = map.get(team) || { team, w: 0, l: 0, t: 0, pf: 0, streak: '' }
      if (result === 'W') row.w++
      else if (result === 'L') row.l++
      else row.t++
      row.pf += parseNumber(g?.PF)
      map.set(team, row)
    })
    // Sequência atual: do jogo mais recente para trás
    map.forEach(row => {
      const results = games
        .filter(g => String(g?.Season || '').trim() === season && String(g?.Team || '').trim() === row.team && weekNum(g?.Week) <= upTo && ['W', 'L'].includes(String(g?.Result || '').trim().toUpperCase()) && (!String(g?.GameType || '').trim() || /^reg/i.test(String(g?.GameType).trim())))
        .sort((a, b) => weekNum(b?.Week) - weekNum(a?.Week))
        .map(g => String(g.Result).trim().toUpperCase())
      let n = 0
      while (n < results.length && results[n] === results[0]) n++
      row.streak = results.length ? `${results[0]}${n}` : ''
    })
    return [...map.values()].sort((a, b) => b.w - a.w || a.l - b.l || b.pf - a.pf || a.team.localeCompare(b.team))
  }, [games, season, week])

  // Retrospecto dos dois times até o jogo escolhido (inclusive, se já acabou)
  const headToHead = useMemo(() => {
    if (!selected) return null
    const a = String(selected?.Team || '').trim()
    const b = String(selected?.Opponent || '').trim()
    if (!a || !b) return null
    const order = g => Number(g?.Season || 0) * 100 + weekNum(g?.Week)
    const limit = order(selected)
    const meetings = games
      .filter(g => String(g?.Team || '').trim() === a && String(g?.Opponent || '').trim() === b && order(g) <= limit && ['W', 'L', 'T'].includes(String(g?.Result || '').trim().toUpperCase()))
      .sort((x, y) => order(y) - order(x))
    if (!meetings.length) return { a, b, meetings: [], winsA: 0, winsB: 0, ties: 0 }
    const res = g => String(g.Result).trim().toUpperCase()
    const isPlayoff = g => { const t = String(g?.GameType || '').trim(); return t && !/^reg|consol|place/i.test(t) }
    const winsA = meetings.filter(g => res(g) === 'W').length
    const winsB = meetings.filter(g => res(g) === 'L').length
    const ties = meetings.length - winsA - winsB
    const playoffs = meetings.filter(isPlayoff)
    let streakN = 0
    while (streakN < meetings.length && res(meetings[streakN]) === res(meetings[0])) streakN++
    const streakTeam = res(meetings[0]) === 'W' ? a : res(meetings[0]) === 'L' ? b : null
    const avgA = meetings.reduce((t, g) => t + parseNumber(g?.PF), 0) / meetings.length
    const avgB = meetings.reduce((t, g) => t + parseNumber(g?.PA), 0) / meetings.length
    const margin = g => parseNumber(g?.PF) - parseNumber(g?.PA)
    const bigA = meetings.filter(g => res(g) === 'W').sort((x, y) => margin(y) - margin(x))[0] || null
    const bigB = meetings.filter(g => res(g) === 'L').sort((x, y) => margin(x) - margin(y))[0] || null
    // Maior sequência de vitórias de cada time no confronto (do mais antigo ao mais recente)
    const bestRun = winRes => {
      let best = null, run = []
      ;[...meetings].reverse().forEach(g => {
        if (res(g) === winRes) {
          run.push(g)
          if (!best || run.length >= best.length) best = [...run] // empate: fica a mais recente
        } else run = []
      })
      return best ? { n: best.length, first: best[0], last: best[best.length - 1] } : null
    }
    const runA = bestRun('W')
    const runB = bestRun('L')
    return {
      a, b, meetings, winsA, winsB, ties,
      playoffA: playoffs.filter(g => res(g) === 'W').length,
      playoffB: playoffs.filter(g => res(g) === 'L').length,
      streakTeam, streakN, avgA, avgB, bigA, bigB, runA, runB,
    }
  }, [selected, games])

  const openGame = (g) => {
    if (!g) return
    setSeason(String(g.Season).trim())
    setWeek(String(g.Week).trim())
    setSelected(g)
    setMobileTab('matchup')
  }

  const weekRecap = useMemo(() => {
    if (!season || !week || matchups.length === 0 || !playerLookup) return null

    const resolvePlayers = (list, fallbackPositions) => list.map((p, i) => ({
      ...p,
      pos: getDisplayPlayerPos(p.name, fallbackPositions ? fallbackPositions[i] : 'BN', playerLookup),
    }))

    const rosterPositions = getRosterPositions(season)

    // Uma entrada por time (não por confronto) — cada matchup vira 2 entradas.
    const entries = []
    matchups.forEach(g => {
      const team = String(g?.Team || '').trim()
      const opp = String(g?.Opponent || '').trim()
      const pf = parseNumber(g?.PF)
      const pa = parseNumber(g?.PA)

      const teamStarters = resolvePlayers(extractPlayers(g, 'S'), rosterPositions)
      const teamBench = resolvePlayers(extractPlayers(g, 'B'))
      const oppStartersR = resolvePlayers(extractPlayers(g, 'OS'), rosterPositions)
      const oppBenchR = resolvePlayers(extractPlayers(g, 'OB'))

      entries.push({
        team, opponent: opp, pf, pa, win: pf > pa,
        starters: teamStarters, bench: teamBench,
        maxPts: computeMaxPoints([...teamStarters, ...teamBench], season),
      })
      entries.push({
        team: opp, opponent: team, pf: pa, pa: pf, win: pa > pf,
        starters: oppStartersR, bench: oppBenchR,
        maxPts: computeMaxPoints([...oppStartersR, ...oppBenchR], season),
      })
    })

    if (entries.length === 0) return null

    const bestTeam = entries.reduce((a, b) => (b.pf > a.pf ? b : a))
    const worstTeam = entries.reduce((a, b) => (b.pf < a.pf ? b : a))

    // Players / Benchwarmers of the Week — maior pontuador por posição real
    const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
    const playersOfWeek = POSITIONS.map(pos => {
      let best = null
      entries.forEach(e => {
        e.starters.forEach(p => {
          if (p.pos === pos && (!best || p.pts > best.pts)) best = { ...p, team: e.team }
        })
      })
      return best ? { pos, ...best } : null
    }).filter(Boolean)

    const benchOfWeek = POSITIONS.map(pos => {
      let best = null
      entries.forEach(e => {
        e.bench.forEach(p => {
          if (p.pos === pos && (!best || p.pts > best.pts)) best = { ...p, team: e.team }
        })
      })
      return best ? { pos, ...best } : null
    }).filter(Boolean)

    // League Awards
    const withEff = entries.filter(e => e.maxPts > 0).map(e => ({ ...e, pct: e.pf / e.maxPts }))
    const mostEfficient = withEff.length ? withEff.reduce((a, b) => (b.pct > a.pct ? b : a)) : null
    const leastEfficient = withEff.length ? withEff.reduce((a, b) => (b.pct < a.pct ? b : a)) : null

    const losers = entries.filter(e => !e.win)
    const winners = entries.filter(e => e.win)
    const highestInLoss = losers.length ? losers.reduce((a, b) => (b.pf > a.pf ? b : a)) : null
    const lowestInWin = winners.length ? winners.reduce((a, b) => (b.pf < a.pf ? b : a)) : null

    const withMargin = matchups.map(g => {
      const pf = parseNumber(g?.PF)
      const pa = parseNumber(g?.PA)
      const won = pf > pa
      return {
        winner: won ? g.Team : g.Opponent,
        winnerScore: won ? pf : pa,
        loser: won ? g.Opponent : g.Team,
        loserScore: won ? pa : pf,
        margin: Math.abs(pf - pa),
      }
    })
    const biggestBlowout = withMargin.length ? withMargin.reduce((a, b) => (b.margin > a.margin ? b : a)) : null
    const narrowVictory = withMargin.length ? withMargin.reduce((a, b) => (b.margin < a.margin ? b : a)) : null

    const teamPerformance = [...entries].sort((a, b) => b.pf - a.pf)

    return {
      bestTeam, worstTeam, playersOfWeek, benchOfWeek,
      mostEfficient, leastEfficient, highestInLoss, lowestInWin,
      biggestBlowout, narrowVictory, teamPerformance,
    }
  }, [season, week, matchups, playerLookup])

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
  // Depende do confronto (não do objeto): a atualização ao vivo troca o objeto
  // a cada poucos segundos e não pode mexer na rolagem.
  const selectedKey = selected ? ['Season', 'Week', 'Team', 'Opponent'].map(k => String(selected?.[k] || '').trim()).join('|') : ''
  useEffect(() => {
    if (!selectedKey || matchupsCanCenter || !matchupsFrameRef.current || !activeGameRef.current) return

    const timer = setTimeout(() => centerInRow(activeGameRef.current), 120)

    return () => clearTimeout(timer)
  }, [selectedKey, matchupsCanCenter])

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

  // Trocou o time no filtro geral: abre o confronto dele na semana aberta
  const [teamFocus] = useTeamFocus()
  const lastFocusRef = useRef(teamFocus)
  useEffect(() => {
    if (lastFocusRef.current === teamFocus) return
    lastFocusRef.current = teamFocus
    if (!teamFocus || !season || !week) return
    const mine = games.find(g => String(g?.Season || '').trim() === season && String(g?.Week || '').trim() === week && String(g?.Team || '').trim() === teamFocus)
    if (mine) setSelected(mine)
  }, [teamFocus, games, season, week])

  const handleWeekClick = (w) => {
    setWeek(String(w))
    // Confronto do time em foco (filtro geral) ou o primeiro da semana
    setSelected(firstGameOfWeek(games, season, String(w)))
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
  // Semanas vindas do Sleeper: em andamento (live) ou futuras (upcoming)
  const matchStatus = String(selected?.Status || '').trim()
  const undecided = matchStatus === 'live' || matchStatus === 'current' || matchStatus === 'upcoming'
  const teamBold = undecided || teamWon
  const oppBold = undecided || !teamWon

  // Semanas antigas (planilha): projeção da semana vinda do Sleeper (existe
  // desde 2018, então vale de 2021 em diante). Semana em andamento já traz.
  const projKey = selected && selected.Source !== 'sleeper' && Number(season) >= 2018 ? `${season}|${week}` : null
  const [projCache, setProjCache] = useState({})
  useEffect(() => {
    if (!projKey || projCache[projKey]) return
    const [s, w] = projKey.split('|')
    let cancelled = false
    fetch(`/api/league/projections?season=${encodeURIComponent(s)}&week=${encodeURIComponent(w)}`)
      .then(r => (r.ok ? r.json() : {}))
      .then(map => { if (!cancelled) setProjCache(c => ({ ...c, [projKey]: map || {} })) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [projKey, projCache])
  const projMap = projKey ? projCache[projKey] : null
  const slotPositions = getRosterPositions(season)
  // ID de cada jogador: o do Sleeper quando a linha traz (semana em andamento);
  // senão pelo nome, e se o nome for ambíguo (dois "T. Etienne"), o candidato
  // que tem projeção naquela semana. Foto, projeção e perfil usam esse ID.
  const withProj = (list, starter) => list.map((p, i) => {
    let id = p.id
    if (!id) {
      const slot = starter ? String(slotPositions[i] || '').toUpperCase() : ''
      const key = normalizePlayerKey(p.name)
      const cands = (slot && slot !== 'FLEX' ? playerCandidates.get(`${key}|${slot}`) : null) || playerCandidates.get(key) || []
      const withProjection = projMap ? cands.find(c => projMap[c.playerId] > 0) : null
      id = withProjection?.playerId || getPlayerData(p.name, starter ? slotPositions[i] : '', playerLookup)?.playerId || null
    }
    const proj = p.proj != null ? p.proj : projMap && id && projMap[id] != null ? projMap[id] : null
    return { ...p, id, proj }
  })

  const starters = withProj(selected ? extractPlayers(selected, 'S') : [], true)
  const bench = withProj(selected ? extractPlayers(selected, 'B') : [], false)
  const oppStarters = withProj(selected ? extractPlayers(selected, 'OS') : [], true)
  const oppBench = withProj(selected ? extractPlayers(selected, 'OB') : [], false)
  // Projeção total do time (soma dos titulares)
  const sumProj = list => (list.some(p => p.proj != null) ? list.reduce((sum, p) => sum + (p.proj || 0), 0) : null)
  const teamProj = selected?.ProjPF ? parseNumber(selected.ProjPF) : sumProj(starters)
  const oppProj = selected?.ProjPA ? parseNumber(selected.ProjPA) : sumProj(oppStarters)

  const closePlayerProfile = () => setSelectedPlayerProfile(null)

  const openPlayerProfile = (player, pos, teamSide) => {
    if (!player?.name || !selected) return
    const team = teamSide === 'away' ? String(selected?.Opponent || '').trim() : String(selected?.Team || '').trim()
    const opponent = teamSide === 'away' ? String(selected?.Team || '').trim() : String(selected?.Opponent || '').trim()
    setSelectedPlayerProfile({
      rawName: String(player.name).trim(),
      playerId: player.id || null,
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


  // Semana sem pontos (ainda não começou): sem Week Recap
  const weekHasPoints = matchups.some(g => parseNumber(g?.PF) > 0 || parseNumber(g?.PA) > 0)
  const weekRecapReady = Boolean(weekRecap && weekHasPoints)

  // Week Recap: fica junto do Game Recap (o usuário escolhe um ou outro) e é
  // dividido em abas para não crescer na vertical
  const openWeekPlayer = (p) => setSelectedPlayerProfile({
    rawName: String(p.name).trim(),
    playerId: p.id || null,
    displayName: getDisplayPlayerName(p.name, p.pos, playerLookup),
    position: getDisplayPlayerPos(p.name, p.pos, playerLookup),
    pts: p.pts,
    status: 'Starter',
    team: p.team,
    opponent: '',
    season,
    week,
    gameStage: '',
  })
  // Overachiever / Underachiever: quem mais passou e quem mais ficou abaixo da
  // própria projeção na semana (projeção do Sleeper, existe desde 2018)
  const projAwards = (() => {
    if (!weekRecapReady) return {}
    const list = matchups.flatMap(g => {
      const projA = g?.ProjPF ? parseNumber(g.ProjPF) : sumProj(withProj(extractPlayers(g, 'S'), true))
      const projB = g?.ProjPA ? parseNumber(g.ProjPA) : sumProj(withProj(extractPlayers(g, 'OS'), true))
      return [
        { team: String(g?.Team || '').trim(), pf: parseNumber(g?.PF), proj: projA },
        { team: String(g?.Opponent || '').trim(), pf: parseNumber(g?.PA), proj: projB },
      ]
    }).filter(e => e.proj > 0).map(e => ({ ...e, diff: e.pf - e.proj }))
    if (list.length < 2) return {}
    return {
      over: list.reduce((a, b) => (b.diff > a.diff ? b : a)),
      under: list.reduce((a, b) => (b.diff < a.diff ? b : a)),
    }
  })()
  const signed = n => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}`
  const weekTabs = weekRecapReady ? [
    weekRecap.playersOfWeek.length > 0 && ['players', 'Players'],
    weekRecap.benchOfWeek.length > 0 && ['bench', 'Bench'],
    ['awards', 'Awards'],
    weekRecap.teamPerformance.length > 0 && ['lineups', 'Efficiency'],
  ].filter(Boolean) : []
  const activeWeekTab = weekTabs.some(([k]) => k === weekTab) ? weekTab : weekTabs[0]?.[0]
  const weekPlayerCard = (p, bench) => (
    <button
      key={p.pos}
      type="button"
      onClick={() => openWeekPlayer(p)}
      className="flex min-w-0 flex-col items-center rounded-xl bg-[#F6F7F9] px-1 pb-3 pt-3.5 text-center transition-colors hover:bg-[#EEF0F2]"
    >
      <PlayerRowAvatar name={p.name} pos={p.pos} playerLookup={playerLookup} size={52} />
      <span className="mt-2"><UiPositionBadge position={p.pos} /></span>
      <span className="mt-1 w-full truncate text-[12px] font-semibold text-[#111]">{getDisplayPlayerName(p.name, p.pos, playerLookup)}</span>
      <span className="mt-0.5 flex w-full min-w-0 items-center justify-center gap-1 text-[11px] text-[#6B7280]">
        <TeamAvatar name={p.team} className="h-3.5 w-3.5 flex-shrink-0" textClassName="text-[5px]" />
        <span className="truncate" title={p.team}>{getTeamAbbr(p.team) || p.team}</span>
      </span>
      <span className={`mt-1.5 text-[18px] font-bold leading-none tabular-nums ${bench ? 'text-[#6B7280]' : 'text-[#111]'}`}>{p.pts.toFixed(2)}</span>
    </button>
  )
  const weekRecapView = weekRecapReady ? (
    <div className="@container">
      {/* Melhor e pior time da semana */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: '🏆 Best team', tone: 'text-[#1E8E3E]', t: weekRecap.bestTeam },
          { label: '💀 Worst team', tone: 'text-[#D01F2D]', t: weekRecap.worstTeam },
        ].map(({ label, tone, t }) => (
          // Estreito (celular): empilhado; largo: avatar, nome e pontos na mesma linha
          <div key={label} className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-[#F6F7F9] px-3 py-2.5 @md:flex-row @md:items-center @md:gap-2.5">
            <div className="flex min-w-0 items-center gap-2 @md:contents">
              <TeamAvatar name={t.team} className="h-8 w-8 flex-shrink-0 rounded-lg @md:h-9 @md:w-9" textClassName="text-[10px]" />
              <div className={`whitespace-nowrap text-[11px] font-medium @md:hidden ${tone}`}>{label}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className={`hidden text-[11px] font-medium @md:block ${tone}`}>{label}</div>
              <div className="truncate text-[13px] font-semibold text-[#111]">{t.team}</div>
            </div>
            <div className={`flex-shrink-0 text-[18px] font-bold leading-none tabular-nums ${tone}`}>{t.pf.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {weekTabs.length > 1 && (
        <div className="mt-3 flex rounded-lg bg-[#F1F2F4] p-0.5 text-[12px] font-medium">
          {weekTabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setWeekTab(key)}
              className={`flex-1 rounded-md px-2 py-1.5 transition-colors ${activeWeekTab === key ? 'bg-white text-[#111] shadow-sm' : 'text-[#6B7280] hover:text-[#111]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        {activeWeekTab === 'players' && (
          <div className="grid grid-cols-3 gap-2 @xl:grid-cols-6">{weekRecap.playersOfWeek.map(p => weekPlayerCard(p, false))}</div>
        )}
        {activeWeekTab === 'bench' && (
          <div className="grid grid-cols-3 gap-2 @xl:grid-cols-6">{weekRecap.benchOfWeek.map(p => weekPlayerCard(p, true))}</div>
        )}
        {activeWeekTab === 'awards' && (
          // Cards compactos: 2 por linha (4 no card largo) para não virar lista
          <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-4">
            {[
              weekRecap.mostEfficient && { label: 'Most efficient', icon: '🎯', tone: 'text-[#1E8E3E]', team: weekRecap.mostEfficient.team, value: weekRecap.mostEfficient.pf.toFixed(2), sub: `${(weekRecap.mostEfficient.pct * 100).toFixed(1)}% of max ${weekRecap.mostEfficient.maxPts.toFixed(2)}` },
              weekRecap.leastEfficient && { label: 'Least efficient', icon: '🪫', tone: 'text-[#D01F2D]', team: weekRecap.leastEfficient.team, value: weekRecap.leastEfficient.pf.toFixed(2), sub: `${(weekRecap.leastEfficient.pct * 100).toFixed(1)}% of max ${weekRecap.leastEfficient.maxPts.toFixed(2)}` },
              projAwards.over && { label: 'Overachiever', icon: '🚀', tone: 'text-[#1E8E3E]', team: projAwards.over.team, value: signed(projAwards.over.diff), sub: `${projAwards.over.pf.toFixed(2)} vs proj ${projAwards.over.proj.toFixed(2)}` },
              projAwards.under && { label: 'Underachiever', icon: '📉', tone: 'text-[#D01F2D]', team: projAwards.under.team, value: signed(projAwards.under.diff), sub: `${projAwards.under.pf.toFixed(2)} vs proj ${projAwards.under.proj.toFixed(2)}` },
              weekRecap.highestInLoss && { label: 'Highest in a loss', icon: '😤', tone: 'text-[#111]', team: weekRecap.highestInLoss.team, value: weekRecap.highestInLoss.pf.toFixed(2), sub: `lost to ${weekRecap.highestInLoss.opponent}` },
              weekRecap.lowestInWin && { label: 'Lowest in a win', icon: '🍀', tone: 'text-[#111]', team: weekRecap.lowestInWin.team, value: weekRecap.lowestInWin.pf.toFixed(2), sub: `beat ${weekRecap.lowestInWin.opponent}` },
              weekRecap.biggestBlowout && { label: 'Biggest blowout', icon: '💥', tone: 'text-[#D01F2D]', team: weekRecap.biggestBlowout.winner, value: weekRecap.biggestBlowout.margin.toFixed(2), sub: `vs ${weekRecap.biggestBlowout.loser} · ${weekRecap.biggestBlowout.winnerScore.toFixed(2)}–${weekRecap.biggestBlowout.loserScore.toFixed(2)}` },
              weekRecap.narrowVictory && { label: 'Narrow victory', icon: '😅', tone: 'text-[#111]', team: weekRecap.narrowVictory.winner, value: weekRecap.narrowVictory.margin.toFixed(2), sub: `vs ${weekRecap.narrowVictory.loser} · ${weekRecap.narrowVictory.winnerScore.toFixed(2)}–${weekRecap.narrowVictory.loserScore.toFixed(2)}` },
            ].filter(Boolean).map(a => (
              <div key={a.label} className="flex min-w-0 flex-col rounded-xl bg-[#F6F7F9] px-2.5 py-2.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="flex-shrink-0 text-[14px] leading-none">{a.icon}</span>
                  <span className="truncate text-[11px] font-medium text-[#6B7280]">{a.label}</span>
                </div>
                <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                  <TeamAvatar name={a.team} className="h-5 w-5 flex-shrink-0" textClassName="text-[7px]" />
                  <span className="truncate text-[13px] font-semibold text-[#111]" title={a.team}>{a.team}</span>
                </div>
                <div className={`mt-1.5 text-[18px] font-bold leading-none tabular-nums ${a.tone}`}>{a.value}</div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#6B7280]">{a.sub}</div>
              </div>
            ))}
          </div>
        )}
        {activeWeekTab === 'lineups' && (
          <div>
            <div className="pb-1 text-[11px] font-medium text-[#6B7280]">Score vs. max possible</div>
            {weekRecap.teamPerformance.map((e, i) => {
              const pct = e.maxPts > 0 ? Math.min(100, (e.pf / e.maxPts) * 100) : 0
              return (
                <div key={e.team} className="flex items-center gap-2 py-1.5 lg:gap-3">
                  <span className="w-4 flex-shrink-0 text-right text-[11px] text-[#6B7280]">{i + 1}</span>
                  <TeamAvatar name={e.team} className="h-5 w-5 flex-shrink-0" textClassName="text-[7px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-[#111]">{e.team}</span>
                      <span className="flex-shrink-0 text-[12px] tabular-nums text-[#111]">{e.pf.toFixed(2)} <span className="text-[#9CA3AF]">/ {e.maxPts.toFixed(2)}</span></span>
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-[#EEF0F2]">
                      <div className="h-full rounded-full bg-[#02275F]/50" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="w-9 flex-shrink-0 text-right text-[11px] tabular-nums text-[#6B7280]">{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  ) : null

  const hasPR = powerRankingPreview.length > 0
  const activeRankTab = rankTab === 'standings' || !hasPR ? 'standings' : 'pr'
  const matchupTeams = [String(selected?.Team || '').trim(), String(selected?.Opponent || '').trim()]
  const rankTabs = (
    <div className="flex flex-shrink-0 rounded-lg bg-[#E9EBEE] p-0.5 text-[11px] font-medium">
      {[hasPR && ['pr', 'Rankings'], ['standings', 'Standings']].filter(Boolean).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setRankTab(key)}
          className={`rounded-md px-2 py-1 transition-colors ${activeRankTab === key ? 'bg-white text-[#111] shadow-sm' : 'text-[#6B7280] hover:text-[#111]'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
  const standingsBody = (
    <>
      <div className="grid grid-cols-[18px_minmax(0,1fr)_38px_38px_30px] items-center gap-x-1.5 border-b border-[#EEF0F2] px-3 py-2 text-[11px] font-medium uppercase text-[#6B7280] lg:px-4">
        <span className="text-right">#</span>
        <span>Team</span>
        <span className="text-right">W-L</span>
        <span className="text-right">PF</span>
        <span className="text-right">Strk</span>
      </div>
      {standings.map((t, i) => {
        const inMatchup = matchupTeams.includes(t.team)
        return (
          <div key={t.team} className={`grid grid-cols-[18px_minmax(0,1fr)_38px_38px_30px] items-center gap-x-1.5 border-b border-[#F1F2F4] px-3 py-2 text-[12px] tabular-nums last:border-b-0 lg:px-4 lg:py-2.5 ${inMatchup ? 'bg-[#EAEFF7]' : ''}`}>
            <span className={`text-right ${i < 3 ? 'font-bold text-[#111]' : 'text-[#6B7280]'}`}>{i + 1}</span>
            <span className="flex min-w-0 items-center gap-1.5">
              <TeamAvatar name={t.team} className="h-5 w-5 flex-shrink-0" textClassName="text-[7px]" />
              <span className={`truncate text-[13px] text-[#111] ${inMatchup ? 'font-semibold' : 'font-medium'}`}>{t.team}</span>
            </span>
            <span className="text-right text-[#111]">{t.w}-{t.l}{t.t ? `-${t.t}` : ''}</span>
            <span className="text-right text-[#3F4757]">{t.pf.toFixed(0)}</span>
            <span className={`text-right font-medium ${t.streak.startsWith('W') ? 'text-[#1E8E3E]' : t.streak.startsWith('L') ? 'text-[#D01F2D]' : 'text-[#111]'}`}>{t.streak || '—'}</span>
          </div>
        )
      })}
      <a
        href={`/stats?tab=standings&season=${encodeURIComponent(season)}`}
        className="block border-t border-[#E6E8EB] px-3 py-3 text-center lg:py-4 text-[13px] font-medium text-[#1D5FD1] hover:underline"
      >
        Full Standings
      </a>
    </>
  )

  const prHref = `/powerrankings?season=${encodeURIComponent(season)}&week=${encodeURIComponent(week)}`
  const powerCard = hasPR || standings.length > 0 ? (
    <CardShell
      title={activeRankTab === 'pr' ? 'Power Rankings' : 'Standings'}
      subtitle={activeRankTab === 'pr' ? `${season} · Week ${week}` : `${season} · regular season`}
      action={rankTabs}
    >
      {activeRankTab === 'pr' ? (
        <>
        <div className="grid grid-cols-[18px_minmax(0,1fr)_38px_38px_30px] items-center gap-x-1.5 border-b border-[#EEF0F2] px-3 py-2 text-[11px] lg:px-4 font-medium uppercase text-[#6B7280]">
          <span className="text-right">#</span>
          <span>Team</span>
          <span className="text-right">Rec</span>
          <span className="text-right">Avg</span>
          <span className="text-right">Strk</span>
        </div>
        {powerRankingPreview.map((team, i) => {
          const streakIsWin = team.streak.startsWith('W')
          const streakIsLoss = team.streak.startsWith('L')
          // Mesmo destaque da Standings para os dois times do confronto aberto
          const inMatchup = matchupTeams.includes(team.team)
          return (
            <div
              key={team.team || i}
              className={`grid grid-cols-[18px_minmax(0,1fr)_38px_38px_30px] items-center gap-x-1.5 border-b border-[#F1F2F4] px-3 py-2 text-[12px] lg:px-4 lg:py-2.5 tabular-nums last:border-b-0 ${inMatchup ? 'bg-[#EAEFF7]' : ''}`}
            >
              <span className={`text-right ${team.rank <= 3 ? 'font-bold text-[#111]' : 'text-[#6B7280]'}`}>{team.rank}</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <TeamAvatar name={team.team} className="h-5 w-5 flex-shrink-0" textClassName="text-[7px]" />
                <span className={`truncate text-[13px] text-[#111] ${inMatchup ? 'font-semibold' : 'font-medium'}`}>{team.team}</span>
              </span>
              <span className="text-right text-[#111]">{team.wins}-{team.losses}</span>
              <span className="text-right text-[#3F4757]" title={`AVG rank #${team.avgRank}`}>{team.avgPF.toFixed(0)}</span>
              <span className={`text-right font-medium ${streakIsWin ? 'text-[#1E8E3E]' : streakIsLoss ? 'text-[#D01F2D]' : 'text-[#111]'}`}>{team.streak || '—'}</span>
            </div>
          )
        })}
        <a
          href={prHref}
          className="block border-t border-[#E6E8EB] px-3 py-3 text-center lg:py-4 text-[13px] font-medium text-[#1D5FD1] hover:underline"
        >
          Full Power Rankings
        </a>
        </>
      ) : standingsBody}
    </CardShell>
  ) : null

  // Head to head do confronto escolhido (o recap costuma citar o retrospecto)
  const h2h = headToHead
  const h2hShort = name => getTeamAbbr(name) || name
  const h2hBody = h2h ? (h2h.meetings.length === 0 ? (
    <div className="px-3 py-3 text-[12px] text-[#6B7280] lg:px-4">First meeting between {h2h.a} and {h2h.b}.</div>
  ) : (
    <div className="pb-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 pt-3 lg:px-4">
        {[h2h.a, null, h2h.b].map(team => team ? (
          <div key={team} className="flex min-w-0 flex-col items-center gap-1 text-center">
            <TeamAvatar name={team} className="h-9 w-9 rounded-lg" textClassName="text-[11px]" />
            <span className="line-clamp-2 w-full text-[12px] font-semibold leading-tight text-[#111]" title={team}>{team}</span>
          </div>
        ) : (
          <div key="score" className="text-center">
            <div className="text-[26px] font-bold leading-none tabular-nums text-[#111]">
              <span className={h2h.winsA >= h2h.winsB ? '' : 'text-[#9CA3AF]'}>{h2h.winsA}</span>
              <span className="mx-1.5 text-[#C4C8CE]">–</span>
              <span className={h2h.winsB >= h2h.winsA ? '' : 'text-[#9CA3AF]'}>{h2h.winsB}</span>
            </div>
            <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">{h2h.meetings.length} {h2h.meetings.length === 1 ? 'game' : 'games'}{h2h.ties ? ` · ${h2h.ties} tie${h2h.ties > 1 ? 's' : ''}` : ''}</div>
          </div>
        ))}
      </div>
      {/* Barra dividida nas cores do pôster (azul = time da esquerda, vermelho = direita) */}
      <div className="mx-3 mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-[#EEF0F2] lg:mx-4">
        <div className="bg-[#02275F]" style={{ width: `${(h2h.winsA / h2h.meetings.length) * 100}%` }} />
        <div className="ml-auto bg-[#C8102E]" style={{ width: `${(h2h.winsB / h2h.meetings.length) * 100}%` }} />
      </div>
      <div className="mt-2.5 grid grid-cols-3 border-y border-[#EEF0F2] text-center">
        {[
          ['Playoffs', `${h2h.playoffA}–${h2h.playoffB}`],
          ['Streak', h2h.streakTeam ? `${h2hShort(h2h.streakTeam)} W${h2h.streakN}` : '—'],
          ['Avg pts', `${h2h.avgA.toFixed(0)}–${h2h.avgB.toFixed(0)}`],
        ].map(([label, value], i) => (
          <div key={label} className={`px-1 py-2 ${i ? 'border-l border-[#EEF0F2]' : ''}`}>
            <div className="text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">{label}</div>
            <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-[#111]">{value}</div>
          </div>
        ))}
      </div>
      {(() => {
        const H2H_PAGE = 5
        const pages = Math.max(1, Math.ceil(h2h.meetings.length / H2H_PAGE))
        const pairKey = `${h2h.a}|${h2h.b}|${selected?.Season}|${selected?.Week}`
        const page = h2hPageState.key === pairKey ? Math.min(h2hPageState.page, pages - 1) : 0
        const setPage = n => setH2hPageState({ key: pairKey, page: n })
        const rows = h2h.meetings.slice(page * H2H_PAGE, page * H2H_PAGE + H2H_PAGE)
        return (
          <>
            <div className="flex items-center justify-between px-3 pb-1 pt-3 lg:px-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3F4757]">{pages > 1 ? 'Meetings' : 'Last meetings'}</span>
              {pages > 1 && (
                <div className="flex items-center gap-1 text-[12px] font-medium tabular-nums text-[#3F4757]">
                  <button type="button" aria-label="Previous" disabled={page === 0} onClick={() => setPage(page - 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF0F2] text-[#111] transition-colors hover:bg-[#E2E5E9] disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="min-w-[30px] text-center">{page + 1}/{pages}</span>
                  <button type="button" aria-label="Next" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF0F2] text-[#111] transition-colors hover:bg-[#E2E5E9] disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              )}
            </div>
            {rows.map(g => {
        const r = String(g.Result).trim().toUpperCase()
        const winner = r === 'W' ? h2h.a : r === 'L' ? h2h.b : null
        const isCurrent = g === selected
        const type = String(g?.GameType || '').trim()
        return (
          <button
            key={`${g.Season}|${g.Week}`}
            type="button"
            onClick={() => openGame(g)}
            className={`flex h-[40px] w-full items-center gap-2.5 border-t border-[#F1F2F4] px-3 text-left text-[14px] transition-colors hover:bg-[#EEF0F2] lg:px-4 lg:text-[13px] ${isCurrent ? 'bg-[#EAEFF7] shadow-[inset_3px_0_0_#02275F]' : ''}`}
          >
            <span className="w-[86px] flex-shrink-0 whitespace-nowrap font-medium text-[#3F4757] lg:w-[78px]">{g.Season} · W{g.Week}</span>
            {winner ? <TeamAvatar name={winner} className="h-5 w-5 flex-shrink-0" textClassName="text-[7px]" /> : <span className="h-5 w-5 flex-shrink-0" />}
            <span className="min-w-0 flex-1 truncate tabular-nums">
              <span className={r === 'W' ? 'font-bold text-[#111]' : 'text-[#4B5563]'}>{parseNumber(g.PF).toFixed(2)}</span>
              <span className="mx-1.5 text-[#9CA3AF]">–</span>
              <span className={r === 'L' ? 'font-bold text-[#111]' : 'text-[#4B5563]'}>{parseNumber(g.PA).toFixed(2)}</span>
            </span>
            {type && !/^reg/i.test(type) && <>
              <span className="max-w-[86px] flex-shrink-0 truncate rounded bg-[#FFF2B8] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B5A00] lg:hidden">{type}</span>
              {/* Coluna estreita do desktop: só uma estrela, com o tipo do jogo no hover */}
              <span title={type} className="hidden h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#FFF2B8] text-[11px] text-[#8D6A00] lg:flex">★</span>
            </>}
          </button>
        )
      })}
            {/* Altura fixa: a última página completa com linhas vazias (o card não muda de tamanho) */}
            {pages > 1 && Array.from({ length: H2H_PAGE - rows.length }, (_, i) => <div key={`pad-${i}`} aria-hidden className="h-[40px] border-t border-[#F1F2F4]" />)}
          </>
        )
      })()}
      {/* Recordes do confronto: um quadro por time (esquerda = time da esquerda), clicáveis */}
      {(h2h.bigA || h2h.bigB || h2h.runA || h2h.runB) && (
        <div className="grid grid-cols-2 gap-2 border-t border-[#EEF0F2] px-3 pb-1 pt-3 lg:px-4">
          {[
            ['Biggest win', [[h2h.a, h2h.bigA], [h2h.b, h2h.bigB]].map(([team, g]) => g && {
              team, game: g,
              value: `+${Math.abs(parseNumber(g.PF) - parseNumber(g.PA)).toFixed(2)}`,
              sub: [`${g.Season} · Week ${g.Week}`, `${parseNumber(g.PF).toFixed(2)} – ${parseNumber(g.PA).toFixed(2)}`],
            })],
            ['Best streak', [[h2h.a, h2h.runA], [h2h.b, h2h.runB]].map(([team, r]) => r && {
              team, game: r.last,
              value: `W${r.n}`,
              sub: r.n > 1 ? [`From ${r.first.Season} W${r.first.Week}`, `to ${r.last.Season} W${r.last.Week}`] : [`${r.last.Season} · Week ${r.last.Week}`],
            })],
          ].flatMap(([label, items]) => items.map((it, i) => it ? (
            <button
              key={`${label}-${it.team}`}
              type="button"
              onClick={() => openGame(it.game)}
              className={`min-w-0 rounded-lg px-2.5 py-2 text-left ring-1 transition-colors hover:bg-[#EEF0F2] ${it.game === selected ? 'bg-[#EAEFF7] ring-[#02275F]/30' : 'bg-white ring-[#E6E8EB]'}`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">{label}</div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="flex min-w-0 items-center gap-1.5">
                  <TeamAvatar name={it.team} className="h-5 w-5 flex-shrink-0" textClassName="text-[7px]" />
                  <span className="truncate text-[13px] font-semibold text-[#111]">{h2hShort(it.team)}</span>
                </span>
                {/* No celular o valor fica na mesma linha; na coluna estreita do desktop desce */}
                <span className={`ml-auto flex-shrink-0 text-[16px] font-bold leading-tight tabular-nums lg:ml-0 lg:basis-full ${label === 'Biggest win' ? 'text-[#1E8E3E]' : 'text-[#02275F]'}`}>{it.value}</span>
              </div>
              {/* Detalhe em até duas linhas curtas (cabe na coluna estreita do desktop sem cortar) */}
              <div className="mt-0.5 text-[11px] leading-snug text-[#4B5563]">
                {it.sub.map(line => <div key={line} className="truncate">{line}</div>)}
              </div>
            </button>
          ) : <div key={`${label}-empty-${i}`} />))}
        </div>
      )}
    </div>
  )) : null
  const h2hCard = h2hBody ? (
    <CardShell title="Head to head" subtitle={h2h.meetings.length ? `All-time · since ${h2h.meetings[h2h.meetings.length - 1].Season}` : 'All-time'}>
      {h2hBody}
    </CardShell>
  ) : null


  // Aba ativa no celular (se a aba escolhida não existir neste jogo, volta para Matchup)
  const activeMobileTab = (mobileTab === 'h2h' && !h2hBody) || (mobileTab === 'recap' && !(recap || weekRecapReady)) || (mobileTab === 'rankings' && !powerCard)
    ? 'matchup'
    : mobileTab

  return (
    <main className="mx-root flex min-h-screen flex-col bg-[#EDEEF0] text-[#111]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .mx-root {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          font-variant-numeric: tabular-nums;
        }
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <Header />

      <section className="mx-auto w-full max-w-[1400px] px-2.5 pb-6 pt-0 sm:px-2 lg:px-4">

        {loading ? (
          <PageSkeleton />
        ) : (
          <>
            {/* Temporada + semana (uma linha só) */}
            <div className="mb-2 flex items-stretch overflow-hidden rounded-xl bg-white">
              <label className="relative flex flex-shrink-0 items-center border-r border-[#EEF0F2] pl-3 pr-7">
                <span className="sr-only">Season</span>
                <select
                  value={season}
                  onChange={e => handleSeasonClick(e.target.value)}
                  className="cursor-pointer appearance-none bg-transparent py-3 text-[14px] font-bold text-[#111] outline-none"
                >
                  {seasons.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#6B7280]" />
              </label>
              <span className="flex-shrink-0 self-center pl-3 pr-1 text-[12px] text-[#6B7280]">Week</span>
              <div ref={weeksRef} className="scroll-hide flex min-w-0 flex-1 overflow-x-auto">
                {weeks.map(w => {
                  const isActive = week === String(w)
                  return (
                    <button
                      key={w}
                      ref={isActive ? activeWeekRef : null}
                      onClick={() => handleWeekClick(w)}
                      className={`flex-shrink-0 border-b-2 px-2.5 py-3 text-[13px] tabular-nums transition-colors ${isActive ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280] hover:text-[#111]'}`}
                    >
                      {w}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Seletor de matchup (faixa de placares) */}
            {week && matchups.length > 0 && (
              <div className="mb-2 overflow-hidden rounded-xl bg-white">
                <div ref={matchupsFrameRef} className="scroll-hide flex gap-1.5 overflow-x-auto p-2 [&>*:first-child]:ml-auto [&>*:last-child]:mr-auto">
                  {matchups.map((g, i) => {
                    const pf = parseNumber(g?.PF)
                    const pa = parseNumber(g?.PA)
                    // Negrito para quem venceu; em jogo (sem resultado), para quem está na frente
                    const result = String(g?.Result || '').trim().toUpperCase()
                    const teamAhead = result ? result === 'W' : pf >= pa
                    const oppAhead = result ? result === 'L' : pa >= pf
                    const pairOf = x => [String(x?.Team || '').trim(), String(x?.Opponent || '').trim()].sort().join('|')
                    const isSelected = selected === g || (selected && String(selected?.Season).trim() === season && String(selected?.Week).trim() === week && pairOf(selected) === pairOf(g))
                    const team = String(g?.Team || '').trim()
                    const opp = String(g?.Opponent || '').trim()
                    const gameType = String(g?.GameType || '').trim()
                    return (
                      <button
                        key={i}
                        ref={isSelected ? activeGameRef : null}
                        onClick={() => {
                          setSelected(g)
                          // Trocar de jogo mantém a aba (Head to head / Game recap); só sai de Rankings
                          setMobileTab(t => (t === 'rankings' ? 'matchup' : t))
                        }}
                        className={`min-w-[7.5rem] flex-shrink-0 whitespace-nowrap rounded-lg px-2.5 py-2 text-left transition-colors lg:min-w-[10.5rem] ${isSelected ? 'bg-white ring-2 ring-inset ring-[#02275F]' : 'bg-[#F4F5F7] hover:bg-[#ECEEF1]'}`}
                      >
                        {/* Fase do jogo em todos os cards (Regular Season, Playoffs, Final…) */}
                        <div className="mb-0.5 text-[10px] font-medium text-[#6B7280]">{!gameType || /^reg/i.test(gameType) ? 'Regular Season' : gameType}</div>
                        <div className="flex items-center gap-1.5 text-[13px] leading-5">
                          <TeamAvatar name={team} className="h-4 w-4 flex-shrink-0 rounded-sm" textClassName="text-[6px]" />
                          <span className={`flex-1 ${teamAhead ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}`} title={team}><span className="lg:hidden">{getTeamAbbr(team)}</span><span className="hidden lg:inline">{team}</span></span>
                          <span className={`tabular-nums ${teamAhead ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}`}>{pf > 0 ? pf.toFixed(2) : '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[13px] leading-5">
                          <TeamAvatar name={opp} className="h-4 w-4 flex-shrink-0 rounded-sm" textClassName="text-[6px]" />
                          <span className={`flex-1 ${oppAhead ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}`} title={opp}><span className="lg:hidden">{getTeamAbbr(opp)}</span><span className="hidden lg:inline">{opp}</span></span>
                          <span className={`tabular-nums ${oppAhead ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}`}>{pa > 0 ? pa.toFixed(2) : '—'}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Abas (só no mobile/tablet — no desktop os cards ficam nas laterais) */}
            {week && matchups.length > 0 && (
              <div className="mb-2 flex overflow-hidden rounded-xl bg-white lg:hidden">
                {[
                  { key: 'matchup', label: 'Matchup' },
                  h2hBody && { key: 'h2h', label: 'Head to head' },
                  (recap || weekRecapReady) && { key: 'recap', label: 'Recaps' },
                  powerCard && { key: 'rankings', label: 'Rankings' },
                ].filter(Boolean).map(tab => ({
                  ...tab,
                  active: activeMobileTab === tab.key,
                  onClick: () => {
                    setMobileTab(tab.key)
                    if (!selected && matchups[0]) setSelected(matchups[0])
                  },
                })).map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={tab.onClick}
                    className={`flex-1 whitespace-nowrap border-b-2 px-1.5 py-2.5 text-[12px] transition-colors sm:px-2 sm:text-[13px] ${tab.active ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280]'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Grid: rankings | matchup | head to head */}
            <div data-sticky-cols className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)_240px] lg:items-start lg:gap-4 xl:grid-cols-[320px_minmax(0,1fr)_300px] xl:gap-5">
              <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC] hidden lg:block">{powerCard}</aside>

              <div className="min-w-0">
                {/* Painéis no mobile/tablet */}
                <div className="lg:hidden">
                  {activeMobileTab === 'rankings' && powerCard}
                </div>

            {/* Detalhe do matchup selecionado */}
            {selected && (
              <div className={`mb-2 overflow-hidden rounded-xl bg-white ${activeMobileTab === 'rankings' ? 'hidden lg:block' : ''}`}>

                {/* No celular, cada aba mostra só a sua parte do card */}
                <div className={activeMobileTab === 'matchup' ? '' : 'hidden lg:block'}>
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
                    <div className="relative overflow-hidden px-3 py-3 text-white">
                      {/* Pôster dividido: time A no azul da marca, time B no vermelho (como o Rivalry) */}
                      <div className="absolute inset-0 bg-[#02275F]" />
                      <div className="absolute inset-0 bg-[#C8102E]" style={{ clipPath: 'polygon(56% 0, 100% 0, 100% 100%, 44% 100%)' }} />
                      <div className="relative">

                      {/* Badge do tipo de jogo */}
                      <div className="flex justify-center mb-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                          <span className="text-[12px] font-semibold text-white">
                            {season} · Week {week}{gameType && gameType !== 'Reg Season' ? ` · ${gameType}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Confronto principal */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">

                        {/* Time A */}
                        <div className="flex flex-col items-center gap-2">
                          <span className="rounded-full bg-white p-1 shadow-lg"><TeamAvatar name={teamName} className="h-10 w-10 rounded-lg" textClassName="text-lg" /></span>
                          <a href={`/teams?team=${encodeURIComponent(teamName)}`}
                            className={`text-center font-semibold leading-tight hover:underline ${teamBold ? 'text-white' : 'text-white/65'}`}
                            style={{ fontSize: 'clamp(14px, 2vw, 16px)' }}>
                            {teamName}
                          </a>
                          <div className={`font-bold leading-none ${isHistoricTeamScore(teamPF) ? 'text-[#E8C766]' : teamBold ? 'text-white' : 'text-white/55'} ${
                            ''
                            }`}
                            style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'clamp(32px, 6vw, 44px)' }}>
                            {teamPF.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-semibold text-white/75">
                              {teamRecord.w}–{teamRecord.l}
                            </span>
                            {teamStreak && (
                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${teamStreak.startsWith('W')
                              ? 'text-white bg-[#1E8E3E]'
                              : 'text-white bg-[#D01F2D]'
                              }`}>
                              {teamStreak}
                            </span>
                            )}
                          </div>
                          {/* Projeção do time (semana em andamento) */}
                          {teamProj != null && <div className="text-[11px] font-medium text-white/70">Proj {teamProj.toFixed(2)}</div>}
                          {isHistoricTeamScore(teamPF) && (
                            <div className="flex items-center gap-1 bg-[#F5C518] px-2 py-0.5">
                              <span className="text-xs">🚀</span>
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#111]">
                                {team200Ordinal.team ? `${ordinalLabel(team200Ordinal.team)} 200+` : '200+'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* VS central */}
                        <div className="flex flex-col items-center gap-1 self-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[13px] font-black italic text-[#111] shadow-lg">VS</div>
                          <div className="mt-1 text-[10px] font-bold text-white/85">
                            {Math.abs(teamPF - teamPA).toFixed(2)}
                          </div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">margin</div>
                          {undecided ? (
                            <div className={`mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${matchStatus === 'live' ? 'text-white' : 'text-white/70'}`}>
                              {matchStatus === 'live' && <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
                              {matchStatus === 'live' ? 'Live' : matchStatus === 'current' ? 'In progress' : 'Upcoming'}
                            </div>
                          ) : teamWon ? (
                            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#E8C766]">← WIN</div>
                          ) : (
                            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#E8C766]">WIN →</div>
                          )}
                        </div>

                        {/* Time B */}
                        <div className="flex flex-col items-center gap-2">
                          <span className="rounded-full bg-white p-1 shadow-lg"><TeamAvatar name={oppName} className="h-10 w-10 rounded-lg" textClassName="text-lg" /></span>
                          <a href={`/teams?team=${encodeURIComponent(oppName)}`}
                            className={`text-center font-semibold leading-tight hover:underline ${oppBold ? 'text-white' : 'text-white/65'}`}
                            style={{ fontSize: 'clamp(14px, 2vw, 16px)' }}>
                            {oppName}
                          </a>
                          <div className={`font-bold leading-none ${isHistoricTeamScore(teamPA) ? 'text-[#E8C766]' : oppBold ? 'text-white' : 'text-white/55'} ${
                            ''
                            }`}
                            style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'clamp(32px, 6vw, 44px)' }}>
                            {teamPA.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-semibold text-white/75">
                              {oppRecord.w}–{oppRecord.l}
                            </span>
                            {oppStreak && (
                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${oppStreak.startsWith('W')
                              ? 'text-white bg-[#1E8E3E]'
                              : 'text-white bg-[#D01F2D]'
                              }`}>
                              {oppStreak}
                            </span>
                            )}
                          </div>
                          {/* Projeção do time (semana em andamento) */}
                          {oppProj != null && <div className="text-[11px] font-medium text-white/70">Proj {oppProj.toFixed(2)}</div>}
                          {isHistoricTeamScore(teamPA) && (
                            <div className="flex items-center gap-1 bg-[#F5C518] px-2 py-0.5">
                              <span className="text-xs">🚀</span>
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#111]">
                                {team200Ordinal.opp ? `${ordinalLabel(team200Ordinal.opp)} 200+` : '200+'}
                              </span>
                            </div>
                          )}
                        </div>

                      </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Player of the game: o titular que mais pontuou no confronto, com a foto recortada */}
                {hasPlayerData && (() => {
                  const positions = getRosterPositions(season)
                  const pool = [
                    ...starters.map((p, i) => ({ p, pos: positions[i] || '', side: 'home' })),
                    ...oppStarters.map((p, i) => ({ p, pos: positions[i] || '', side: 'away' })),
                  ].filter(x => x.p?.name && getDisplayPlayerPos(x.p.name, x.pos, playerLookup) !== 'DEF')
                  const best = pool.sort((a, b) => (Number(b.p.pts) || 0) - (Number(a.p.pts) || 0))[0]
                  if (!best || !(Number(best.p.pts) > 0)) return null
                  const data = best.p.id ? { playerId: best.p.id } : getPlayerData(best.p.name, best.pos, playerLookup)
                  const team = best.side === 'home' ? String(selected?.Team || '').trim() : String(selected?.Opponent || '').trim()
                  const pos = getDisplayPlayerPos(best.p.name, best.pos, playerLookup)
                  return (
                    <button
                      type="button"
                      onClick={() => openPlayerProfile(best.p, best.pos, best.side)}
                      className="group relative flex w-full items-center gap-3 overflow-hidden border-b border-[#EEF0F2] bg-[#FFF8E5] px-3 text-left md:px-4"
                    >
                      <div className="relative -mb-px flex-shrink-0 self-end pt-2"><PlayerCutout sleeperId={data?.playerId} name={best.p.name} className="h-[76px]" /></div>
                      <div className="min-w-0 flex-1 py-2.5">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8D6A00]">⭐ Player of the game</div>
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-[15px] font-bold text-[#111] group-hover:text-[#D01F2D]">{getDisplayPlayerName(best.p.name, best.pos, playerLookup)}</span>
                          {pos && <UiPositionBadge position={pos} />}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[#6B7280]"><TeamAvatar name={team} className="h-4 w-4 rounded-sm" textClassName="text-[6px]" />{team}</div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-[28px] font-bold leading-none tabular-nums text-[#111]">{Number(best.p.pts).toFixed(2)}</div>
                        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8D6A00]">points</div>
                      </div>
                    </button>
                  )
                })()}

                {/* Batalha por posição: soma dos titulares de cada posição, quem levou a melhor */}
                {hasPlayerData && (() => {
                  const positions = getRosterPositions(season)
                  const groups = []
                  positions.forEach((pos, i) => {
                    const key = String(pos || '').toUpperCase().replace(/[^A-Z/]/g, '') || 'FLEX'
                    let g = groups.find(x => x.key === key)
                    if (!g) { g = { key, a: 0, b: 0 }; groups.push(g) }
                    g.a += Number(starters[i]?.pts) || 0
                    g.b += Number(oppStarters[i]?.pts) || 0
                  })
                  if (!groups.length) return null
                  const winsA = groups.filter(g => g.a > g.b).length
                  const winsB = groups.filter(g => g.b > g.a).length
                  return (
                    <div className="border-b border-[#EEF0F2] px-3 py-3 md:px-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-[15px] font-bold text-[#111]">Position battle</div>
                        <div className="flex items-center gap-1.5 text-[12px] font-semibold tabular-nums">
                          <span className="rounded bg-[#02275F] px-1.5 py-0.5 text-white">{winsA}</span>
                          <span className="text-[#9CA3AF]">–</span>
                          <span className="rounded bg-[#C8102E] px-1.5 py-0.5 text-white">{winsB}</span>
                        </div>
                      </div>
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}>
                        {groups.map(g => {
                          const total = g.a + g.b
                          const pctA = total > 0 ? (g.a / total) * 100 : 50
                          const aWon = g.a > g.b
                          const bWon = g.b > g.a
                          return (
                            <div key={g.key} className={`min-w-0 rounded-lg px-1 py-1.5 text-center ${aWon ? 'bg-[#EEF3FF]' : bWon ? 'bg-[#FDF2F3]' : 'bg-[#F4F5F7]'}`}>
                              <div className={`text-[10px] font-bold tracking-wide ${aWon ? 'text-[#02275F]' : bWon ? 'text-[#C8102E]' : 'text-[#6B7280]'}`}>{g.key}</div>
                              <div className="mx-auto mt-1 flex h-1.5 w-full max-w-[56px] gap-px overflow-hidden rounded-full">
                                <div className="bg-[#02275F]" style={{ width: `${pctA}%` }} />
                                <div className="flex-1 bg-[#C8102E]" />
                              </div>
                              <div className="mt-1 truncate text-[10px] tabular-nums text-[#3F4757]">
                                <span className={aWon ? 'font-bold text-[#02275F]' : ''}>{g.a.toFixed(0)}</span>
                                <span className="text-[#9CA3AF]">–</span>
                                <span className={bWon ? 'font-bold text-[#C8102E]' : ''}>{g.b.toFixed(0)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Starters */}
                {/* Ajustado: px-3 no mobile para economizar espaço nas bordas, px-8 no desktop */}
                {hasPlayerData && (
                <div className="px-2 md:px-4 py-2 border-b border-[#EEF0F2]">
                  <div className="mb-2 flex items-center justify-between gap-2">
                  <button type="button" onClick={() => setStartersOpen(o => !o)} aria-expanded={startersOpen} className="group flex items-center gap-1 text-[15px] font-bold text-[#111]">
                    Starters
                    <ChevronRight className={`h-4 w-4 text-[#9CA3AF] transition-transform group-hover:text-[#111] ${startersOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {/* Legenda do estado do jogo (só na semana em andamento) */}
                  {[...starters, ...oppStarters].some(p => p.gs) && (
                    <div className="flex items-center gap-2.5 text-[10px] text-[#6B7280]">
                      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#EAF7EE] ring-1 ring-inset ring-[#1E8E3E]/50" />Playing</span>
                      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-white ring-1 ring-[#E6E8EB]" />Final</span>
                      <span className="flex items-center gap-1 text-[#9CA3AF]"><span className="h-2.5 w-2.5 rounded-sm bg-white opacity-60 ring-1 ring-[#E6E8EB]" />Yet to play</span>
                    </div>
                  )}
                  </div>
                  <div className={startersOpen ? '' : 'hidden'}>

                  {/* Header colunas */}
                  <div className="grid grid-cols-[1fr_1px_1fr] gap-1 md:gap-2 mb-1">
                    <div className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#6B7280] pb-2 border-b border-[#EEF0F2] truncate">
                      {String(selected?.Team || '').trim()}
                    </div>
                    <div className="border-b border-[#EEF0F2]" />
                    <div className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#6B7280] pb-2 border-b border-[#EEF0F2] text-right truncate">
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
                          <div className="grid grid-cols-[1fr_1px_1fr] gap-1 md:gap-2 items-center border-b border-[#F1F2F4]">

                            {/* Time A — Nome → Pts */}
                            <div onClick={() => home && openPlayerProfile(home, pos, 'home')} role={home ? 'button' : undefined} tabIndex={home ? 0 : undefined} className={`px-1 md:px-2 py-1 min-w-0 cursor-pointer ${
                              home
                                ? (isHistoricPlayer(home)
                                  ? 'bg-[#FFF9E5]'
                                  : gameCellClass(home, 'bg-white', 'left'))
                                : 'opacity-0'
                              }`}>
                              <div style={{ display: 'grid', gridTemplateRows: 'auto auto', rowGap: 2 }} className="min-w-0">
                                <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                                  <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                    <PlayerRowAvatar name={home?.name} playerId={home?.id} pos={pos} playerLookup={playerLookup} size={32} />
                                  </div>
                                  <span className={`text-[20px] md:text-[22px] font-semibold flex items-center gap-1 flex-shrink-0 tabular-nums leading-none ${
                                    isHistoricPlayer(home)
                                      ? 'text-[#B8860B]'
                                      : ((home?.pts ?? 0) > 0 ? 'text-[#111]' : 'text-[#6B7280]')
                                    }`}>
                                    {isHistoricPlayer(home) && <span className="text-base md:text-lg">🔥</span>}
                                    <span className="flex flex-col items-end">
                                      <span>{home && !notPlayedYet(home) ? home.pts.toFixed(2) : '—'}</span>
                                      <PlayerGameLine p={home} />
                                    </span>
                                  </span>
                                </div>
                                <div className="min-w-0 flex items-center justify-between gap-1.5">
                                  <div className={`text-[13px] md:text-sm font-medium truncate leading-tight min-w-0 block ${
                                    isHistoricPlayer(home) ? 'text-[#8A6600]' : 'text-[#111]'
                                    }`}>
                                    {getDisplayPlayerName(home?.name, pos, playerLookup)}
                                    <PlayerGameState p={home} align="left" />
                                  </div>
                                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${getPosColor(getDisplayPlayerPos(home?.name, pos, playerLookup))} whitespace-nowrap flex-shrink-0`}>
                                    {getDisplayPlayerPos(home?.name, pos, playerLookup)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Divisória central */}
                            <div className="self-stretch w-px bg-[#EEF0F2]" />

                            {/* Time B — Pts → Nome (espelhado) */}
                            <div onClick={() => away && openPlayerProfile(away, pos, 'away')} role={away ? 'button' : undefined} tabIndex={away ? 0 : undefined} className={`px-1 md:px-2 py-1 min-w-0 cursor-pointer ${
                              away
                                ? (isHistoricPlayer(away)
                                  ? 'bg-[#FFF9E5]'
                                  : gameCellClass(away, 'bg-white', 'right'))
                                : 'opacity-0'
                              }`}>
                              <div style={{ display: 'grid', gridTemplateRows: 'auto auto', rowGap: 2 }} className="min-w-0">
                                <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                                  <span className={`text-[20px] md:text-[22px] font-semibold flex items-center gap-1 flex-shrink-0 tabular-nums leading-none ${
                                    isHistoricPlayer(away)
                                      ? 'text-[#B8860B]'
                                      : ((away?.pts ?? 0) > 0 ? 'text-[#111]' : 'text-[#6B7280]')
                                    }`}>
                                    <span className="flex flex-col items-start">
                                      <span>{away && !notPlayedYet(away) ? away.pts.toFixed(2) : '—'}</span>
                                      <PlayerGameLine p={away} />
                                    </span>
                                    {isHistoricPlayer(away) && <span className="text-base md:text-lg">🔥</span>}
                                  </span>
                                  <div className="flex items-center justify-end gap-1.5 min-w-0 overflow-hidden">
                                    <PlayerRowAvatar name={away?.name} playerId={away?.id} pos={pos} playerLookup={playerLookup} size={32} mirror />
                                  </div>
                                </div>
                                <div className="min-w-0 flex items-center justify-between gap-1.5 w-full">
                                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${getPosColor(getDisplayPlayerPos(away?.name, pos, playerLookup))} whitespace-nowrap flex-shrink-0`}>
                                    {getDisplayPlayerPos(away?.name, pos, playerLookup)}
                                  </span>
                                  <div className={`text-[13px] md:text-sm font-medium truncate leading-tight text-right min-w-0 block ${
                                    isHistoricPlayer(away) ? 'text-[#8A6600]' : 'text-[#111]'
                                    }`}>
                                    {getDisplayPlayerName(away?.name, pos, playerLookup)}
                                    <PlayerGameState p={away} align="right" />
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
                </div>
                )}

                {/* Bench */}
                {hasPlayerData && (bench.length > 0 || oppBench.length > 0) && (
                  <div className="px-2 md:px-4 py-2 border-b border-[#EEF0F2] bg-[#F4F5F7]">
                    {/* Banco de reservas com fundo cinza, para diferenciar dos titulares */}
                    <button type="button" onClick={() => setBenchOpen(o => !o)} aria-expanded={benchOpen} className="group mb-2 flex items-center gap-1 text-[15px] font-bold text-[#111]">
                    Bench
                    <ChevronRight className={`h-4 w-4 text-[#9CA3AF] transition-transform group-hover:text-[#111] ${benchOpen ? 'rotate-90' : ''}`} />
                  </button>
                  <div className={benchOpen ? '' : 'hidden'}>

                    <div className="grid grid-cols-[1fr_1px_1fr] gap-1 md:gap-2 mb-1">
                      <div className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#6B7280] pb-2 border-b border-[#EEF0F2] truncate">
                        {String(selected?.Team || '').trim()}
                      </div>
                      <div className="pb-2 border-b border-[#EEF0F2]" />
                      <div className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#6B7280] pb-2 border-b border-[#EEF0F2] text-right truncate">
                        {String(selected?.Opponent || '').trim()}
                      </div>
                    </div>

                    {Array.from({ length: Math.max(bench.length, oppBench.length) }).map((_, i) => {
                      const home = bench[i]
                      const away = oppBench[i]
                      return (
                        <React.Fragment key={i}>
                          <div className="grid grid-cols-[1fr_1px_1fr] gap-1 md:gap-2 items-center border-b border-[#E6E8EB]">

                            <div onClick={() => home && openPlayerProfile(home, getDisplayPlayerPos(home?.name, 'BN', playerLookup), 'home')} role={home ? 'button' : undefined} tabIndex={home ? 0 : undefined} className={`px-1 md:px-2 py-1 min-w-0 cursor-pointer ${
                              home
                                ? (isHistoricPlayer(home)
                                  ? 'bg-[#FFF9E5]'
                                  : gameCellClass(home, 'bg-[#F4F5F7]', 'left'))
                                : 'opacity-0'
                              }`}>
                              <div style={{ display: 'grid', gridTemplateRows: 'auto auto', rowGap: 2 }} className="min-w-0">
                                <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                                  <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                    <PlayerRowAvatar name={home?.name} playerId={home?.id} pos="BN" playerLookup={playerLookup} size={28} />
                                  </div>
                                  <span className={`text-[18px] md:text-[19px] font-semibold flex items-center gap-1 flex-shrink-0 tabular-nums leading-none ${
                                    isHistoricPlayer(home)
                                      ? 'text-[#B8860B]'
                                      : ((home?.pts ?? 0) > 0 ? 'text-[#3F4757]' : 'text-[#6B7280]')
                                    }`}>
                                    {isHistoricPlayer(home) && <span className="text-sm md:text-base">🔥</span>}
                                    <span className="flex flex-col items-end">
                                      <span>{home && !notPlayedYet(home) ? home.pts.toFixed(2) : '—'}</span>
                                      <PlayerGameLine p={home} />
                                    </span>
                                  </span>
                                </div>
                                <div className="min-w-0 flex items-center justify-between gap-1.5">
                                  <div className={`text-[12px] md:text-[13px] font-medium truncate leading-tight min-w-0 block ${
                                    isHistoricPlayer(home) ? 'text-[#8A6600]' : 'text-[#3F4757]'
                                    }`}>
                                    {getDisplayPlayerName(home?.name, 'BN', playerLookup)}
                                    <PlayerGameState p={home} align="left" />
                                  </div>
                                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${getPosColor(getDisplayPlayerPos(home?.name, 'BN', playerLookup))} whitespace-nowrap flex-shrink-0`}>
                                    {getDisplayPlayerPos(home?.name, 'BN', playerLookup)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Divisória central */}
                            <div className="self-stretch w-px bg-[#EEF0F2]" />

                            <div onClick={() => away && openPlayerProfile(away, getDisplayPlayerPos(away?.name, 'BN', playerLookup), 'away')} role={away ? 'button' : undefined} tabIndex={away ? 0 : undefined} className={`px-1 md:px-2 py-1 min-w-0 cursor-pointer ${
                              away
                                ? (isHistoricPlayer(away)
                                  ? 'bg-[#FFF9E5]'
                                  : gameCellClass(away, 'bg-[#F4F5F7]', 'right'))
                                : 'opacity-0'
                              }`}>
                              <div style={{ display: 'grid', gridTemplateRows: 'auto auto', rowGap: 2 }} className="min-w-0">
                                <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                                  <span className={`text-[18px] md:text-[19px] font-semibold flex items-center gap-1 flex-shrink-0 tabular-nums leading-none ${
                                    isHistoricPlayer(away)
                                      ? 'text-[#B8860B]'
                                      : ((away?.pts ?? 0) > 0 ? 'text-[#3F4757]' : 'text-[#6B7280]')
                                    }`}>
                                    <span className="flex flex-col items-start">
                                      <span>{away && !notPlayedYet(away) ? away.pts.toFixed(2) : '—'}</span>
                                      <PlayerGameLine p={away} />
                                    </span>
                                    {isHistoricPlayer(away) && <span className="text-sm md:text-base">🔥</span>}
                                  </span>
                                  <div className="flex items-center justify-end gap-1.5 min-w-0 overflow-hidden">
                                    <PlayerRowAvatar name={away?.name} playerId={away?.id} pos="BN" playerLookup={playerLookup} size={28} mirror />
                                  </div>
                                </div>
                                <div className="min-w-0 flex items-center justify-between gap-1.5 w-full">
                                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${getPosColor(getDisplayPlayerPos(away?.name, 'BN', playerLookup))} whitespace-nowrap flex-shrink-0`}>
                                    {getDisplayPlayerPos(away?.name, 'BN', playerLookup)}
                                  </span>
                                  <div className={`text-[12px] md:text-[13px] font-medium truncate leading-tight text-right min-w-0 block ${
                                    isHistoricPlayer(away) ? 'text-[#8A6600]' : 'text-[#3F4757]'
                                    }`}>
                                    {getDisplayPlayerName(away?.name, 'BN', playerLookup)}
                                    <PlayerGameState p={away} align="right" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                  </div>
                )}

                </div>

                {/* Head to head no celular, na própria aba (no desktop fica na coluna da direita) */}
                {h2hBody && activeMobileTab === 'h2h' && (
                  <div className="lg:hidden">
                    <div className="px-3 pt-4 text-[15px] font-bold text-[#111]">Head to head</div>
                    {h2hBody}
                  </div>
                )}

                {/* Game Recap ou Week Recap: o usuário escolhe qual ler */}
                {(recap || weekRecapReady) && (() => {
                  const showWeek = weekRecapReady && (recapView === 'week' || !recap)
                  return (
                    <div className={`px-3 py-4 md:px-4 ${activeMobileTab === 'recap' ? '' : 'hidden lg:block'}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#111]">
                          {showWeek ? `📊 Week ${week} Recap` : '📝 Game Recap'}
                        </div>
                        {recap && weekRecapReady && (
                          <div className="flex flex-shrink-0 rounded-lg bg-[#F1F2F4] p-0.5 text-[12px] font-medium">
                            {[['game', 'Game recap'], ['week', 'Week recap']].map(([key, label]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setRecapView(key)}
                                className={`rounded-md px-2.5 py-1 transition-colors ${(showWeek ? 'week' : 'game') === key ? 'bg-white text-[#111] shadow-sm' : 'text-[#6B7280] hover:text-[#111]'}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {showWeek ? weekRecapView : (
                        <div className="text-[#374151] text-[14px] leading-relaxed text-left">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => <h1 className="text-lg font-bold text-[#111] mb-3 mt-5 leading-tight">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-bold text-[#111] mb-2 mt-4 leading-tight">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-[15px] font-bold text-[#111] mb-2 mt-3">{children}</h3>,
                              p: ({ children }) => <p className="text-[#3F4757] mb-3 leading-relaxed text-left">{children}</p>,
                              strong: ({ children }) => <strong className="text-[#111] font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="text-[#D01F2D] not-italic font-bold">{children}</em>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-3 text-[#3F4757] space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-3 text-[#3F4757] space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="text-[#3F4757]">{children}</li>,
                              hr: () => <hr className="border-[#EEF0F2] my-4" />,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-[#D01F2D] pl-4 my-3 text-[#3F4757] italic">{children}</blockquote>,
                            }}
                          >
                            {recap}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )
                })()}

              </div>
            )}
              </div>

              <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC] hidden lg:block">{h2hCard}</aside>
            </div>
          </>
        )}

        {selectedPlayerProfile && (
          <SharedPlayerProfile
            key={`${selectedPlayerProfile.rawName}|${selectedPlayerProfile.team}`}
            rawName={selectedPlayerProfile.rawName}
            displayName={selectedPlayerProfile.displayName}
            position={selectedPlayerProfile.position}
            playerId={selectedPlayerProfile.playerId || getPlayerData(selectedPlayerProfile.rawName, selectedPlayerProfile.position, playerLookup)?.playerId || getPlayerId(selectedPlayerProfile.rawName, playerLookup)}
            games={games.filter(g => g?.Source !== 'sleeper')}
            liveGame={(() => {
              // Semana em andamento (Sleeper): pontos e projeção atuais do jogador,
              // que acompanham as atualizações automáticas da página
              if (selected?.Source !== 'sleeper') return null
              const isHome = selectedPlayerProfile.team === String(selected?.Team || '').trim()
              const lists = isHome ? [[starters, 'Starter'], [bench, 'Bench']] : [[oppStarters, 'Starter'], [oppBench, 'Bench']]
              for (const [list, status] of lists) {
                const p = list.find(x => x.name === selectedPlayerProfile.rawName)
                if (p) return { pts: p.pts, proj: p.proj, status }
              }
              return null
            })()}
            initialTeams={[selectedPlayerProfile.team]}
            initialSeasons={selectedPlayerProfile.season ? [String(selectedPlayerProfile.season)] : undefined}
            matchup={{
              season: selectedPlayerProfile.season,
              week: selectedPlayerProfile.week,
              team: selectedPlayerProfile.team,
              opponent: selectedPlayerProfile.opponent,
            }}
            onClose={closePlayerProfile}
          />
        )}

      </section>
      <SiteFooter />
    </main>
  )
}

export default function MatchupsPage() {
  return (
    <Suspense
      fallback={<PageShell loading />}
    >
      <MatchupsPageContent />
    </Suspense>
  )
}