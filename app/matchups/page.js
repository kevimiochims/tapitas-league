'use client'

import Image from 'next/image'
import { Suspense, useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Swords, Activity } from 'lucide-react'
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
    return <img src={avatarSrc} alt={name} className={`${className} object-cover`} />
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

function MatchupsPageContent() {
  const [games, setGames] = useState([])
  const [playerLookup, setPlayerLookup] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState('')
  const [week, setWeek] = useState('')
  const [selected, setSelected] = useState(null)

  const seasonsRef = useRef(null)
  const weeksRef = useRef(null)
  const activeSeasonRef = useRef(null)
  const activeWeekRef = useRef(null)
  const activeGameRef = useRef(null)
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

  // Efeito para rolar até o Jogo Ativo (Matchup)
  useEffect(() => {
    // Ajuste o termo "selected" se a sua variável de estado do jogo ativo tiver outro nome
    if (selected && activeGameRef.current) {
      const timer = setTimeout(() => {
        activeGameRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 120); // 120ms para dar uma leve fração de tempo a mais pro layout assíncrono se ajustar
      return () => clearTimeout(timer);
    }
  }, [selected]); // Roda sempre que o jogo selecionado mudar


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
                  once: false,
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
                  once: false,
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
                <div className={`scroll-hide flex gap-4 overflow-x-auto p-6 ${matchups.length <= 4 ? 'justify-center' : 'justify-start'}`}>
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
                            <div className={`px-2 md:px-3 py-2 min-w-0 ${
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
                            <div className={`px-2 md:px-3 py-2 min-w-0 ${
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

                            <div className={`px-2 md:px-3 py-2 min-w-0 ${
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

                            <div className={`px-2 md:px-3 py-2 min-w-0 ${
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