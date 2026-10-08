'use client'

import Image from 'next/image'
import { loadNewsPosts } from './lib/newsPosts'
import {
  Shield, Calendar, Trophy, Flame, ChevronRight, ChevronLeft,
  Swords, Stars, Activity, Radar, Target, Medal, Clock3, ScrollText,
  TrendingUp, Landmark, Newspaper, Laugh, FileText, BarChart2,
  Users, BookOpen, Zap, TrendingDown, Minus, Hash, ChevronDown, Star,
} from 'lucide-react'
import { useEffect, useMemo, memo, useState, useRef } from 'react'
import PlayerCutout from './components/PlayerCutout'
import { useDrawer } from './context/DrawerContext'
import { useTeamFocus } from './context/TeamFocus'
import Link from 'next/link'
import SummaryDrawer from './components/SummaryDrawer'
import PlayerProfileModal from './components/PlayerProfileModal'
import ScoreStrip from './components/nfl/ScoreStrip'
import { buildFactsNameIndex, resolveFactsName } from './lib/factsNames'
import RosterAlertsCard from './components/nfl/RosterAlertsCard'
import TrendingCard from './components/nfl/TrendingCard'
import LeagueNewsCard from './components/nfl/LeagueNewsCard'
import { BrandBackdrop, Podium, SummaryButton, Segmented, VersusPoster, TaleOfTape, PageShell, CardShell, StatRow, FilterPill, Tag, TeamLogo, LoadingState, Pager, usePager, PositionBadge as UiPositionBadge } from './components/ui'
import { useNameOwners } from './lib/useNameOwners'


// Same Sleeper player source used by the Teams Player Profile.
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


function normalizeString(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  const cleaned = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')

  const parsed = Number(cleaned)

  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeTeam(team, index) {
  return {
    team: (team && (team.Team || team.team || team.Name)) || `Franchise ${index + 1}`,
    wins: parseNumber(team?.W || team?.Wins || team?.wins || 0),
    losses: parseNumber(team?.L || team?.Losses || team?.losses || 0),
    pf: parseNumber(team?.PF || team?.Points || team?.points_for || 0),
    rsW: parseNumber(team?.RS_W || 0),
    rsL: parseNumber(team?.RS_L || 0),
    rsPF: parseNumber(team?.RS_PF || 0),
    poW: parseNumber(team?.PO_W || 0),
    poL: parseNumber(team?.PO_L || 0),
    poPF: parseNumber(team?.PO_PF || 0),
    winPct: parseNumber(team?.['W%'] || 0),
    rsWinPct: parseNumber(
      team?.['RS_W%'] ?? team?.RS_W_pct ?? team?.['RS_W%'.toString()] ?? 0
    ),
    poWinPct: parseNumber(
      team?.['PO_W%'] ?? team?.PO_W_pct ?? team?.['PO_W%'.toString()] ?? 0
    ),
    wStreakRS: parseNumber(team?.['W Streak RS'] || 0),
    wStreakTotal: parseNumber(team?.['W Streak Total'] || 0),
    lStreakRS: parseNumber(team?.['L Streak RS'] || 0),
    lStreakTotal: parseNumber(team?.['L Streak Total'] || 0),
    playoffApps: parseNumber(team?.['Playoff Apps'] || 0),
    finals: parseNumber(team?.Finals || 0),
    titles: parseNumber(team?.Titles || 0),
  }
}

async function safeSheetFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      console.error('safeSheetFetch non-ok:', url, response.status)
      return []
    }

    const json = await response.json()

    if (!Array.isArray(json)) {
      console.error('safeSheetFetch non-array:', url, json)
      return []
    }

    return json
  } catch (error) {
    console.error('safeSheetFetch error:', url, error)
    return []
  }
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

function getTeamAvatar(name) {
  return TEAM_AVATARS[normalizeString(name)] || null
}

function normalizePlayerKey(value) {
  return normalizeString(value)
    .replace(/\./g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPlayerLookup(rows) {
  const lookup = new Map()

  rows.forEach((row) => {
    const playerId = String(row?.player_id || '').trim()
    const fullName = String(row?.full_name || '').trim()
    const shortName = String(row?.name || '').trim()
    const firstName = String(row?.first_name || '').trim()
    const lastName = String(row?.last_name || '').trim()
    const team = String(row?.team || '').trim()
    const pos = String(row?.position || row?.pos || '').trim().toUpperCase()

    if (!playerId) return

    const entry = {
      playerId,
      team,
      pos,
      fullName,
      shortName,
    }

      ;[fullName, `${firstName} ${lastName}`, row?.search_full_name].forEach((value) => {
        const key = normalizePlayerKey(value)
        if (!key || lookup.has(key)) return
        lookup.set(key, entry)
      })
  })

  return lookup
}

function getPlayerPosition(name, playerLookup) {
  const data = getPlayerDataByFullName(name, playerLookup)
  return String(data?.pos || '').trim().toUpperCase()
}

function getPlayerDataByFullName(name, playerLookup) {
  if (!playerLookup || !name) return null
  const key = normalizePlayerKey(name)
  if (!key) return null
  return playerLookup.get(key) || null
}



function getNFLTeamLogo(nameOrAbbr) {
  if (!nameOrAbbr || nameOrAbbr === '--') return null
  const raw = String(nameOrAbbr).toLowerCase().trim()
  const mapped = NFL_TEAM_NAME_MAP[raw]
  if (mapped) return `https://a.espncdn.com/i/teamlogos/nfl/500/${mapped}.png`
  const abbr = raw === 'was' ? 'wsh' : raw
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`
}


function normalizeTeamName(value) {
  return normalizeString(value)
    .replace(/[^a-z0-9]/g, '')
}

function isDoubleWeek(game) {
  const week = String(game?.Week ?? game?.week ?? '').trim()
  return week.includes('-') || week.includes('&')
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


function getPositionBadgeClasses(position) {
  const pos = String(position || "").trim().toUpperCase()
  const classes = {
    QB: "border-[#D01F2D] bg-[#FDF1F2] text-[#D01F2D]",
    RB: "border-[#1E8E3E] bg-[#F2F8F3] text-[#1E8E3E]",
    WR: "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]",
    TE: "border-[#B8860B] bg-[#FBF7EA] text-[#8A6500]",
    K: "border-[#7C3AED] bg-[#F5F3FF] text-[#7C3AED]",
    DEF: "border-[#16274F] bg-[#EEF3FF] text-[#16274F]"
  }
  return classes[pos] || "border-[#16274F]/30 bg-white text-[#16274F]"
}

function shortName(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.length > 18 ? raw.replace(/\s+Squad$/i, '').replace(/\s+Settlers$/i, '') : raw
}

function TeamAvatar({ team, size = 'md' }) {
  const avatar = getTeamAvatar(team)
  const sizeMap = { xs: 'h-5 w-5', sm: 'h-8 w-8 sm:h-9 sm:w-9', md: 'h-10 w-10 sm:h-11 sm:w-11' }
  if (avatar) return <img src={avatar} alt={team || ''} className={`${sizeMap[size] || sizeMap.md} flex-shrink-0 object-cover`} />
  return <div className={`${sizeMap[size] || sizeMap.md} flex-shrink-0 rounded-full border border-[#16274F]/15 bg-[#F7F6F2]`} />
}

function canonicalMatchupHref(game, allGames) {
  const season = String(game?.Season ?? game?.season ?? '').trim()
  const week = String(game?.Week ?? game?.week ?? '').trim()
  const gameType = String(game?.gameType ?? game?.GameType ?? game?.game_type ?? '').trim()
  const gameTeam = String(game?.Team ?? game?.team ?? '').trim()
  const gameOpp = String(game?.Opponent ?? game?.opponent ?? '').trim()

  const normalize = value => String(value || '').trim().toLowerCase()

  // GAME_FACTS_ALL has mirrored player rows. We must first identify the
  // actual matchup by the two teams, then use the FIRST row of that matchup
  // as the canonical target. Looking only at season/week would incorrectly
  // send every Game Log entry from that week to the first matchup of the week.
  const samePair = (row) => {
    const rowTeam = String(row?.Team ?? row?.team ?? '').trim()
    const rowOpp = String(row?.Opponent ?? row?.opponent ?? '').trim()
    if (!rowTeam || !rowOpp) return false

    const direct =
      normalize(rowTeam) === normalize(gameTeam) &&
      normalize(rowOpp) === normalize(gameOpp)

    const mirrored =
      normalize(rowTeam) === normalize(gameOpp) &&
      normalize(rowOpp) === normalize(gameTeam)

    return direct || mirrored
  }

  const first = (Array.isArray(allGames) ? allGames : []).find(row => {
    if (String(row?.Season ?? row?.season ?? '').trim() !== season) return false
    if (String(row?.Week ?? row?.week ?? '').trim() !== week) return false
    if (gameType && String(row?.gameType ?? row?.GameType ?? row?.game_type ?? '').trim() !== gameType) return false
    return samePair(row)
  }) || game

  const team = String(first?.Team ?? first?.team ?? '').trim()
  const opp = String(first?.Opponent ?? first?.opponent ?? '').trim()

  return `/matchups?season=${encodeURIComponent(season)}&week=${encodeURIComponent(week)}&team=${encodeURIComponent(team)}&opp=${encodeURIComponent(opp)}`
}

function DraftPickTile({ pick, playerLookup, onOpenPlayer }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const data = getPlayerDataByFullName(pick.player, playerLookup)
  const playerId = data?.playerId
  const displayName = data?.shortName || pick.player
  const isDefense = String(pick?.position || '').toUpperCase() === 'DEF'
  const photoSrc = !photoFailed
    ? (isDefense ? getNFLTeamLogo(pick.player) : (playerId ? `https://sleepercdn.com/content/nfl/players/${playerId}.jpg` : null))
    : null

  useEffect(() => { setPhotoFailed(false) }, [pick.player, playerId, pick.position])

  return (
    <div className="w-[104px] min-w-0 flex-shrink-0 text-center lg:w-auto">
      <button type="button" onClick={() => onOpenPlayer?.(pick, data)} className="group block w-full focus:outline-none" aria-label={`Open player profile for ${displayName}`}>
        <div className="relative mx-auto h-[72px] w-[72px] lg:h-[54px] lg:w-[54px]">
          <div className="h-full w-full overflow-hidden rounded-full bg-[#F4F5F7] ring-1 ring-[#E6E8EB]">
            {photoSrc ? (
              <img src={photoSrc} alt={displayName} className={`h-full w-full ${isDefense ? 'object-contain p-2' : 'object-cover'}`} onError={() => setPhotoFailed(true)} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#16274F] text-[15px] font-semibold text-white">
                {String(displayName).split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?'}
              </div>
            )}
          </div>
          <span className="absolute -left-1 -top-1 rounded-full bg-[#111] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">#{pick.pick}</span>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2"><UiPositionBadge position={pick.position} /></span>
        </div>
        <div className="mt-2.5 truncate text-[13px] font-semibold text-[#111] group-hover:text-[#D01F2D] lg:text-[12px]">{displayName}</div>
      </button>
      <a href={`/teams?team=${encodeURIComponent(pick.team)}`} className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-[#6B7280] hover:text-[#111]">
        <TeamLogo name={pick.team} size={14} />
        <span className="truncate">{pick.team}</span>
      </a>
    </div>
  )
}


function PerformerTile({ rank, performer, data, onOpen }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const pos = String(data?.pos || '').toUpperCase()
  const isDefense = pos === 'DEF'
  const photoSrc = !photoFailed
    ? (isDefense ? getNFLTeamLogo(performer.name) : (data?.playerId ? `https://sleepercdn.com/content/nfl/players/${data.playerId}.jpg` : null))
    : null
  const initials = String(performer.name).split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()

  // O melhor da semana ganha destaque: azul da marca e a foto recortada grande
  if (rank === 1 && !isDefense) return (
    <button type="button" onClick={onOpen} className="group relative w-[250px] flex-shrink-0 overflow-hidden rounded-lg px-3 pb-2.5 pt-3 text-left text-white">
      <BrandBackdrop />
      <div className="absolute -right-3 bottom-0"><PlayerCutout sleeperId={data?.playerId} name={performer.name} className="h-[136px]" /></div>
      <div className="relative max-w-[130px]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E8C766]">Player of the week</div>
        <div className="mt-2 text-[30px] font-bold leading-none tabular-nums">{performer.pts.toFixed(1)}</div>
        <div className="mt-1.5 flex items-center gap-1">
          <span className="truncate text-[13px] font-semibold">{data?.shortName || performer.name}</span>
          {pos && <UiPositionBadge position={pos} />}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/75">
          <span className="rounded-full bg-white p-px"><TeamLogo name={performer.team} size={14} /></span>
          <span className="truncate">{performer.team}</span>
        </div>
      </div>
    </button>
  )

  return (
    <button type="button" onClick={onOpen} className="group w-[112px] flex-shrink-0 rounded-lg bg-[#F4F5F7] px-2 pb-2.5 pt-3 text-center transition-colors hover:bg-[#ECEEF1]">
      <div className="relative mx-auto h-[64px] w-[64px]">
        <div className="h-full w-full overflow-hidden rounded-full bg-white ring-1 ring-[#E6E8EB]">
          {photoSrc
            ? <img src={photoSrc} alt={performer.name} className={`h-full w-full ${isDefense ? 'object-contain p-2' : 'object-cover'}`} onError={() => setPhotoFailed(true)} />
            : <div className="flex h-full w-full items-center justify-center bg-[#16274F] text-[14px] font-semibold text-white">{initials}</div>}
        </div>
        <span className={`absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${rank === 1 ? 'bg-[#F5C518] text-[#111]' : 'bg-[#111] text-white'}`}>{rank}</span>
      </div>
      <div className="mt-2 text-[20px] font-bold leading-none tabular-nums text-[#111]">{performer.pts.toFixed(1)}</div>
      <div className="mt-1 flex items-center justify-center gap-1">
        <span className="truncate text-[12px] font-semibold text-[#111] group-hover:text-[#D01F2D]">{data?.shortName || performer.name}</span>
        {pos && <UiPositionBadge position={pos} />}
      </div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-[#6B7280]">
        <TeamLogo name={performer.team} size={14} />
        <span className="truncate">{performer.team}</span>
      </div>
    </button>
  )
}

function buildSeasonRanges(years) {
  if (!years || years.length === 0) return ''

  const sorted = [...years].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0]
  let end = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      ranges.push(start === end ? `'${String(start).slice(2)}` : `'${String(start).slice(2)}-'${String(end).slice(2)}`)
      start = sorted[i]
      end = sorted[i]
    }
  }

  ranges.push(start === end ? `'${String(start).slice(2)}` : `'${String(start).slice(2)}-'${String(end).slice(2)}`)

  return ranges.join(' • ')
}

const SORT_OPTIONS = [
  {
    label: 'Wins',
    subs: [
      { label: 'Total', key: 'W', order: 'desc' },
      { label: 'Reg Season', key: 'RS_W', order: 'desc' },
      { label: 'Playoffs', key: 'PO_W', order: 'desc' },
    ],
  },
  {
    label: 'Losses',
    subs: [
      { label: 'Total', key: 'L', order: 'desc' },
      { label: 'Reg Season', key: 'RS_L', order: 'desc' },
      { label: 'Playoffs', key: 'PO_L', order: 'desc' },
    ],
  },
  {
    label: 'Win %',
    subs: [
      { label: 'Total', key: 'W%', order: 'desc' },
      { label: 'Reg Season', key: 'RS_W%', order: 'desc' },
      { label: 'Playoffs', key: 'PO_W%', order: 'desc' },
    ],
  },
  {
    label: 'Points',
    subs: [
      { label: 'All-Time', key: 'PF', order: 'desc' },
      { label: 'Reg Season', key: 'RS_PF', order: 'desc' },
      { label: 'Playoffs', key: 'PO_PF', order: 'desc' },
    ],
  },
  {
    label: 'Win Streak',
    subs: [
      { label: 'Reg Season', key: 'W Streak RS', order: 'desc' },
      { label: 'Total', key: 'W Streak Total', order: 'desc' },
    ],
  },
  {
    label: 'Loss Streak',
    subs: [
      { label: 'Reg Season', key: 'L Streak RS', order: 'desc' },
      { label: 'Total', key: 'L Streak Total', order: 'desc' },
    ],
  },
  {
    label: 'Playoffs Appearances',
    subs: [
      { label: 'Appearances', key: 'Playoff Apps', order: 'desc' },
    ],
  },
  {
    label: 'Finals Appearances',
    subs: [
      { label: 'Appearances', key: 'Finals', order: 'desc' },
    ],
  },
  {
    label: 'Championships',
    subs: [
      { label: 'Titles', key: 'Titles', order: 'desc' },
    ],
  },
]

function buildStreakMap(gamesJson, teamsJson) {
  const byTeam = {}

  // Temporada mais recente do banco
  let maxSeason = 0
  gamesJson.forEach((game) => {
    const season = parseNumber(game?.Season || game?.season || 0)
    if (season > maxSeason) maxSeason = season
  })

  // Monta lookup do melhor streak por time vindo do TEAM_ALL_TIME
  const bestStreakByTeam = {}
  teamsJson.forEach((row) => {
    const team = String(row?.Team || row?.team || '').trim()
    if (!team) return
    bestStreakByTeam[team] = {
      wStreakRS: parseNumber(String(row?.['W Streak RS'] || '0').replace(/[WL]/i, '')),
      wStreakTotal: parseNumber(String(row?.['W Streak Total'] || '0').replace(/[WL]/i, '')),
      lStreakRS: parseNumber(String(row?.['L Streak RS'] || '0').replace(/[WL]/i, '')),
      lStreakTotal: parseNumber(String(row?.['L Streak Total'] || '0').replace(/[WL]/i, '')),
    }
  })

  // Agrupa jogos por time ordenado cronologicamente
  gamesJson.forEach((game) => {
    const team = String(game?.Team || game?.team || '').trim()
    if (!team) return

    const week = parseNumber(game?.Week || game?.week || 0)
    const season = parseNumber(game?.Season || game?.season || 0)
    const streakRS = parseNumber(game?.Streak || 0)
    const streakTotal = parseNumber(game?.Streak_Total || 0)

    if (!byTeam[team]) byTeam[team] = []
    byTeam[team].push({ week, season, streakRS, streakTotal })
  })

  const result = {}

  Object.entries(byTeam).forEach(([team, games]) => {
    const sorted = games.sort((a, b) =>
      a.season !== b.season ? a.season - b.season : a.week - b.week
    )

    const best = bestStreakByTeam[team]
    if (!best) return

    const findBestStreak = (key, bestVal, isWin) => {
      if (!bestVal || bestVal === 0) return null

      // O valor que buscamos: positivo pra win, negativo pra loss
      const targetVal = isWin ? bestVal : -bestVal

      // Encontra o índice onde o streak atingiu o valor máximo pela PRIMEIRA vez
      let peakIndex = -1
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i][key] === targetVal) {
          peakIndex = i
          break
        }
      }

      if (peakIndex === -1) return null

      const endGame = sorted[peakIndex]

      // Percorre para trás a partir do peak até achar o 1 ou -1
      const startTarget = isWin ? 1 : -1
      let startIndex = peakIndex
      for (let i = peakIndex; i >= 0; i--) {
        if (sorted[i][key] === startTarget) {
          startIndex = i
          break
        }
      }

      const startGame = sorted[startIndex]

      // Streak é ativo se o último jogo do time está na temporada mais recente
      const lastGame = sorted[sorted.length - 1]
      const isActive = lastGame.season === maxSeason && Math.abs(sorted[sorted.length - 1][key]) >= bestVal

      return {
        startWeek: startGame.week,
        startSeason: startGame.season,
        endWeek: endGame.week,
        endSeason: endGame.season,
        active: isActive,
      }
    }

    result[team] = {
      streakRS: findBestStreak('streakRS', best.wStreakRS, true),
      streakTotal: findBestStreak('streakTotal', best.wStreakTotal, true),
      lStreakRS: findBestStreak('streakRS', best.lStreakRS, false),
      lStreakTotal: findBestStreak('streakTotal', best.lStreakTotal, false),
    }
  })

  return result
}

// ── NEW CONSTANTS ─────────────────────────────────────────────────────────────

const BASE_URL_HOME = '/api/sheet'

const CATEGORY_STYLE = {
  'Meme': { color: 'text-yellow-400', border: 'border-yellow-400/20', bg: 'bg-yellow-400/10', icon: Laugh },
  'Recap': { color: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/10', icon: FileText },
  'Notícia': { color: 'text-emerald-400', border: 'border-emerald-400/20', bg: 'bg-emerald-400/10', icon: Newspaper },
}

function formatDate(dateStr) {
  try { return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return dateStr }
}

// Short display name for Records card — first meaningful word, not "I" or "The"
function shortTeamName(name) {
  if (!name) return '—'
  // Skip articles AND single-letter words (like "I")
  const skip = new Set(['i', 'the', 'a', 'an', 'am', 'os', 'as', 'o', 'de', 'do', 'da'])
  const words = name.split(' ').filter(Boolean)
  const first = words.find(w => w.length > 2 && !skip.has(w.toLowerCase())) || words[0]
  return first || name
}

// Returns top N teams for a key, handling ties

// Vagas de playoff na liga (linha tracejada na classificação da Home)
const PLAYOFF_SPOTS = 6

const QUICK_NAV = [
  { label: 'Stats', href: '/stats', icon: BarChart2, accent: '#16274F' },
  { label: 'Matchups', href: '/matchups', icon: Swords, accent: '#D01F2D' },
  { label: 'Power Rankings', href: '/powerrankings', icon: TrendingUp, accent: '#1E8E3E' },
  { label: 'Records', href: '/records', icon: Zap, accent: '#B8860B' },
  { label: 'Rivalries', href: '/rivalries', icon: Stars, accent: '#16274F' },
  { label: 'Teams', href: '/teams', icon: Users, accent: '#D01F2D' },
  { label: 'Draft', href: '/draft', icon: ScrollText, accent: '#1E8E3E' },
  { label: 'History', href: '/history', icon: BookOpen, accent: '#B8860B' },
  { label: 'News', href: '/news', icon: Newspaper, accent: '#16274F' },
]

const POS_COLORS = {
  QB: 'text-white border-red-500 bg-red-500',
  RB: 'text-white border-emerald-500 bg-emerald-500',
  WR: 'text-white border-blue-500 bg-blue-500',
  TE: 'text-white border-yellow-500 bg-yellow-500',
  K: 'text-white border-violet-500 bg-violet-500',
  DEF: 'text-white border-orange-500 bg-orange-500',
  BN: 'text-white border-slate-600 bg-slate-600',
}

function parseBiggestWin(value) {
  if (!value || String(value) === '—') return null
  const text = String(value)
  const scoreMatch = text.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/)
  const marginMatch = text.match(/\(\+?(\d+(?:\.\d+)?)\)/)
  const weekMatch = text.match(/Week\s*([\d][\d\-\/]*)/i)
  const yearMatch = text.match(/(20\d{2})/)
  return {
    scoreA: scoreMatch ? scoreMatch[1] : '0',
    scoreB: scoreMatch ? scoreMatch[2] : '0',
    margin: marginMatch ? marginMatch[1] : null,
    label: [weekMatch ? `Week ${weekMatch[1]}` : '', yearMatch ? yearMatch[1] : ''].filter(Boolean).join(' · '),
  }
}

function parseBestStreak(value) {
  if (!value || String(value) === '—') return null
  const text = String(value).trim()
  const countMatch = text.match(/([WL])(\d+)/i)
  const rangeMatch = text.match(/\(([^)]+)\)/)
  if (!countMatch) return { raw: text }
  let start = '', end = ''
  if (rangeMatch) {
    const parts = rangeMatch[1].split(/\s*(?:→|->|⇒)\s*/)
    if (parts.length >= 2) { start = parts[0].trim(); end = parts[1].trim() }
    else { start = rangeMatch[1].trim() }
  }
  return { result: countMatch[1].toUpperCase(), count: countMatch[2], start, end }
}

export default function TapitasLeagueHomepage() {
  // Dono de cada nome abreviado na liga (separa homônimos no perfil)
  const nameOwners = useNameOwners()
  const [rawData, setRawData] = useState([])
  const [leagueLoading, setLeagueLoading] = useState(true)
  const [h2hData, setH2hData] = useState([])
  const [selectedTeamA, setSelectedTeamA] = useState('')
  const [selectedTeamB, setSelectedTeamB] = useState('')
  const [sortCategory, setSortCategory] = useState('Win Streak')
  const [sortSub, setSortSub] = useState('Total')
  const [standingsPage, setStandingsPage] = useState(0)
  const [gameFactsData, setGameFactsData] = useState([])
  const [streakMap, setStreakMap] = useState({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [seasonSummary, setSeasonSummary] = useState(null)
  const [selectedSeason, setSelectedSeason] = useState('2025')
  const [currentSlide, setCurrentSlide] = useState(0)

  // ── NEW STATE ──────────────────────────────────────────────────────────────
  const [newsPage, setNewsPage] = useState(0)
  const newsTouchStartX = useRef(null)
  const [newsPosts, setNewsPosts] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [prData, setPrData] = useState([])
  const [prLoading, setPrLoading] = useState(true)
  const [currentStandings, setCurrentStandings] = useState([])
  const [currentSeason, setCurrentSeason] = useState('')
  const [currentWeekLabel, setCurrentWeekLabel] = useState('')
  const [draftPicks, setDraftPicks] = useState([])   // last draft picks
  const [draftSeason, setDraftSeason] = useState('')
  const [playerLookup, setPlayerLookup] = useState(new Map())
  const [selectedDraftPlayer, setSelectedDraftPlayer] = useState(null)
  const closeDraftPlayer = () => setSelectedDraftPlayer(null)
  const [selectedPerformer, setSelectedPerformer] = useState(null)
  const [mobileTableTab, setMobileTableTab] = useState('pr')
  const closePerformer = () => setSelectedPerformer(null)
  // Jogador aberto a partir dos cards da NFL (lesões, trending)
  const [selectedNflPlayer, setSelectedNflPlayer] = useState(null)
  const openNflPlayer = p => p && setSelectedNflPlayer(p)
  const [selectedDraftRound, setSelectedDraftRound] = useState(1)
  const [selectedMatchupKey, setSelectedMatchupKey] = useState('')
  const [prPage, setPrPage] = useState(0)
  const draftScrollRef = useRef(null)
  const touchStartX = useRef(null);
  const totalSlides = 3;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    const threshold = 50; // distância mínima do swipe

    if (diff > threshold) {
      // swipe para esquerda -> próximo slide
      setHeroAutoplay(false)
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }

    if (diff < -threshold) {
      // swipe para direita -> slide anterior
      setHeroAutoplay(false)
      setCurrentSlide(
        (prev) => (prev - 1 + totalSlides) % totalSlides
      );
    }

    touchStartX.current = null;
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % 3);
  };

  // ===== NEWS =====

  const featuredNewsPosts = useMemo(() => {
    // 1 destaque + 4 miniaturas (o destaque ocupa a mesma altura das 4)
    return (newsPosts || []).slice(0, 5)
  }, [newsPosts])

  const newsTotalPages = featuredNewsPosts.length

  useEffect(() => {
    setNewsPage(0)
  }, [newsPosts])

  function goNewsPage(step) {
    setNewsPage((current) => Math.max(0, Math.min(newsTotalPages - 1, current + step)))
  }

  function handleNewsTouchStart(e) {
    newsTouchStartX.current = e.touches[0]?.clientX ?? null
  }

  function handleNewsTouchEnd(e) {
    if (newsTouchStartX.current == null) return

    const endX = e.changedTouches[0]?.clientX ?? null
    if (endX == null) return

    const deltaX = endX - newsTouchStartX.current
    const threshold = 45

    if (deltaX <= -threshold && newsPage < newsTotalPages - 1) {
      setNewsPage((p) => Math.min(newsTotalPages - 1, p + 1))
    } else if (deltaX >= threshold && newsPage > 0) {
      setNewsPage((p) => Math.max(0, p - 1))
    }

    newsTouchStartX.current = null
  }

  // =============

  // Hero: passa sozinho a cada 10s por uma volta só (mostra os 3 slides) e para
  // no primeiro. Se o usuário trocar de slide (bolinhas ou arrastando), para também.
  const heroAutoSteps = useRef(0)
  const [heroAutoplay, setHeroAutoplay] = useState(true)
  useEffect(() => {
    if (!heroAutoplay) return
    const timer = setTimeout(() => {
      heroAutoSteps.current += 1
      nextSlide()
      if (heroAutoSteps.current >= totalSlides) setHeroAutoplay(false)
    }, 10000);

    return () => clearTimeout(timer);
  }, [currentSlide, heroAutoplay]);

  const [leagueStats, setLeagueStats] = useState({
    franchises: 0,
    seasons: 0,
    seasonRange: '',
    allSeasons: [],  // <-- adicione
    games: 0,
    highestScore: 0,
    highestScoreTeam: '',
  })

  // ===== STANDINGS =====

  const standingsPageSize = 5

  const standingsTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil((currentStandings?.length || 0) / standingsPageSize))
  }, [currentStandings])

  const standingsLeader = useMemo(() => {
    return (currentStandings || [])[0] || null
  }, [currentStandings])


  const visibleStandingsRows = useMemo(() => {
    const base = (currentStandings || []).slice(
      standingsPage * standingsPageSize,
      standingsPage * standingsPageSize + standingsPageSize
    )

    if (standingsPage === 0 && standingsLeader) {
      return base.filter((row) => row.team !== standingsLeader.team)
    }

    return base
  }, [currentStandings, standingsLeader, standingsPage])

  const standingsSectionLabel = useMemo(() => {
    const isFinalStandings = currentWeekLabel === '__final__'

    if (isFinalStandings) {
      return standingsPage === 0 ? 'Final table leaders' : 'Final standings'
    }

    return standingsPage === 0 ? 'Playoff pace' : 'Chasing the cut'
  }, [standingsPage, currentWeekLabel])

  useEffect(() => {
    setStandingsPage(0)
  }, [currentStandings])

  useEffect(() => {
    setStandingsPage(0)
  }, [sortCategory, sortSub])

  function getStandingsLeaderMessage(row) {
    if (!row) return ''

    if (currentWeekLabel === '__final__') {
      return 'Finished at the top and closed the season with the best campaign'
    }

    if (currentWeekLabel) {
      return `Leads the League in Week ${currentWeekLabel}`
    }

    return 'Opened the season in the lead'
  }



  // ===== CHAMPIONS WALL =====

  const [championsData, setChampionsData] = useState([])


  const { setLeftSlot } = useDrawer()

  useEffect(() => {
    setLeftSlot(
      <SummaryButton onClick={() => setDrawerOpen(true)} compact />
    )
    // limpa ao sair da página
    return () => setLeftSlot(null)
  }, [])

  useEffect(() => {
    const cat = SORT_OPTIONS.find((o) => o.label === sortCategory)
    if (cat && !cat.subs.find((s) => s.label === sortSub)) {
      setSortSub(cat.subs[0].label)
    }
    setStandingsPage(0)
  }, [sortCategory])

  useEffect(() => {
    setStandingsPage(0)
  }, [sortSub])

  useEffect(() => {
    let mounted = true
    async function loadChampionsData() {
      try {
        const BASE_URL = '/api/sheet'

        const [historyJson, gamesJson] = await Promise.all([
          safeSheetFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
          safeSheetFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        ])

        if (!mounted) return

        // Filtra apenas os campeões de cada temporada
        const champions = historyJson
          .filter((row) => {
            const isChamp = String(
              row?.Champion || row?.champion || ''
            ).trim().toUpperCase()
            return isChamp === 'TRUE'
          })
          .map((row) => ({
            season: String(row?.Season || row?.season || '').trim(),
            team: String(row?.Team || row?.team || '').trim(),
            wins: parseNumber(row?.Wins || row?.wins || row?.W || 0),
            losses: parseNumber(row?.Losses || row?.losses || row?.L || 0),
            pf: parseNumber(row?.PF || row?.Points || row?.points_for || 0),
            playoffWins: parseNumber(row?.PlayoffWins || row?.playoff_wins || row?.POW || 0),
            playoffLosses: parseNumber(row?.PlayoffLosses || row?.playoff_losses || row?.POL || 0),
            playoffPF: parseNumber(row?.PlayoffPF || row?.playoff_pf || row?.POPF || 0),
          }))
          .sort((a, b) => Number(b.season) - Number(a.season))

        // Para cada campeão, busca os jogos daquela temporada
        const championsWithGames = champions.map((champ) => {
          const seasonGames = gamesJson.filter((game) => {
            const season = String(game?.Season || game?.season || '').trim()
            const team = String(game?.Team || game?.team || '').trim()
            const stage = String(game?.gameStage || game?.GameStage || '').trim()
            return (
              season === champ.season &&
              normalizeString(team) === normalizeString(champ.team) &&
              (stage === 'Reg Season' || stage === 'Playoffs')
            )
          })

          // Ordena por semana cronologicamente
          const sorted = seasonGames.sort((a, b) => {
            const wA = parseNumber(String(a?.Week || a?.week || '0').replace(/\D/g, ''))
            const wB = parseNumber(String(b?.Week || b?.week || '0').replace(/\D/g, ''))
            return wA - wB
          })

          const regGames = sorted.filter((g) => {
            const stage = String(g?.gameStage || g?.GameStage || '').trim()
            return stage === 'Reg Season'
          })

          const playoffGames = sorted.filter((g) => {
            const stage = String(g?.gameStage || g?.GameStage || '').trim()
            return stage === 'Playoffs'
          })

          const mapGame = (game) => {
            const score = parseNumber(game?.Score || game?.score || game?.PF || 0)
            const oppScore = parseNumber(game?.OpponentScore || game?.opponent_score || game?.OppPF || game?.PA || 0)
            const opp = String(game?.Opponent || game?.opponent || '').trim()
            const week = String(game?.Week || game?.week || '').trim()
            const result = score > oppScore ? 'W' : 'L'
            return { result, opp, score, oppScore, week }
          }

          return {
            ...champ,
            regGames: regGames.map(mapGame),
            playoffGames: playoffGames.map(mapGame),
          }
        })

        if (mounted) setChampionsData(championsWithGames)
      } catch (error) {
        console.error(error)
      }
    }
    loadChampionsData()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadLeagueData() {
      try {
        const BASE_URL = '/api/sheet'

        const [teamsJson, gamesJson, h2hSortedJson] = await Promise.all([
          safeSheetFetch(`${BASE_URL}/TEAM_ALL_TIME`),
          safeSheetFetch(`${BASE_URL}/GAME_FACTS_ALL`),
          safeSheetFetch(`${BASE_URL}/HEAD_TO_HEAD_SORTED`),
        ])


        if (!mounted) {
          return
        }

        setRawData(teamsJson)
        setGameFactsData(gamesJson)

        const uniqueFranchises = new Set()
        const uniqueSeasons = new Set()
        const uniqueGames = new Set()

        let highestScore = 0
        let highestScoreTeam = ''

        teamsJson.forEach((teamRow) => {
          const franchiseName = String(
            teamRow?.Team ||
            teamRow?.team ||
            teamRow?.Name ||
            teamRow?.Franchise ||
            ''
          ).trim()

          if (franchiseName) {
            uniqueFranchises.add(franchiseName)
          }
        })

        gamesJson.forEach((game) => {
          const rawWeek = String(game?.Week || game?.week || '')

          const season = String(
            game?.Season || game?.season || game?.Year || ''
          ).trim()

          const team = String(game?.Team || game?.team || '').trim()

          const opponent = String(
            game?.Opponent || game?.opponent || ''
          ).trim()

          // Only count games that have actually been played (PF > 0)
          const score = parseNumber(
            game?.Score || game?.score || game?.PF || game?.pf
          )
          const hasScore = score > 0

          const matchupKey = [season, rawWeek, team, opponent]
            .sort()
            .join('|')

          // Only count seasons that have at least one played game
          if (season && hasScore) {
            uniqueSeasons.add(season)
          }

          // Only count games that have been played
          if (team && opponent && rawWeek && hasScore) {
            uniqueGames.add(matchupKey)
          }

          const isCombinedWeek =
            rawWeek.includes('-') ||
            rawWeek.includes('&')

          if (!isCombinedWeek && hasScore && score > highestScore) {
            highestScore = score
            highestScoreTeam = team
          }
        })

        const sortedSeasons = Array.from(uniqueSeasons)
          .map((season) => Number(season))
          .filter((season) => !Number.isNaN(season))
          .sort((a, b) => a - b)

        const seasonRange =
          sortedSeasons.length > 0
            ? `'${String(sortedSeasons[0]).slice(2)}-'${String(
              sortedSeasons[sortedSeasons.length - 1]
            ).slice(2)}`
            : ''

        setLeagueStats({
          franchises: uniqueFranchises.size,
          seasons: uniqueSeasons.size,
          seasonRange:
            sortedSeasons.length > 0
              ? `'${String(sortedSeasons[0]).slice(2)}-'${String(
                sortedSeasons[sortedSeasons.length - 1]
              ).slice(2)}`
              : '',
          allSeasons: sortedSeasons,
          games: uniqueGames.size,
          highestScore: Math.round(highestScore * 100) / 100,
          highestScoreTeam,
        })

        if (mounted) {
          setStreakMap(buildStreakMap(gamesJson, teamsJson))
        }

        if (Array.isArray(h2hSortedJson) && h2hSortedJson.length > 0) {
          setH2hData(h2hSortedJson)
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (mounted) setLeagueLoading(false)
      }
    }
    loadLeagueData()
    return () => {
      mounted = false
    }
  }, [])

  // ── News posts ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Mesma lista da página News (fica guardada: abrir a matéria é instantâneo)
    loadNewsPosts()
      .then(sorted => setNewsPosts(sorted.slice(0, 5)))
      .catch(() => setNewsPosts([]))
      .finally(() => setNewsLoading(false))
  }, [])

  // ── Power Rankings + Standings + Draft picks + Recent matchups ─────────────
  useEffect(() => {
    let mounted = true
    async function loadExtra() {
      try {
        const [gameData, historyData, draftData, playerCacheData] = await Promise.all([
          safeSheetFetch(`${BASE_URL_HOME}/GAME_FACTS_ALL`),
          safeSheetFetch(`${BASE_URL_HOME}/TEAM_HISTORY_SORTED`),
          safeSheetFetch(`${BASE_URL_HOME}/DRAFT_BOARD`),
          safeSheetFetch(`${BASE_URL_HOME}/_PLAYER_CACHE`),
        ])
        if (!mounted) return

        setPlayerLookup(buildPlayerLookup(playerCacheData))

        // ── Power Rankings ──────────────────────────────────────────────────
        const seasonsWithPR = [...new Set(
          gameData.filter(g => parseNumber(g?.['Power Ranking']) > 0)
            .map(g => String(g?.Season || '').trim()).filter(Boolean)
        )].sort((a, b) => Number(a) - Number(b))

        if (seasonsWithPR.length > 0) {
          const latestSeason = seasonsWithPR[seasonsWithPR.length - 1]
          const seasonGames = gameData.filter(g =>
            String(g?.Season || '').trim() === latestSeason &&
            parseNumber(g?.['Power Ranking']) > 0
          )
          const weeks = [...new Set(seasonGames.map(g => String(g?.Week || '').trim()).filter(Boolean))]
            .sort((a, b) => parseFloat(a) - parseFloat(b))
          const latestWeek = weeks[weeks.length - 1]
          const prevWeek = weeks[weeks.length - 2]

          const currentWeekGames = seasonGames
            .filter(g => String(g?.Week || '').trim() === latestWeek)
            .sort((a, b) => parseNumber(a?.['Power Ranking']) - parseNumber(b?.['Power Ranking']))
          const prevGames = prevWeek ? seasonGames.filter(g => String(g?.Week || '').trim() === prevWeek) : []

          const prRows = currentWeekGames.slice(0, 10).map(g => {
            const team = String(g?.Team || '').trim()
            const rank = parseNumber(g?.['Power Ranking'])
            const prev = prevGames.find(p => String(p?.Team || '').trim() === team)
            const prevRank = prev ? parseNumber(prev?.['Power Ranking']) : rank
            return { team, rank, delta: prevRank - rank, week: latestWeek }
          })
          if (mounted) { setPrData(prRows); setCurrentSeason(latestSeason) }

          // ── Current standings ─────────────────────────────────────────────
          // Find the latest season that has any PLAYED games (PF > 0)
          const allSeasonsList = [...new Set(
            gameData
              .filter(g => parseNumber(g?.Score || g?.PF || g?.score || g?.pf || 0) > 0)
              .map(g => String(g?.Season || '').trim()).filter(Boolean)
          )].sort((a, b) => Number(a) - Number(b))
          const newestSeason = allSeasonsList[allSeasonsList.length - 1]

          const rsGamesNewest = gameData.filter(g =>
            String(g?.Season || '').trim() === newestSeason &&
            String(g?.gameStage || g?.GameStage || '').trim() === 'Reg Season'
          )
          const poGamesNewest = gameData.filter(g =>
            String(g?.Season || '').trim() === newestSeason &&
            String(g?.gameStage || g?.GameStage || '').trim() !== 'Reg Season' &&
            String(g?.gameStage || g?.GameStage || '').trim() !== ''
          )

          // Helper: read final standings from TEAM_HISTORY_SORTED using Standing column
          const buildFromHistory = (season) => {
            const rows = historyData
              .filter(r => String(r?.Season || '').trim() === season && parseNumber(r?.Standing) > 0)
              .map(r => ({
                team: String(r?.Team || r?.team || '').trim(),
                w: parseNumber(r?.W || 0),
                l: parseNumber(r?.L || 0),
                pf: parseNumber(r?.PF || 0),
                standing: parseNumber(r?.Standing),
              }))
              .sort((a, b) => a.standing - b.standing)
            return rows
          }

          const finalHistoryRowsNewest = buildFromHistory(newestSeason)
          const hasFinalStandingsNewest = finalHistoryRowsNewest.length > 0

          let displaySeason = newestSeason
          let isSeasonFinished = hasFinalStandingsNewest
          let seasonRows = []
          let weekLabel = ''

          if (rsGamesNewest.length === 0) {
            // New season with no reg games yet — show previous finished season
            const prevSeason = allSeasonsList[allSeasonsList.length - 2]
            if (prevSeason) {
              displaySeason = prevSeason
              isSeasonFinished = true
              seasonRows = buildFromHistory(prevSeason)
            }
          } else if (hasFinalStandingsNewest) {
            // Season over — use Standing column from TEAM_HISTORY_SORTED
            seasonRows = finalHistoryRowsNewest
          } else {
            // Season in progress — accumulate reg season week by week
            const rsWeeksSorted = [...new Set(
              rsGamesNewest.map(g => String(g?.Week || '').trim()).filter(Boolean)
            )].sort((a, b) => parseFloat(a) - parseFloat(b))
            weekLabel = rsWeeksSorted[rsWeeksSorted.length - 1] || ''

            const teamStatsMap = {}
            rsGamesNewest.forEach(g => {
              const team = String(g?.Team || '').trim()
              if (!team) return
              if (!teamStatsMap[team]) teamStatsMap[team] = { team, w: 0, l: 0, pf: 0 }
              const pf = parseNumber(g?.Score || g?.PF || 0)
              const pa = parseNumber(g?.OpponentScore || g?.PA || 0)
              teamStatsMap[team].pf += pf
              if (pf > pa) teamStatsMap[team].w += 1
              else if (pa > pf) teamStatsMap[team].l += 1
            })
            seasonRows = Object.values(teamStatsMap)
              .sort((a, b) => b.w - a.w || a.l - b.l || b.pf - a.pf)
          }

          if (mounted) {
            setCurrentStandings(seasonRows)
            setCurrentSeason(displaySeason)
            setCurrentWeekLabel(isSeasonFinished ? '__final__' : weekLabel)
          }
        } // end if seasonsWithPR

        // ── Recent matchups — independent of PR data ──────────────────────────
        {
          const allSeasons2 = [...new Set(
            gameData
              .filter(g => parseNumber(g?.Score || g?.PF || g?.score || g?.pf || 0) > 0)
              .map(g => String(g?.Season || '').trim()).filter(Boolean)
          )].sort((a, b) => Number(a) - Number(b))
          const newestSeason2 = allSeasons2[allSeasons2.length - 1]

          // All games from newest season with actual scores (both sides filled)
          const allNewestGames2 = gameData.filter(g => {
            if (String(g?.Season || '').trim() !== newestSeason2) return false
            if (!String(g?.Team || '').trim() || !String(g?.Opponent || '').trim()) return false
            const pf = parseNumber(g?.Score || g?.PF || g?.score || g?.pf || 0)
            const pa = parseNumber(g?.OpponentScore || g?.PA || g?.opponent_score || g?.pa || 0)
            return pf > 0 && pa > 0
          })
        }

        // ── Draft picks ───────────────────────────────────────────────────────
        if (draftData.length > 0) {
          const draftSeasons = [...new Set(draftData.map((r) => String(r?.Season).trim()).filter(Boolean))].sort(
            (a, b) => Number(a) - Number(b)
          )

          const lastDraftSeason = draftSeasons[draftSeasons.length - 1]

          const picks = draftData
            .filter((r) => String(r?.Season).trim() === lastDraftSeason)
            .map((r) => ({
              pick: parseNumber(r?.Pick || r?.Overall || 0),
              round: parseNumber(r?.Round || r?.Rd || 0),
              team: String(r?.Team || '').trim(),
              player: String(r?.Player || r?.Name || '').trim(),
              position: String(r?.Position || r?.Pos || '').trim().toUpperCase(),
            }))
            .filter((r) => r.player && r.player !== '')
            .sort((a, b) => a.pick - b.pick)

          if (mounted) {
            setDraftPicks(picks)
            setDraftSeason(lastDraftSeason)
            setSelectedDraftRound(1)
          }
        }
      } catch (e) { console.error(e) }
      finally { if (mounted) setPrLoading(false) }
    }
    loadExtra()
    return () => { mounted = false }
  }, [])

  const draftRounds = useMemo(() => {
    return [...new Set(draftPicks.map((p) => p.round).filter((r) => r > 0))].sort((a, b) => a - b)
  }, [draftPicks])

  const visibleDraftPicks = useMemo(() => {
    const picksInRound = draftPicks.filter((p) => p.round === selectedDraftRound)
    return picksInRound.slice(0, 10)
  }, [draftPicks, selectedDraftRound])

  // Draft na coluna da direita: 5 escolhas por página dentro da rodada
  const draftPager = usePager(visibleDraftPicks, 5, String(selectedDraftRound))

  const canGoDraftPrev = draftRounds.indexOf(selectedDraftRound) > 0
  const canGoDraftNext = draftRounds.indexOf(selectedDraftRound) < draftRounds.length - 1

  function goDraftRound(direction) {
    const currentIndex = draftRounds.indexOf(selectedDraftRound)
    if (currentIndex === -1) return

    const nextIndex = currentIndex + direction
    if (nextIndex < 0 || nextIndex >= draftRounds.length) return

    setSelectedDraftRound(draftRounds[nextIndex])
  }

  const prPageSize = 5

  const prTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil((prData?.length || 0) / prPageSize))
  }, [prData])

  const visiblePrData = useMemo(() => {
    return (prData || []).slice(prPage * prPageSize, prPage * prPageSize + prPageSize)
  }, [prData, prPage])

  useEffect(() => {
    setPrPage(0)
  }, [prData])

  const prLeader = useMemo(() => {
    return (prData || []).find((row) => Number(row.rank) === 1) || (prData || [])[0] || null
  }, [prData])

  const visiblePrRows = useMemo(() => {
    const base = (prData || []).slice(prPage * prPageSize, prPage * prPageSize + prPageSize)

    if (prPage === 0 && prLeader) {
      return base.filter((row) => row.team !== prLeader.team)
    }

    return base
  }, [prData, prPage, prPageSize, prLeader])

  const prSectionLabel = useMemo(() => {
    if (prPage === 0) return 'Top contenders'
    if (prPage === 1) return 'Chasing the top'
    return 'More rankings'
  }, [prPage])

  const standings = useMemo(() => {
    const base =
      Array.isArray(rawData) ? rawData : []

    const mapped = base.map(normalizeTeam)


    const cat = SORT_OPTIONS.find((o) => o.label === sortCategory)
    const sub = cat?.subs.find((s) => s.label === sortSub) ?? cat?.subs[0]

    const keyMap = {
      'W': (t) => t.wins,
      'RS_W': (t) => t.rsW,
      'PO_W': (t) => t.poW,
      'L': (t) => t.losses,
      'RS_L': (t) => t.rsL,
      'PO_L': (t) => t.poL,
      'W%': (t) => t.winPct,
      'RS_W%': (t) => t.rsWinPct,
      'PO_W%': (t) => t.poWinPct,
      'PF': (t) => t.pf,
      'RS_PF': (t) => t.rsPF,
      'PO_PF': (t) => t.poPF,
      'W Streak RS': (t) => t.wStreakRS,
      'W Streak Total': (t) => t.wStreakTotal,
      'L Streak RS': (t) => t.lStreakRS,
      'L Streak Total': (t) => t.lStreakTotal,
      'Playoff Apps': (t) => t.playoffApps,
      'Finals': (t) => t.finals,
      'Titles': (t) => t.titles,
    }

    const getter = sub ? keyMap[sub.key] : (t) => t.wins
    const order = sub?.order ?? 'desc'

    return mapped.sort((a, b) => {
      const diff = order === 'desc'
        ? getter(b) - getter(a)
        : getter(a) - getter(b)
      if (diff !== 0) return diff
      // desempate sempre por wins desc → losses asc → pf desc
      if (b.wins !== a.wins) return b.wins - a.wins
      if (a.losses !== b.losses) return a.losses - b.losses
      return b.pf - a.pf
    })
  }, [rawData, sortCategory, sortSub])

  const [leadersPage, setLeadersPage] = useState(0)

  useEffect(() => {
    setLeadersPage(0)
  }, [sortCategory, sortSub])

  const topLeader = standings[0] ?? null
  const leadersTotalPages = standings.length <= 5 ? 1 : 2

  const pagedLeaders =
    leadersPage === 0
      ? standings.slice(1, 5)
      : standings.slice(5, 10)


  // ===== Recent matchups dropdown logic =====

  const weeksScrollRef = useRef(null)

  const recentMatchups = useMemo(() => {
    if (!Array.isArray(gameFactsData) || !gameFactsData.length || !currentSeason) return []

    const seasonGames = gameFactsData.filter((row) => {
      const season = Number(row?.Season || row?.season || row?.Year || currentSeason)
      const rawWeek = String(row?.Week || row?.week || '').trim()
      const week = Number(rawWeek.replace(/[^0-9]/g, ''))
      const team = String(row?.Team || row?.team || '').trim()
      const opp = String(row?.Opponent || row?.opponent || '').trim()
      const score = parseNumber(row?.Score || row?.score || row?.PF || row?.pf)
      const oppScore = parseNumber(row?.OpponentScore || row?.opponentScore || row?.PA || row?.pa)

      return (
        season === Number(currentSeason) &&
        week > 0 &&
        team &&
        opp &&
        score > 0 &&
        oppScore > 0
      )
    })

    const latestWeek = seasonGames.reduce((max, row) => {
      const week = Number(String(row?.Week || row?.week || '').replace(/[^0-9]/g, ''))
      return week > max ? week : max
    }, 0)

    const dedupedGames = new Map()

    seasonGames.forEach((row) => {
      const season = Number(row?.Season || row?.season || row?.Year || currentSeason)
      const rawWeek = String(row?.Week || row?.week || '').trim()
      const week = Number(rawWeek.replace(/[^0-9]/g, ''))
      const team = String(row?.Team || row?.team || '').trim()
      const opp = String(row?.Opponent || row?.opponent || '').trim()
      const score = parseNumber(row?.Score || row?.score || row?.PF || row?.pf)
      const oppScore = parseNumber(row?.OpponentScore || row?.opponentScore || row?.PA || row?.pa)

      if (!team || !opp || !week || week > latestWeek || score <= 0 || oppScore <= 0) return

      const rawGameType = String(
        row?.gameType ||
        row?.GameType ||
        row?.GAME_TYPE ||
        row?.GameStage ||
        row?.gameStage ||
        ''
      ).trim()

      const gameType =
        rawGameType === 'Consolation Bracket'
          ? 'Consolation'
          : rawGameType || 'Regular Season'

      const teamA = [team, opp].sort()[0]
      const teamB = [team, opp].sort()[1]
      const dedupeKey = `${season}|${week}|${gameType}|${teamA}|${teamB}`

      if (!dedupedGames.has(dedupeKey)) {
        // Matchups must use the exact Team/Opponent orientation of the
        // first GAME_FACTS_ALL row for this game. Do not alphabetize it.
        dedupedGames.set(dedupeKey, {
          season,
          week,
          gameType,
          team,
          opp,
          score,
          oppScore,
        })
      }
    })

    return Array.from(dedupedGames.values()).sort((a, b) => {
      if ((a.week ?? 0) !== (b.week ?? 0)) return (a.week ?? 0) - (b.week ?? 0)
      return String(a.team).localeCompare(String(b.team))
    })
  }, [gameFactsData, currentSeason])

  const matchupOptions = useMemo(() => {
    const map = new Map()

    recentMatchups.forEach((m) => {
      const key = `${m.season}-${m.week}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          season: m.season,
          week: m.week,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => {
      if ((a.season ?? 0) !== (b.season ?? 0)) return (a.season ?? 0) - (b.season ?? 0)
      return (a.week ?? 0) - (b.week ?? 0)
    })
  }, [recentMatchups])


  useEffect(() => {
    if (!matchupOptions.length) return
    setSelectedMatchupKey((prev) =>
      matchupOptions.some((option) => option.key === prev)
        ? prev
        : matchupOptions[matchupOptions.length - 1].key
    )
  }, [matchupOptions])

  const selectedMatchupOption =
    matchupOptions.find((option) => option.key === selectedMatchupKey) ??
    matchupOptions[matchupOptions.length - 1]

  const visibleMatchups = useMemo(() => {
    if (!selectedMatchupOption) return recentMatchups

    return recentMatchups.filter((m) => {
      return (
        m.season === selectedMatchupOption.season &&
        m.week === selectedMatchupOption.week
      )
    })
  }, [recentMatchups, selectedMatchupOption])

  useEffect(() => {
  const el = weeksScrollRef.current
  if (!el || !matchupOptions.length) return

  const isDesktop = window.matchMedia('(min-width: 768px)').matches

  if (isDesktop) {
    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2)
  } else {
    el.scrollLeft = el.scrollWidth
  }
}, [matchupOptions.length])

  // Lista única de times extraída do h2h
  const allTeams = useMemo(() => {
    const teams = new Set()
    h2hData.forEach((row) => {
      const keys = Object.keys(row)
      const a = String(row[keys[0]] || '').trim()
      const b = String(row[keys[1]] || '').trim()
      if (a) teams.add(a)
      if (b) teams.add(b)
    })
    return Array.from(teams).sort()
  }, [h2hData])

  // Times disponíveis para o segundo dropdown (exclui o time A)
  const teamsForB = useMemo(() => {
    if (!selectedTeamA) return allTeams.filter((t) => t !== selectedTeamA)
    // Só mostra times que têm confronto com teamA na planilha
    return h2hData
      .filter((row) => {
        const keys = Object.keys(row)
        const a = String(row[keys[0]] || '').trim()
        return normalizeString(a) === normalizeString(selectedTeamA)
      })
      .map((row) => {
        const keys = Object.keys(row)
        return String(row[keys[1]] || '').trim()
      })
      .filter(Boolean)
      .sort()
  }, [h2hData, selectedTeamA])

  // Confronto selecionado
  const selectedRivalry = useMemo(() => {
    if (!selectedTeamA || !selectedTeamB) return null

    // Confronto direto calculado a partir da GAME_FACTS_ALL, que já chega sem as
    // semanas em andamento (a aba HEAD_TO_HEAD_SORTED da planilha pode incluir
    // placares parciais da semana atual).
    const weekNum = w => Math.max(0, ...(String(w || '').match(/\d+/g) || ['0']).map(Number))
    const pairGames = (gameFactsData || [])
      .filter(g =>
        normalizeString(g?.Team) === normalizeString(selectedTeamA) &&
        normalizeString(g?.Opponent) === normalizeString(selectedTeamB) &&
        (parseNumber(g?.PF) > 0 || parseNumber(g?.PA) > 0))
      .sort((a, b) => (Number(a?.Season) - Number(b?.Season)) || (weekNum(a?.Week) - weekNum(b?.Week)))
    if (!pairGames.length) return null

    const resultOf = g => {
      const r = String(g?.Result || '').trim().toUpperCase()
      if (r === 'W' || r === 'L' || r === 'T') return r
      const pf = parseNumber(g?.PF), pa = parseNumber(g?.PA)
      return pf > pa ? 'W' : pf < pa ? 'L' : 'T'
    }
    const isPlayoff = g => {
      const stage = String(g?.GameStage || g?.GameType || '').toLowerCase()
      return /playoff|semi|final|quarter|champ|wild/.test(stage) && !/consol|toilet|loser/.test(stage)
    }
    const winsA = pairGames.filter(g => resultOf(g) === 'W').length
    const winsB = pairGames.filter(g => resultOf(g) === 'L').length
    const poWinsA = pairGames.filter(g => isPlayoff(g) && resultOf(g) === 'W').length
    const poWinsB = pairGames.filter(g => isPlayoff(g) && resultOf(g) === 'L').length
    const avgMargin = (pairGames.reduce((sum, g) => sum + parseNumber(g?.PF) - parseNumber(g?.PA), 0) / pairGames.length).toFixed(2)

    const last = pairGames[pairGames.length - 1]
    const lastResult = resultOf(last)
    let streakLen = 0
    for (let i = pairGames.length - 1; i >= 0 && resultOf(pairGames[i]) === lastResult; i--) streakLen++
    const currentStreak = lastResult === 'W'
      ? { streakA: `W${streakLen}`, streakB: `L${streakLen}`, streakCount: streakLen, winner: 'A' }
      : lastResult === 'L'
        ? { streakA: `L${streakLen}`, streakB: `W${streakLen}`, streakCount: streakLen, winner: 'B' }
        : { streakA: '—', streakB: '—', streakCount: streakLen, winner: null }
    const lastMeetingInfo = {
      score: `${parseNumber(last?.PF).toFixed(2)} vs ${parseNumber(last?.PA).toFixed(2)}`,
      meta: `Week ${String(last?.Week || '').trim()} · ${String(last?.Season || '').trim()}`,
      href: `/matchups?season=${encodeURIComponent(String(last?.Season || '').trim())}&week=${encodeURIComponent(String(last?.Week || '').trim())}&team=${encodeURIComponent(String(last?.Team || '').trim())}&opp=${encodeURIComponent(String(last?.Opponent || '').trim())}`,
    }

    const totalGames = winsA + winsB
    const recordGap = Math.abs(winsA - winsB)
    const margin = Math.abs(parseFloat(avgMargin) || 0)
    let rivalryScore = 0
    if (recordGap === 0) rivalryScore += 7
    else if (recordGap === 1) rivalryScore += 5
    else if (recordGap === 2) rivalryScore += 3
    else if (recordGap === 3) rivalryScore += 1
    else rivalryScore -= 3
    if (totalGames >= 14) rivalryScore += 5
    else if (totalGames >= 10) rivalryScore += 4
    else if (totalGames >= 6) rivalryScore += 2
    if (margin <= 3) rivalryScore += 5
    else if (margin <= 7) rivalryScore += 3
    else if (margin <= 12) rivalryScore += 1
    const heat =
      rivalryScore >= 13 ? 'Legendary' :
        rivalryScore >= 10 ? 'Elite' :
          rivalryScore >= 7 ? 'High' :
            rivalryScore >= 4 ? 'Medium' : 'Low'

    const shortName = (name) => {
      const mappings = {
        'i am megatron': 'Megatron',
        'h-lera do mahl': 'H-Lera',
        'peyto da massa': 'Peytao',
        'peytao da massa': 'Peytao',
        'ocupa meu slot': 'Ocupa',
        'ocupa e resiste': 'Ocupa',
        'green bay pequers': 'Pequers',
        'pequers verde': 'Pequers',
        'settlers of rinco': 'Rinco',
        'settlers of rincao': 'Rinco',
        'rincao settlers': 'Rinco',
        'old brady bunch': 'OldBrady',
        'moneyball fc': 'Moneyball',
        'moneyball': 'Moneyball',
        'patrolo': 'Patrolao',
        'patrolao squad': 'Patrolao',
        'patrolao': 'Patrolao',
        'how much is the fish': 'Howmuch',
      }

      const n = normalizeString(name)
      return mappings[n] || String(name).split(' ')[0]
    }


    return {
      teamA: selectedTeamA,
      teamB: selectedTeamB,
      winsA,
      winsB,
      record: `${winsA}-${winsB}`,
      playoffRecord: `${poWinsA}-${poWinsB}`,
      avgMargin,
      heat,
      streakA: currentStreak.streakA,
      streakB: currentStreak.streakB,
      streakWinner: currentStreak.winner,
      streakCount: currentStreak.streakCount,
      lastMeeting: lastMeetingInfo,
    }
  }, [gameFactsData, selectedTeamA, selectedTeamB])

  useEffect(() => {
    if (!draftScrollRef.current) return

    const isDesktop = window.matchMedia('(min-width: 768px)').matches

    draftScrollRef.current.scrollTo({
      left: 0,
      behavior: isDesktop ? 'auto' : 'smooth',
    })
  }, [selectedDraftRound])


  // ── Nome do jogador do draft como ele aparece no GAME_FACTS_ALL ─────
  // Nome completo; em planilha antiga, abreviada, cai para "J. Allen".
  const factsNameIndex = useMemo(() => buildFactsNameIndex(gameFactsData), [gameFactsData])

  const resolveDraftName = (fullName) => {
    const raw = String(fullName || '').trim()
    const exact = factsNameIndex.get(normalizePlayerKey(raw))
    if (exact) return exact
    const parts = raw.split(/\s+/).filter(Boolean)
    if (parts.length >= 2 && !factsNameIndex.fullNames) {
      const abbreviated = factsNameIndex.get(normalizePlayerKey(`${parts[0][0]}. ${parts[parts.length - 1]}`))
      if (abbreviated) return abbreviated
    }
    return raw
  }

  const slides = [
    {
      eyebrow: 'Est. 2014 · A league. A history. A legacy.',
      title: 'The home of Tapitas history',
      text: 'All the stats. All the moments. All the rivalry.',
      cta: { label: 'League history', href: '/history' },
      image: null,
    },
    {
      eyebrow: 'Your team is now on the clock',
      title: 'The Draft Day',
      text: 'Every dynasty started with a pick.',
      cta: { label: 'Draft history', href: '/draft' },
      image: '/images/draft.png',
    },
    {
      eyebrow: `${currentSeason || ''}${prData?.[0]?.week ? ` · Week ${prData[0].week}` : ''}`,
      title: 'Power Rankings',
      text: prData?.length >= 3 ? `${prData[0].team} leads. ${prData[1].team} and ${prData[2].team} follow.` : "Who's hot, who's not.",
      cta: { label: 'Power rankings', href: '/powerrankings' },
      image: null,
      podium: (prData || []).slice(0, 3),
    },
  ]

  const valueForSub = (t, key) => ({
    'W': t.wins, 'RS_W': t.rsW, 'PO_W': t.poW,
    'L': t.losses, 'RS_L': t.rsL, 'PO_L': t.poL,
    'W%': t.winPct, 'RS_W%': t.rsWinPct, 'PO_W%': t.poWinPct,
    'PF': t.pf, 'RS_PF': t.rsPF, 'PO_PF': t.poPF,
    'W Streak RS': t.wStreakRS, 'W Streak Total': t.wStreakTotal,
    'L Streak RS': t.lStreakRS, 'L Streak Total': t.lStreakTotal,
    'Playoff Apps': t.playoffApps, 'Finals': t.finals, 'Titles': t.titles,
  }[key] ?? t.wins)

  const sortCat = SORT_OPTIONS.find(o => o.label === sortCategory) || SORT_OPTIONS[0]
  const sortSubOpt = sortCat.subs.find(s => s.label === sortSub) || sortCat.subs[0]
  const formatLeaderValue = (v) => {
    if (sortSubOpt.key.includes('%')) return `${Number(v).toFixed(1)}%`
    if (sortSubOpt.key.includes('PF')) return Math.round(v).toLocaleString()
    return v
  }


  const isFinalStandings = currentWeekLabel === '__final__'
  const heatTone = { Legendary: 'gold', Elite: 'navy', High: 'red' }

  // ── Blocos ──────────────────────────────────────────────────────────

  const slide = slides[currentSlide] || slides[0]
  const heroCard = (
    <div className="relative mb-2 overflow-hidden rounded-xl bg-[#02275F] text-white" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {slide.image && (
        <>
          <img src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#02275F] via-[#02275F]/80 to-[#02275F]/10" />
        </>
      )}
      {!slide.image && !slide.podium && (
        <img src="/images/LogoFinalBlack.png" alt="" className="pointer-events-none absolute -right-10 top-1/2 h-[260px] w-[260px] -translate-y-1/2 object-contain opacity-15 sm:h-[340px] sm:w-[340px]" />
      )}
      {/* Slide do Power Rankings: textura diagonal e pódio com o top 3 */}
      {slide.podium && (
        <>
          <BrandBackdrop />
          {slide.podium.length === 3 && (
            <div className="pointer-events-none absolute bottom-0 right-6 hidden sm:block xl:right-10"><Podium rows={slide.podium} /></div>
          )}
        </>
      )}
      {/* Altura fixa: todos os slides do mesmo tamanho (a página não "pula" ao trocar) */}
      {/* Slide com pódio: só o texto de baixo abre espaço para o pódio (o título usa a linha toda) */}
      <div className="relative flex h-[250px] flex-col justify-center px-5 py-6 sm:h-[280px] sm:px-8">
        <div className="text-[12px] font-medium text-white/70">{slide.eyebrow}</div>
        <h1 className="mt-1.5 line-clamp-2 max-w-[520px] text-[30px] font-bold leading-[1.05] tracking-tight sm:text-[38px] xl:text-[42px]">{slide.title}</h1>
        <p className={`mt-2 line-clamp-2 max-w-[440px] text-[14px] leading-relaxed text-white/80 sm:text-[15px] ${slide.podium?.length === 3 ? 'sm:line-clamp-3 sm:max-w-[calc(100%-250px)] xl:max-w-[calc(100%-280px)]' : ''}`}>{slide.text}</p>
        <div className="mt-4">
          <Link href={slide.cta.href} className="inline-flex h-9 items-center gap-1 rounded-full bg-white px-4 text-[13px] font-semibold text-[#02275F] transition-colors hover:bg-white/90">
            {slide.cta.label} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {slides.map((_, i) => (
          <button key={i} type="button" aria-label={`Slide ${i + 1}`} onClick={() => { setHeroAutoplay(false); setCurrentSlide(i) }} className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />
        ))}
      </div>
    </div>
  )

  // ── Semana em destaque (dados do placar do topo) ────────────────────
  // Busca de jogador também pelo formato abreviado "J. Allen" usado no GAME_FACTS_ALL.
  const abbreviatedLookup = useMemo(() => {
    const map = new Map()
    playerLookup.forEach(entry => {
      const parts = String(entry.fullName || '').split(/\s+/).filter(Boolean)
      if (parts.length < 2) return
      const key = normalizePlayerKey(`${parts[0][0]}. ${parts[parts.length - 1]}`)
      if (key && !map.has(key)) map.set(key, entry)
    })
    return map
  }, [playerLookup])

  const findPlayerData = (name) => getPlayerDataByFullName(name, playerLookup) || abbreviatedLookup.get(normalizePlayerKey(name)) || null

  const weekHighlights = useMemo(() => {
    if (!visibleMatchups.length) return null
    const withMargin = visibleMatchups.map(m => ({ ...m, margin: Math.abs(m.score - m.oppScore), winner: m.score >= m.oppScore ? m.team : m.opp, loser: m.score >= m.oppScore ? m.opp : m.team, high: Math.max(m.score, m.oppScore), low: Math.min(m.score, m.oppScore) }))
    const topScore = [...withMargin].sort((a, b) => b.high - a.high)[0]
    const blowout = [...withMargin].sort((a, b) => b.margin - a.margin)[0]
    const closest = [...withMargin].sort((a, b) => a.margin - b.margin)[0]
    return { topScore, blowout, closest }
  }, [visibleMatchups])

  const weekPerformers = useMemo(() => {
    if (!selectedMatchupOption) return []
    const rows = (gameFactsData || []).filter(g =>
      Number(g?.Season) === Number(selectedMatchupOption.season) &&
      Number(String(g?.Week || '').replace(/[^0-9]/g, '')) === Number(selectedMatchupOption.week)
    )
    const seen = new Set()
    const list = []
    rows.forEach(g => {
      const team = String(g?.Team || '').trim()
      const opponent = String(g?.Opponent || '').trim()
      extractPlayerAppearances(g).forEach(a => {
        if (a.status !== 'Starter') return
        const key = `${a.name}|${team}`
        if (seen.has(key)) return
        seen.add(key)
        list.push({ name: a.name, pts: a.pts, team, opponent, season: String(g?.Season || '').trim(), week: String(g?.Week || '').trim() })
      })
    })
    return list.sort((a, b) => b.pts - a.pts).slice(0, 10)
  }, [gameFactsData, selectedMatchupOption])

  const matchupLink = m => `/matchups?season=${encodeURIComponent(m.season)}&week=${encodeURIComponent(m.week)}&team=${encodeURIComponent(m.team)}&opp=${encodeURIComponent(m.opp)}`

  // Rivalry da Home: sorteia um confronto da próxima semana (a seguinte à última
  // registrada na planilha, vinda do Sleeper). Sem próxima semana (fim de
  // temporada), sorteia qualquer par de franquias. O usuário pode trocar.
  const [upcomingRivalry, setUpcomingRivalry] = useState({ loaded: false, week: null, pairs: [] })
  const lastSheetWeek = useMemo(() => Math.max(0, ...matchupOptions
    .filter(o => String(o.season) === String(currentSeason))
    .map(o => Number(o.week) || 0)), [matchupOptions, currentSeason])

  useEffect(() => {
    if (!currentSeason || !gameFactsData.length || upcomingRivalry.loaded) return
    let cancelled = false
    const next = lastSheetWeek + 1
    fetch(`/api/league/week?week=${next}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return
        const pairs = d?.source === 'sleeper' && String(d?.season) === String(currentSeason)
          ? (d.matchups || []).map(m => [m.teams[0].team, m.teams[1].team])
          : []
        setUpcomingRivalry({ loaded: true, week: pairs.length ? next : null, pairs })
      })
      .catch(() => { if (!cancelled) setUpcomingRivalry({ loaded: true, week: null, pairs: [] }) })
    return () => { cancelled = true }
  }, [currentSeason, gameFactsData.length, lastSheetWeek, upcomingRivalry.loaded])

  // Com um time em foco (filtro geral), o spotlight mostra o confronto dele na
  // semana; sem foco, sorteia um confronto. Trocar o foco troca o spotlight.
  const [teamFocus] = useTeamFocus()
  const appliedFocus = useRef(null)
  useEffect(() => {
    if (!upcomingRivalry.loaded || !h2hData.length) return
    const focusChanged = appliedFocus.current !== teamFocus
    if (selectedTeamA && !focusChanged) return
    appliedFocus.current = teamFocus
    const hasRow = (a, b) => h2hData.some(r => {
      const keys = Object.keys(r)
      return normalizeString(r[keys[0]]) === normalizeString(a) && normalizeString(r[keys[1]]) === normalizeString(b)
    })
    const pairs = upcomingRivalry.pairs.length
      ? upcomingRivalry.pairs
      : h2hData.map(r => { const keys = Object.keys(r); return [r[keys[0]], r[keys[1]]] }).filter(([a, b]) => a && b)
    if (!pairs.length) return
    if (teamFocus) {
      const mine = pairs.find(p => p.some(t => normalizeString(t) === normalizeString(teamFocus)))
      if (mine) {
        const opp = mine.find(t => normalizeString(t) !== normalizeString(teamFocus))
        if (hasRow(teamFocus, opp) || hasRow(opp, teamFocus)) { setSelectedTeamA(teamFocus); setSelectedTeamB(opp); return }
      }
    }
    if (selectedTeamA && !teamFocus) return
    const [a, b] = pairs[Math.floor(Math.random() * pairs.length)]
    if (hasRow(a, b)) { setSelectedTeamA(a); setSelectedTeamB(b) }
    else if (hasRow(b, a)) { setSelectedTeamA(b); setSelectedTeamB(a) }
  }, [upcomingRivalry, h2hData, selectedTeamA, teamFocus])

  // Destaques da semana: jogos em destaque + melhores jogadores no mesmo card,
  // em duas seções com título próprio.
  const weekCard = weekHighlights && (
    <CardShell title={`Week ${selectedMatchupOption?.week} highlights`} subtitle={`${currentSeason} · ${visibleMatchups.length} matchups`} action={<Link href={matchupLink(visibleMatchups[0])} className="flex-shrink-0 text-[12px] font-medium text-[#D01F2D] hover:underline">All matchups</Link>}>
      <div className="flex items-center gap-1.5 px-3 pb-2 pt-3 text-[12px] font-semibold text-[#111] lg:px-4"><Swords className="h-3.5 w-3.5 text-[#6B7280]" />Games of the week</div>
      {/* Mesmo estilo do Top Performance (página Players): o destaque em azul */}
      {/* Colunas conforme a largura do card (não da tela): evita estourar em telas médias */}
      <div className="@container px-3 lg:px-4">
      <div className="grid grid-cols-1 gap-2 @min-[420px]:grid-cols-3">
        {[
          { label: 'Top score', m: weekHighlights.topScore, value: weekHighlights.topScore.high.toFixed(2), unit: 'pts', Icon: Flame, ring: 'bg-[#B8860B]' },
          { label: 'Biggest win', m: weekHighlights.blowout, value: `+${weekHighlights.blowout.margin.toFixed(2)}`, unit: 'margin', Icon: TrendingUp, ring: 'bg-[#1E8E3E]' },
          { label: 'Closest game', m: weekHighlights.closest, value: weekHighlights.closest.margin.toFixed(2), unit: 'margin', Icon: Target, ring: 'bg-[#D01F2D]' },
        ].map(({ label, m, value, unit, Icon, ring }, i) => {
          const featured = i === 0
          return (
            <Link
              key={label}
              href={matchupLink(m)}
              className={`group relative flex min-w-0 items-center gap-2.5 overflow-hidden rounded-xl p-3 transition-shadow @min-[760px]:gap-3 @min-[760px]:p-3.5 hover:shadow-md ${featured ? 'bg-[#02275F] text-white' : 'bg-[#F4F5F7] text-[#111]'}`}
            >
              <Icon className={`pointer-events-none absolute -right-2 -top-2 h-20 w-20 ${featured ? 'text-white/[0.07]' : 'text-[#02275F]/[0.06]'}`} strokeWidth={2.5} />
              <span className={`flex-shrink-0 rounded-full p-0.5 @min-[420px]:@max-[639px]:hidden ${featured ? 'bg-[#B8860B]' : ring}`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white @min-[760px]:h-12 @min-[760px]:w-12"><TeamLogo name={m.winner} size={34} /></span>
              </span>
              <div className="relative min-w-0 flex-1">
                <div className={`truncate text-[11px] font-semibold uppercase tracking-[0.12em] ${featured ? 'text-[#E8C766]' : 'text-[#6B7280]'}`}>{label}</div>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1">
                  <span className="text-[21px] font-bold leading-none tabular-nums @min-[760px]:text-[26px]">{value}</span>
                  <span className={`text-[11px] ${featured ? 'text-white/70' : 'text-[#6B7280]'}`}>{unit}</span>
                </div>
                <div className={`mt-1 truncate text-[12px] font-semibold ${featured ? '' : 'group-hover:text-[#D01F2D]'}`}>{m.winner}</div>
                <div className={`truncate text-[11px] tabular-nums ${featured ? 'text-white/75' : 'text-[#6B7280]'}`}>{m.high.toFixed(1)}–{m.low.toFixed(1)} vs {m.loser}</div>
              </div>
            </Link>
          )
        })}
      </div>
      </div>
      {weekPerformers.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 px-3 pb-2 pt-4 text-[12px] font-semibold text-[#111] lg:px-4"><Star className="h-3.5 w-3.5 text-[#6B7280]" />Top performers<span className="font-normal text-[#6B7280]">· best starters</span></div>
          <div className="scroll-hide flex gap-2 overflow-x-auto px-3 pb-3 lg:px-4 lg:pb-4">
            {weekPerformers.map((p, i) => {
              const data = findPlayerData(p.name)
              return <PerformerTile key={`${p.name}-${p.team}`} rank={i + 1} performer={p} data={data} onOpen={() => setSelectedPerformer({ ...p, data })} />
            })}
          </div>
        </>
      )}
      {weekPerformers.length === 0 && <div className="h-3" />}
    </CardShell>
  )

  const newsCard = (
    <CardShell title="Tapitas News" subtitle="Memes, recaps and news from the league" action={<Link href="/news" className="flex-shrink-0 text-[12px] font-medium text-[#D01F2D] hover:underline">All news</Link>}>
      {newsLoading ? <LoadingState /> : featuredNewsPosts.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[#6B7280]">No posts yet</div>
      ) : (
        <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:p-4">
          {(() => {
            const post = featuredNewsPosts[0]
            return (
              <Link href={`/news/${post.slug}`} className="group flex min-w-0 flex-col">
                {/* Telas maiores: a foto estica para o destaque ter a altura exata
                    das 4 miniaturas ao lado */}
                {post.imageUrl && (
                  <div className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-[#F4F5F7] md:aspect-auto md:min-h-[200px] md:flex-1">
                    <img src={post.imageUrl.split('|')[0]} alt={post.title} className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]" />
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 text-[11px] text-[#6B7280]">
                  {post.category && <Tag tone={{ Meme: 'gold', Recap: 'navy', 'Notícia': 'green' }[post.category]}>{post.category}</Tag>}
                  <span>{formatDate(post.date)}</span>
                </div>
                <div className="mt-1 text-[17px] font-bold leading-snug text-[#111] group-hover:text-[#02275F]">{post.title}</div>
              </Link>
            )
          })()}
          <div className="divide-y divide-[#F1F2F4]">
            {featuredNewsPosts.slice(1).map((post, i) => (
              <Link key={post.slug || i} href={`/news/${post.slug}`} className="group flex items-center gap-3 py-2.5 first:pt-0">
                {post.imageUrl && <img src={post.imageUrl.split('|')[0]} alt="" className="h-14 w-20 flex-shrink-0 rounded-md bg-[#F4F5F7] object-cover object-top" />}
                <div className="min-w-0">
                  <div className="text-[11px] text-[#6B7280]">{post.category ? `${post.category} · ` : ''}{formatDate(post.date)}</div>
                  <div className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#111] group-hover:text-[#02275F]">{post.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </CardShell>
  )

  const draftCard = draftPicks.length > 0 && (
    <CardShell
      title={`${draftSeason} Draft`}
      subtitle={`Round ${selectedDraftRound} · tap a player for his profile`}
      action={
        <div className="flex flex-shrink-0 items-center gap-1">
          <button type="button" onClick={() => goDraftRound(-1)} disabled={!canGoDraftPrev} aria-label="Previous round" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F5F7] text-[#111] hover:bg-[#ECEEF1] disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-[40px] text-center text-[12px] tabular-nums text-[#3F4757]">R{selectedDraftRound}</span>
          <button type="button" onClick={() => goDraftRound(1)} disabled={!canGoDraftNext} aria-label="Next round" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F5F7] text-[#111] hover:bg-[#ECEEF1] disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      }
    >
      <div ref={draftScrollRef} className="scroll-hide flex gap-2 overflow-x-auto p-3">
        {visibleDraftPicks.map(pick => (
          <DraftPickTile key={pick.pick} pick={pick} playerLookup={playerLookup} onOpenPlayer={(draftPick, data) => setSelectedDraftPlayer({ pick: draftPick, data })} />
        ))}
      </div>
      <div className="border-t border-[#EEF0F2] py-2 text-center"><Link href="/draft" className="text-[12px] font-medium text-[#D01F2D] hover:underline">Full draft board</Link></div>
    </CardShell>
  )

  // Versão compacta do draft para a coluna da direita (desktop)
  const draftRoundNav = (
    <div className="flex flex-shrink-0 items-center gap-1">
      <button type="button" onClick={() => goDraftRound(-1)} disabled={!canGoDraftPrev} aria-label="Previous round" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F5F7] text-[#111] hover:bg-[#ECEEF1] disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
      <span className="min-w-[30px] text-center text-[12px] tabular-nums text-[#3F4757]">R{selectedDraftRound}</span>
      <button type="button" onClick={() => goDraftRound(1)} disabled={!canGoDraftNext} aria-label="Next round" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F5F7] text-[#111] hover:bg-[#ECEEF1] disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
    </div>
  )
  const draftSideCard = draftPicks.length > 0 && (
    <CardShell title={`${draftSeason} Draft`} subtitle={`Round ${selectedDraftRound}`} sidebar action={draftRoundNav}>
      <div {...draftPager.listProps} className="py-1">
        {draftPager.visible.map(pick => {
          const data = getPlayerDataByFullName(pick.player, playerLookup)
          const isDef = String(pick.position || '').toUpperCase() === 'DEF'
          const photo = isDef ? getNFLTeamLogo(pick.player) : data?.playerId ? `https://sleepercdn.com/content/nfl/players/thumb/${data.playerId}.jpg` : null
          return (
            <button key={pick.pick} type="button" onClick={() => setSelectedDraftPlayer({ pick, data })} className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-black/[0.03] lg:px-4">
              <span className="w-8 flex-shrink-0 text-[11px] font-semibold tabular-nums text-[#9CA3AF]">#{pick.pick}</span>
              <span className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-[#F4F5F7] ring-1 ring-[#E6E8EB]">
                {photo && <img src={photo} alt="" className={`h-full w-full ${isDef ? 'object-contain p-1' : 'object-cover'}`} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">{data?.shortName || pick.player}</span>
                  <UiPositionBadge position={pick.position} />
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-[#6B7280]">{pick.team}</span>
              </span>
              <TeamLogo name={pick.team} size={20} />
            </button>
          )
        })}
      </div>
      {draftPager.totalPages > 1 && <Pager {...draftPager.pagerProps} />}
      <div className="border-t border-[#EEF0F2] py-2 text-center"><Link href="/draft" className="text-[12px] font-medium text-[#D01F2D] hover:underline">Full draft board</Link></div>
    </CardShell>
  )

  // ── Listas (usadas nos cards do desktop e nos cards com abas do mobile) ──
  const cardLink = (href, label) => <Link href={href} className="flex-shrink-0 text-[12px] font-medium text-[#D01F2D] hover:underline">{label}</Link>

  // ── Rivalry spotlight: pôster "versus" dividido na diagonal ─────────
  // Time A no azul da marca, time B no vermelho do logo; embaixo o
  // "tale of the tape" com barras nas mesmas cores.
  const toNumber = v => parseFloat(String(v ?? '0').replace(',', '.')) || 0
  const rivalryRows = selectedRivalry ? (() => {
    const [poA, poB] = selectedRivalry.playoffRecord.split('-').map(toNumber)
    const marginA = toNumber(selectedRivalry.avgMargin)
    return [
      { label: 'All-time wins', a: selectedRivalry.winsA, b: selectedRivalry.winsB, shareA: selectedRivalry.winsA, shareB: selectedRivalry.winsB },
      { label: 'Playoff wins', a: poA, b: poB, shareA: poA, shareB: poB },
      { label: 'Avg margin', a: `${marginA > 0 ? '+' : ''}${marginA.toFixed(2)}`, b: `${marginA < 0 ? '+' : ''}${(-marginA).toFixed(2)}`, shareA: Math.max(marginA, 0), shareB: Math.max(-marginA, 0) },
      { label: 'Current streak', a: selectedRivalry.streakA, b: selectedRivalry.streakB, shareA: selectedRivalry.streakWinner === 'A' ? 1 : 0, shareB: selectedRivalry.streakWinner === 'B' ? 1 : 0 },
    ]
  })() : []

  const rivalryCard = (
    <section className="mb-2 rounded-xl bg-white">
      <VersusPoster
        label={upcomingRivalry.week && upcomingRivalry.pairs.some(([a, b]) => [a, b].map(normalizeString).sort().join('|') === [selectedTeamA, selectedTeamB].map(normalizeString).sort().join('|'))
          ? `Rivalry spotlight · Week ${upcomingRivalry.week} matchup`
          : 'Rivalry spotlight'}
        badge={selectedRivalry ? `${selectedRivalry.heat} rivalry` : null}
        left={selectedRivalry ? { team: selectedRivalry.teamA, value: selectedRivalry.winsA } : null}
        right={selectedRivalry ? { team: selectedRivalry.teamB, value: selectedRivalry.winsB } : null}
        leftControl={<FilterPill value={selectedTeamA || 'Team'} onChange={v => { setSelectedTeamA(v); setSelectedTeamB('') }} options={allTeams} label="Team" neutral hideLabel tone="dark" />}
        rightControl={<FilterPill value={selectedTeamB || 'Opponent'} onChange={setSelectedTeamB} options={teamsForB} label="Opponent" neutral hideLabel tone="dark" align="right" />}
      />
      {selectedRivalry ? (
        <>
          <TaleOfTape leftName={selectedRivalry.teamA} rightName={selectedRivalry.teamB} rows={rivalryRows} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF0F2] px-3 py-2.5 lg:px-4">
            <a href={selectedRivalry.lastMeeting.href} className="group text-[12px] text-[#6B7280] hover:text-[#111]">
              Last meeting <span className="font-semibold tabular-nums text-[#111] group-hover:text-[#D01F2D]">{selectedRivalry.lastMeeting.score}</span>{selectedRivalry.lastMeeting.meta ? ` · ${selectedRivalry.lastMeeting.meta}` : ''}
              <ChevronRight className="ml-0.5 inline h-3.5 w-3.5 align-[-2px] text-[#9CA3AF] group-hover:text-[#D01F2D]" />
            </a>
            {cardLink(`/rivalries?teamA=${encodeURIComponent(selectedRivalry.teamA)}&teamB=${encodeURIComponent(selectedRivalry.teamB)}`, 'Full rivalry')}
          </div>
        </>
      ) : (
        <div className="py-8 text-center text-[13px] text-[#6B7280]">Choose two franchises to compare</div>
      )}
    </section>
  )


  // Linhas no mesmo padrão (e espaçamento) do Standings
  const compactRow = (key, href, rank, team, value, valueClass = 'text-[13px] font-semibold text-[#111]') => (
    <Link key={key} href={href} className="group grid grid-cols-[20px_minmax(0,1fr)_56px] items-center gap-2 px-3 py-1.5 transition-colors hover:bg-black/[0.03] lg:px-4">
      <span className={`text-[13px] font-bold tabular-nums ${rank === 1 ? 'text-[#B8860B]' : 'text-[#111]'}`}>{rank}</span>
      <span className="flex min-w-0 items-center gap-2"><TeamLogo name={team} size={20} /><span className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">{team}</span></span>
      <span className={`text-right tabular-nums ${valueClass}`}>{value}</span>
    </Link>
  )
  const compactHeader = (last) => (
    <div className="grid grid-cols-[20px_minmax(0,1fr)_56px] gap-2 px-3 pb-1 pt-2 text-[11px] text-[#6B7280] lg:px-4">
      <span>#</span><span>Team</span><span className="text-right">{last}</span>
    </div>
  )
  const powerList = (
    <>
      {compactHeader('Move')}
      <div className="pb-1 lg:pb-2">
        {prLoading ? <LoadingState /> : prData.map(row => compactRow(
          row.team,
          `/teams?team=${encodeURIComponent(row.team)}`,
          row.rank,
          row.team,
          row.delta > 0 ? `▲ ${row.delta}` : row.delta < 0 ? `▼ ${Math.abs(row.delta)}` : '–',
          row.delta > 0 ? 'text-[11px] font-semibold text-[#1E8E3E]' : row.delta < 0 ? 'text-[11px] font-semibold text-[#D01F2D]' : 'text-[11px] text-[#9CA3AF]',
        ))}
      </div>
    </>
  )

  const standingsSubtitle = `${currentSeason} · ${isFinalStandings ? 'final' : currentWeekLabel ? `through week ${currentWeekLabel}` : 'regular season'}`
  const standingsList = (
    <>
      <div className="grid grid-cols-[20px_minmax(0,1fr)_44px_44px] gap-2 px-3 pb-1 pt-2 text-[11px] text-[#6B7280] lg:px-4">
        <span>#</span><span>Team</span><span className="text-right">W–L</span><span className="text-right">PF</span>
      </div>
      <div className="pb-1 lg:pb-2">
        {currentStandings.map((row, i) => (
          <Link key={row.team} href={`/teams?team=${encodeURIComponent(row.team)}`} className={`group grid grid-cols-[20px_minmax(0,1fr)_44px_44px] items-center gap-2 px-3 py-1.5 transition-colors hover:bg-black/[0.03] lg:px-4 ${i === PLAYOFF_SPOTS - 1 && !isFinalStandings ? 'border-b border-dashed border-[#D6D9DE]' : ''}`}>
            <span className={`text-[13px] font-bold tabular-nums ${i === 0 ? 'text-[#B8860B]' : 'text-[#111]'}`}>{row.standing || i + 1}</span>
            <span className="flex min-w-0 items-center gap-2"><TeamLogo name={row.team} size={20} /><span className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">{row.team}</span></span>
            <span className="text-right text-[13px] font-semibold tabular-nums text-[#111]">{row.w}–{row.l}</span>
            <span className="text-right text-[12px] tabular-nums text-[#6B7280]">{Math.round(row.pf)}</span>
          </Link>
        ))}
      </div>
      {!isFinalStandings && <div className="px-3 pb-2 text-[11px] text-[#9CA3AF] lg:px-4">Dashed line = playoff cut</div>}
    </>
  )

  const leadersFilters = (
    <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 lg:px-4">
      <FilterPill value={sortCategory} onChange={setSortCategory} options={SORT_OPTIONS.map(o => o.label)} label="Stat" neutral hideLabel />
      {sortCat.subs.length > 1 && <FilterPill value={sortSubOpt.label} onChange={setSortSub} options={sortCat.subs.map(s => s.label)} label="Scope" neutral hideLabel />}
    </div>
  )
  const leadersList = (
    <>
      {compactHeader(sortSubOpt.label.length > 8 ? 'Value' : sortSubOpt.label)}
      <div className="pb-1 lg:pb-2">
        {standings.slice(0, 10).map((t, i) => compactRow(t.team, `/teams?team=${encodeURIComponent(t.team)}`, i + 1, t.team, formatLeaderValue(valueForSub(t, sortSubOpt.key))))}
      </div>
    </>
  )

  // Rankings, standings e líderes num card só com abas (desktop e mobile).
  const tablesMeta = {
    pr: { title: 'Power Rankings', subtitle: `${currentSeason} · latest week`, link: cardLink('/powerrankings', 'Full power rankings') },
    standings: { title: 'Standings', subtitle: standingsSubtitle, link: cardLink(`/stats?tab=standings&season=${encodeURIComponent(currentSeason)}`, 'Full standings') },
    leaders: { title: 'Franchise leaders', subtitle: 'All-time', link: cardLink('/records', 'Record book') },
  }
  const tablesTab = tablesMeta[mobileTableTab] ? mobileTableTab : 'pr'
  const tablesCard = (
    <CardShell title={tablesMeta[tablesTab].title} subtitle={tablesMeta[tablesTab].subtitle} sidebar withMenus>
      <div className="px-3 pt-2.5 lg:px-4">
        <Segmented full options={[['pr', 'Rankings'], ['standings', 'Standings'], ['leaders', 'Leaders']]} value={tablesTab} onChange={setMobileTableTab} />
      </div>
      {tablesTab === 'pr' && powerList}
      {tablesTab === 'standings' && standingsList}
      {tablesTab === 'leaders' && <>{leadersFilters}{leadersList}</>}
      <div className="border-t border-[#EEF0F2] py-2 text-center">{tablesMeta[tablesTab].link}</div>
    </CardShell>
  )

  return (
    <PageShell
      loading={leagueLoading || prLoading}
      headerProps={{ onSummaryOpen: () => setDrawerOpen(true) }}
      wide
      topBar={<ScoreStrip onTapitasWeek={week => {
        // Semana sem dados ainda (ex.: a atual): volta para a última semana disponível
        const opt = matchupOptions.find(o => Number(o.week) === week && String(o.season) === String(currentSeason))
          || matchupOptions[matchupOptions.length - 1]
        if (opt) setSelectedMatchupKey(opt.key)
      }} />}
    >
      <div data-sticky-cols className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)_280px] lg:items-start lg:gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px] xl:gap-5">
        <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC] hidden lg:block">
          <LeagueNewsCard onOpenPlayer={openNflPlayer} />
          {tablesCard}
        </aside>

        <div className="min-w-0">
          {heroCard}
          {weekCard}
          {/* Ordem no celular: notícias de jogadores → Tapitas News → rivalry → lesões → rankings → trending → draft
              (a Tapitas News vem antes do rivalry: tem a matéria da rodada toda semana) */}
          <div className="lg:hidden"><LeagueNewsCard onOpenPlayer={openNflPlayer} /></div>
          {newsCard}
          {rivalryCard}
          <div className="lg:hidden"><RosterAlertsCard onOpenPlayer={openNflPlayer} /></div>
          <div className="lg:hidden">
            {tablesCard}
            <TrendingCard onOpenPlayer={openNflPlayer} />
            {draftCard}
          </div>
        </div>

        <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC] hidden lg:block">
          <RosterAlertsCard onOpenPlayer={openNflPlayer} />
          <TrendingCard onOpenPlayer={openNflPlayer} />
          {draftSideCard}
        </aside>
      </div>

      <SummaryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} allSeasons={leagueStats.allSeasons} />

      {selectedPerformer && (
        <PlayerProfileModal
          key={`${selectedPerformer.name}|${selectedPerformer.team}`}
          rawName={selectedPerformer.name}
          displayName={selectedPerformer.data?.shortName || selectedPerformer.name}
          position={selectedPerformer.data?.pos}
          playerId={selectedPerformer.data?.playerId}
          games={gameFactsData}
          initialTeams={[selectedPerformer.team]}
          initialSeasons={selectedPerformer.season ? [String(selectedPerformer.season)] : undefined}
          matchup={{ season: selectedPerformer.season, week: selectedPerformer.week, team: selectedPerformer.team, opponent: selectedPerformer.opponent }}
          onClose={closePerformer}
        />
      )}

      {selectedNflPlayer && (
        <PlayerProfileModal
          key={`nfl-${selectedNflPlayer.id || selectedNflPlayer.name}`}
          rawName={resolveFactsName(factsNameIndex, selectedNflPlayer, nameOwners)}
          displayName={selectedNflPlayer.name}
          position={selectedNflPlayer.pos}
          playerId={selectedNflPlayer.id}
          games={gameFactsData}
          initialTab={selectedNflPlayer.focus}
          onClose={() => setSelectedNflPlayer(null)}
        />
      )}

      {selectedDraftPlayer && (
        <PlayerProfileModal
          key={selectedDraftPlayer.pick.player}
          rawName={resolveDraftName(selectedDraftPlayer.pick.player)}
          displayName={selectedDraftPlayer.data?.shortName || selectedDraftPlayer.pick.player}
          position={selectedDraftPlayer.data?.pos || selectedDraftPlayer.pick.position}
          playerId={selectedDraftPlayer.data?.playerId}
          games={gameFactsData}
          onClose={closeDraftPlayer}
        />
      )}
    </PageShell>
  )
}
