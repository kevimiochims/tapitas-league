'use client'
import Image from 'next/image'
import Link from 'next/link'
import Header from '../components/Header'
import SummaryDrawer from '../components/SummaryDrawer'
import { useEffect, useState, useMemo } from 'react'
import { Trophy, Flame, Swords, Activity, Users, Star, Zap, Shield, Target, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ChevronRight, Skull } from 'lucide-react'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizePlayerKey(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

const NFL_TEAM_NAME_MAP = {
  'cardinals':'ari','arizona':'ari','arizona cardinals':'ari',
  'falcons':'atl','atlanta':'atl','atlanta falcons':'atl',
  'ravens':'bal','baltimore':'bal','baltimore ravens':'bal',
  'bills':'buf','buffalo':'buf','buffalo bills':'buf',
  'panthers':'car','carolina':'car','carolina panthers':'car',
  'bears':'chi','chicago':'chi','chicago bears':'chi',
  'bengals':'cin','cincinnati':'cin','cincinnati bengals':'cin',
  'browns':'cle','cleveland':'cle','cleveland browns':'cle',
  'cowboys':'dal','dallas':'dal','dallas cowboys':'dal',
  'broncos':'den','denver':'den','denver broncos':'den',
  'lions':'det','detroit':'det','detroit lions':'det',
  'packers':'gb','green bay':'gb','green bay packers':'gb',
  'texans':'hou','houston':'hou','houston texans':'hou',
  'colts':'ind','indianapolis':'ind','indianapolis colts':'ind',
  'jaguars':'jax','jacksonville':'jax','jacksonville jaguars':'jax',
  'chiefs':'kc','kansas city':'kc','kansas city chiefs':'kc',
  'chargers':'lac','los angeles chargers':'lac','la chargers':'lac',
  'rams':'lar','los angeles rams':'lar','la rams':'lar',
  'raiders':'lv','las vegas':'lv','las vegas raiders':'lv','oakland':'lv','oakland raiders':'lv',
  'dolphins':'mia','miami':'mia','miami dolphins':'mia',
  'vikings':'min','minnesota':'min','minnesota vikings':'min',
  'patriots':'ne','new england':'ne','new england patriots':'ne',
  'saints':'no','new orleans':'no','new orleans saints':'no',
  'giants':'nyg','new york giants':'nyg','ny giants':'nyg',
  'jets':'nyj','new york jets':'nyj','ny jets':'nyj',
  'eagles':'phi','philadelphia':'phi','philadelphia eagles':'phi',
  'steelers':'pit','pittsburgh':'pit','pittsburgh steelers':'pit',
  'seahawks':'sea','seattle':'sea','seattle seahawks':'sea',
  '49ers':'sf','san francisco':'sf','san francisco 49ers':'sf',
  'buccaneers':'tb','tampa bay':'tb','tampa bay buccaneers':'tb',
  'titans':'ten','tennessee':'ten','tennessee titans':'ten',
  'commanders':'wsh','washington':'wsh','washington commanders':'wsh',
  'redskins':'wsh','washington redskins':'wsh','football team':'wsh',
  'ari':'ari','atl':'atl','bal':'bal','buf':'buf','car':'car','chi':'chi','cin':'cin','cle':'cle',
  'dal':'dal','den':'den','det':'det','gb':'gb','hou':'hou','ind':'ind','jax':'jax','kc':'kc',
  'lac':'lac','lar':'lar','lv':'lv','mia':'mia','min':'min','ne':'ne','no':'no','nyg':'nyg',
  'nyj':'nyj','phi':'phi','pit':'pit','sea':'sea','sf':'sf','tb':'tb','ten':'ten','wsh':'wsh'
}

function getNFLTeamLogo(name) {
  const raw = normalizePlayerKey(name)
    .replace(/\b(d\/st|dst|def|defense|special teams)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const mapped = NFL_TEAM_NAME_MAP[raw]
  return mapped ? `https://a.espncdn.com/i/teamlogos/nfl/500/${mapped}.png` : null
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

function parseMarginVal(val) {
  const cleaned = String(val || '0').replace(',', '.').replace(/[^0-9.]/g, '')
  return parseFloat(cleaned) || 0
}

function normalizeString(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

// Shared team/week helpers used by all record groups.
function normalizeTeamName(value) {
  return normalizeString(value)
}

function isDoubleWeek(game) {
  const week = String(game?.Week || '')
  return week.includes('-') || week.includes('&')
}

function teamHref(name) {
  return `/teams?team=${encodeURIComponent(String(name || '').trim())}`
}

function rivalryHref(teamA, teamB) {
  const a = String(teamA || '').trim()
  const b = String(teamB || '').trim()
  if (!a || !b) return '/rivalries'
  return `/rivalries?teamA=${encodeURIComponent(a)}&teamB=${encodeURIComponent(b)}`
}


function matchupHref(game, allGames = []) {
  if (!game) return '/matchups'

  const season = String(game?.Season || '').trim()
  const week = String(game?.Week || '').trim()
  const team = String(game?.Team || '').trim()
  const opp = String(game?.Opponent || '').trim()

  // Matchups renders one card per matchup and keeps the first row it
  // encounters for each Season + Week + Team/Opponent pair. Some records
  // are naturally represented by the mirrored row (the other team's
  // perspective), so using that row's orientation in the URL can open the
  // correct week but fail to mark the matchup as selected. Canonicalize the
  // URL to the first occurrence of that matchup, matching the Matchups page.
  const canonical = Array.isArray(allGames)
    ? allGames.find((g) => {
        const gs = String(g?.Season || '').trim()
        const gw = String(g?.Week || '').trim()
        const gt = String(g?.Team || '').trim()
        const go = String(g?.Opponent || '').trim()

        if (gs !== season || gw !== week) return false
        return (gt === team && go === opp) || (gt === opp && go === team)
      })
    : null

  const target = canonical || game
  return `/matchups?season=${encodeURIComponent(String(target?.Season || '').trim())}&week=${encodeURIComponent(String(target?.Week || '').trim())}&team=${encodeURIComponent(String(target?.Team || '').trim())}&opp=${encodeURIComponent(String(target?.Opponent || '').trim())}`
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
  // Strip trailing emoji/decorators (e.g. " 🔥") before lookup so names
  // like "H-Lera do Mahl 🔥" still resolve to the correct avatar key
  const clean = String(name || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()
  return TEAM_AVATARS[normalizeString(clean)] || null
}


function getPlayerAvatar(playerId) {
  const id = String(playerId || '').trim()
  return id ? `https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(id)}.jpg` : null
}

function PlayerAvatar({ playerId, name, size = 'md' }) {
  const avatar = getPlayerAvatar(playerId)
  const sizeClass = size === 'sm'
    ? 'h-8 w-8 rounded-full border-2 border-[#16274F]'
    : 'h-10 w-10 rounded-full border-2 border-[#16274F]'

  return (
    <span
      className={`${sizeClass} flex flex-shrink-0 items-center justify-center overflow-hidden bg-white text-[9px] font-black uppercase text-[#16274F]`}
      title={name || ''}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={name || ''}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        String(name || '?').split(/\s+/).map(part => part[0]).join('').slice(0, 2)
      )}
    </span>
  )
}

function PositionBadge({ position }) {
  const pos = String(position || '').trim().toUpperCase()
  if (!pos) return null

  const styles = {
    QB: 'bg-[#D91F2D] text-white',
    RB: 'bg-[#1E8E3E] text-white',
    WR: 'bg-[#16274F] text-white',
    TE: 'bg-[#7C3AED] text-white',
    K: 'bg-[#D97706] text-white',
    DEF: 'bg-[#4B5563] text-white',
    DST: 'bg-[#4B5563] text-white',
  }

  return (
    <span className={`inline-flex min-w-[42px] items-center justify-center border-2 border-[#0A0A0A] px-2 py-1 text-[11px] font-black leading-none ${styles[pos] || 'bg-[#F7F6F2] text-[#16274F]'}`}>
      {pos}
    </span>
  )
}

function TeamAvatar({ team, size = 'md' }) {
  const avatar = getTeamAvatar(team)

  const sizeClass =
    size === 'sm'
      ? 'h-8 w-8 rounded-full border-2 border-[#16274F]'
      : size === 'lg'
        ? 'h-12 w-12 rounded-full border-2 border-[#16274F]'
        : 'h-10 w-10 rounded-full border-2 border-[#16274F]'

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={team}
        className={`${sizeClass} object-cover flex-shrink-0 bg-white`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} flex flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black uppercase text-white bg-[#16274F]`}
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
      }}
    >
      {String(team || '').slice(0, 2)}
    </div>
  )
}

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch { return [] }
}

function RecordCard({ label, value, sub, sub2, sub2Href, subHref, subItems, accent, icon: Icon, top5, wide, team, player }) {
  const [expanded, setExpanded] = useState(false)

  const accents = {
    gold: {
      border: 'border-[#F5C518]',
      bg: 'bg-[#FFF9E5]',
      text: 'text-[#16274F]',
      value: 'text-[#16274F]',
      icon: 'bg-[#F5C518] text-[#0A0A0A] border-[#0A0A0A]',
    },
    cyan: {
      border: 'border-[#16274F]',
      bg: 'bg-white',
      text: 'text-[#16274F]',
      value: 'text-[#16274F]',
      icon: 'bg-[#16274F] text-white border-[#0A0A0A]',
    },
    emerald: {
      border: 'border-[#1E8E3E]',
      bg: 'bg-[#F4FAF5]',
      text: 'text-[#1E8E3E]',
      value: 'text-[#16274F]',
      icon: 'bg-[#1E8E3E] text-white border-[#0A0A0A]',
    },
    red: {
      border: 'border-[#D01F2D]',
      bg: 'bg-[#FFF3F4]',
      text: 'text-[#D01F2D]',
      value: 'text-[#16274F]',
      icon: 'bg-[#D01F2D] text-white border-[#0A0A0A]',
    },
    purple: {
      border: 'border-[#16274F]',
      bg: 'bg-[#F3F7FF]',
      text: 'text-[#16274F]',
      value: 'text-[#16274F]',
      icon: 'bg-[#16274F] text-white border-[#0A0A0A]',
    },
    orange: {
      border: 'border-[#D97706]',
      bg: 'bg-[#FFF7ED]',
      text: 'text-[#D97706]',
      value: 'text-[#16274F]',
      icon: 'bg-[#F5C518] text-[#0A0A0A] border-[#0A0A0A]',
    },
    slate: {
      border: 'border-[#16274F]',
      bg: 'bg-[#F7F6F2]',
      text: 'text-[#16274F]',
      value: 'text-[#16274F]',
      icon: 'bg-[#16274F] text-white border-[#0A0A0A]',
    },
  }

  const a = accents[accent] || accents.slate
  const subArr = Array.isArray(sub) ? sub.filter(Boolean) : sub ? [sub] : []
  const teamArr = Array.isArray(team) ? team.filter(Boolean) : team ? [team] : []

  return (
    <div className={`flex h-full flex-col border-2 shadow-[4px_4px_0_#16274F] ${a.border} ${a.bg} ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          {Icon ? (
            <div className={`flex h-9 w-9 items-center justify-center border-2 shadow-[2px_2px_0_#0A0A0A] ${a.icon}`}>
              <Icon className="h-4 w-4" />
            </div>
          ) : <div />}

          {Array.isArray(player) && player.length > 0 ? (
            <div className="flex flex-wrap items-center justify-end">
              {player.map((item, i) => (
                <span key={`${item.playerId || item.name}-${i}`} className={i > 0 ? '-ml-2' : ''}>
                  <PlayerAvatar playerId={item.playerId} name={item.name} size="md" />
                </span>
              ))}
            </div>
          ) : teamArr.length > 0 && (
            <div className="flex flex-wrap items-center justify-end">
              {teamArr.map((teamName, i) => (
                <Link key={`${teamName}-${i}`} href={teamHref(teamName)} className={i > 0 ? '-ml-2' : ''} aria-label={`Open ${teamName}`}>
                  <TeamAvatar team={teamName} size="md" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>

        <div
          className={`leading-none ${a.value}`}
          style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(40px, 6vw, 58px)' }}
        >
          {value}
        </div>

        {(subArr.length > 0 || (Array.isArray(subItems) && subItems.length > 0) || sub2) && (
          <div className="mt-auto flex min-h-[3.5rem] flex-col justify-end pt-3">
            {(subArr.length > 0 || (Array.isArray(subItems) && subItems.length > 0)) && (
              <div className="flex flex-col justify-end gap-0.5">
            {Array.isArray(subItems) && subItems.length > 0
              ? subItems.map((item, i) => (
                  item?.href ? (
                    <Link key={i} href={item.href} className="flex items-center gap-2 text-sm font-black leading-tight text-[#0A0A0A] hover:text-[#D01F2D] sm:text-[15px]">
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 truncate">{item.text}</span>
                          {item?.position && <PositionBadge position={item.position} />}
                        </span>
                        {item?.meta && (
                          <span className="mt-0.5 block truncate text-xs font-semibold leading-tight text-slate-500">
                            {item.meta}
                          </span>
                        )}
                      </span>
                    </Link>
                  ) : (
                    <div key={i} className="flex items-center gap-2 text-sm font-black leading-tight text-[#0A0A0A] sm:text-[15px]">
                      <span className="min-w-0 truncate">{item?.text || ''}</span>
                      {item?.position && <PositionBadge position={item.position} />}
                    </div>
                  )
                ))
              : subArr.map((s, i) => (
                  subHref ? (
                    <Link key={i} href={subHref} className="text-sm font-black leading-tight text-[#0A0A0A] hover:text-[#D01F2D] sm:text-[15px]">
                      {s}
                    </Link>
                  ) : (
                    <div key={i} className="text-sm font-black leading-tight text-[#0A0A0A] sm:text-[15px]">
                      {s}
                    </div>
                  )
                ))}
              </div>
            )}

            {sub2 && !(label === 'Most Rostered' || label === 'Most Started') && (sub2Href ? (
              <Link href={sub2Href} className="mt-1 text-xs font-semibold text-slate-500 hover:text-[#D01F2D]">{sub2}</Link>
            ) : (
              <div className="mt-1 text-xs font-semibold text-slate-500">{sub2}</div>
            ))}
          </div>
        )}
      </div>

      {top5 && top5.length > 1 && (
        <div className="border-t-2 border-[#16274F]/15">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-black/[0.03]"
          >
            <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${a.text}`}>
              {expanded ? 'Hide Top 5' : 'Show Top 5'}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4 text-[#16274F]" /> : <ChevronDown className="h-4 w-4 text-[#16274F]" />}
          </button>

          {expanded && (
            <div className="border-t-2 border-[#16274F]/10 px-4 pb-3">
              {top5.slice(0, 5).map((item, i) => {
                const labelText = Array.isArray(item.label) ? item.label.join(', ') : item.label
                const isPlayer = Boolean(item.playerId || item.position)
                const showAvatar = !Array.isArray(item.label) && !String(labelText).includes(' vs ')

                return (
                  (() => {
                    const rowContent = (
                      <>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className={`w-5 flex-shrink-0 text-sm font-black ${i === 0 ? a.text : 'text-slate-500'}`}>
                            {i + 1}
                          </span>
                          {showAvatar && (isPlayer ? (
                            <span className="flex-shrink-0" aria-hidden="true">
                              <PlayerAvatar playerId={item.playerId} name={labelText} size="sm" />
                            </span>
                          ) : (
                            <span className="flex-shrink-0" aria-hidden="true">
                              <TeamAvatar team={item.team || labelText} size="sm" />
                            </span>
                          ))}
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="min-w-0 truncate text-sm font-bold leading-tight text-[#0A0A0A]">{labelText}</div>
                              {isPlayer && <PositionBadge position={item.position} />}
                            </div>
                            {item.meta && <div className="mt-0.5 text-xs font-semibold leading-tight text-slate-500">{item.meta}</div>}
                            {item.sub && <div className="mt-0.5 text-xs font-semibold leading-tight text-slate-500">{item.sub}</div>}
                          </div>
                        </div>
                        <span className={`flex-shrink-0 text-base font-black ${i === 0 ? a.text : 'text-[#16274F]'}`}>
                          {item.value}
                        </span>
                      </>
                    )
                    return item.href ? (
                      <Link href={item.href} key={i} className="flex items-center justify-between gap-3 border-b border-[#16274F]/10 py-2.5 last:border-0 hover:bg-black/[0.03]">
                        {rowContent}
                      </Link>
                    ) : (
                      <div key={i} className="flex items-center justify-between gap-3 border-b border-[#16274F]/10 py-2.5 last:border-0">
                        {rowContent}
                      </div>
                    )
                  })()
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RecordSection({ title, children }) {
  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#16274F]">{title}</h2>
        <div className="h-[2px] flex-1 bg-[#16274F]/15" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </div>
  )
}

const TABS = [
  { key: 'franchise', label: 'Franchise', Icon: Shield },
  { key: 'streaks', label: 'Streaks', Icon: Flame },
  { key: 'games', label: 'Games', Icon: Activity },
  { key: 'players', label: 'Players', Icon: Users },
  { key: 'seasons', label: 'Seasons', Icon: Star },
  { key: 'rivalry', label: 'Rivalries', Icon: Swords },
  { key: 'glory', label: 'Glory', Icon: Trophy },
  { key: 'shame', label: 'Shame', Icon: Skull },
]

export default function RecordsPage() {
  const [allTime, setAllTime] = useState([])
  const [history, setHistory] = useState([])
  const [games, setGames] = useState([])
  const [h2h, setH2h] = useState([])
  const [playerCache, setPlayerCache] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('franchise')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [allSeasons, setAllSeasons] = useState([])

  useEffect(() => {
    async function load() {
      const [at, hi, ga, h2hData, pc] = await Promise.all([
        safeFetch(`${BASE_URL}/TEAM_ALL_TIME`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        safeFetch(`${BASE_URL}/HEAD_TO_HEAD_SORTED`),
        safeFetch(`${BASE_URL}/_PLAYER_CACHE`),
      ])
      setAllTime(at)
      setHistory(hi)
      const seasons = [
        ...new Set(
          hi
            .map(r => Number(r?.Season))
            .filter(Boolean)
        )
      ].sort((a, b) => a - b)

      setAllSeasons(seasons)
      setGames(ga)
      setH2h(h2hData)
      setPlayerCache(pc)
      setLoading(false)
    }
    load()
  }, [])

  // ── FRANCHISE ──────────────────────────────────────────────────────
  const franchiseRecords = useMemo(() => {
    if (!allTime.length) return {}

    const topN = (arr, key, n = 5, asc = false, fmt = v => v) => {
      const sorted = [...arr].sort((a, b) =>
        asc ? parseNumber(a[key]) - parseNumber(b[key]) : parseNumber(b[key]) - parseNumber(a[key])
      )
      const topVal = parseNumber(sorted[0]?.[key])
      const winners = sorted.filter(r => parseNumber(r[key]) === topVal).map(r => String(r.Team || '').trim())
      return {
        value: fmt(topVal),
        teams: winners,
        top5: sorted.slice(0, n).map(r => ({ label: String(r.Team || '').trim(), value: fmt(parseNumber(r[key])) }))
      }
    }

    const parseWinPct = r => parseNumber(String(r?.['W%'] || '0').replace('%', ''))
    const sortedByWP = [...allTime].sort((a, b) => parseWinPct(b) - parseWinPct(a))
    const topWP = parseWinPct(sortedByWP[0])
    const bestWinPct = {
      value: String(sortedByWP[0]?.['W%'] || ''),
      teams: sortedByWP.filter(r => parseWinPct(r) === topWP).map(r => String(r.Team || '').trim()),
      top5: sortedByWP.slice(0, 5).map(r => ({ label: String(r.Team || '').trim(), value: String(r['W%'] || '') }))
    }

    // 10W seasons — track which years
    const tenWSeasons = {}, tenWTotal = {}
    const tenWSeasonsYears = {}, tenWTotalYears = {}
    history.forEach(r => {
      const team = String(r?.Team || '').trim()
      const season = String(r?.Season || '').trim()
      if (parseNumber(r?.RS_W) >= 10) {
        tenWSeasons[team] = (tenWSeasons[team] || 0) + 1
        if (!tenWSeasonsYears[team]) tenWSeasonsYears[team] = []
        tenWSeasonsYears[team].push(season)
      }
      if (parseNumber(r?.W) >= 10) {
        tenWTotal[team] = (tenWTotal[team] || 0) + 1
        if (!tenWTotalYears[team]) tenWTotalYears[team] = []
        tenWTotalYears[team].push(season)
      }
    })
    const mkObj = (obj, yearsObj) => {
      const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1])
      const topVal = sorted[0]?.[1] || 0
      return {
        value: topVal,
        teams: sorted.filter(e => e[1] === topVal).map(e => e[0]),
        top5: sorted.slice(0, 5).map(([team, count]) => ({
          label: team,
          sub: (yearsObj[team] || []).sort().join(', '),
          value: count
        }))
      }
    }

    const mkPR = obj => {
      const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1])
      const topVal = sorted[0]?.[1] || 0
      return { value: topVal, teams: sorted.filter(e => e[1] === topVal).map(e => e[0]), top5: sorted.slice(0, 5).map(([l, v]) => ({ label: l, value: v })) }
    }

    // PR #1 weeks — Reg Season only
    // Same eligibility rule used by Weekly High Scorer (RS): playoff and
    // consolation weeks do not count because not every team can compete for #1.
    const pr1All = {}, pr1from21 = {}, pr1from23 = {}
    games.forEach(g => {
      if (String(g?.GameStage || '').trim() !== 'Reg Season') return
      if (parseNumber(g?.['Power Ranking']) !== 1) return
      const team = String(g?.Team || '').trim()
      const season = Number(String(g?.Season || '0').trim())
      pr1All[team] = (pr1All[team] || 0) + 1
      if (season >= 2021) pr1from21[team] = (pr1from21[team] || 0) + 1
      if (season >= 2023) pr1from23[team] = (pr1from23[team] || 0) + 1
    })

    // Playoff finals years per team
    const finalsYearsMap = {}
    history.filter(r => String(r?.Reached_Final || '').toUpperCase() === 'TRUE').forEach(r => {
      const t = String(r?.Team || '').trim()
      const s = String(r?.Season || '').trim()
      if (!finalsYearsMap[t]) finalsYearsMap[t] = []
      finalsYearsMap[t].push(s)
    })

    const mostPoAppsRaw = topN(allTime, 'Playoff Apps')
    const mostFinalsRaw = topN(allTime, 'Finals')

    // Enrich finals top5 with years
    const mostFinalsEnriched = {
      ...mostFinalsRaw,
      top5: mostFinalsRaw.top5.map(item => ({
        ...item,
        sub: (finalsYearsMap[item.label] || []).sort().join(', ')
      }))
    }

    // Enrich playoff apps top5 with years (from history)
    const poAppsYearsMap = {}
    history.filter(r => parseNumber(r?.PO_W) + parseNumber(r?.PO_L) > 0).forEach(r => {
      const t = String(r?.Team || '').trim()
      const s = String(r?.Season || '').trim()
      if (!poAppsYearsMap[t]) poAppsYearsMap[t] = []
      poAppsYearsMap[t].push(s)
    })
    const mostPoAppsEnriched = {
      ...mostPoAppsRaw,
      top5: mostPoAppsRaw.top5.map(item => ({
        ...item,
        sub: (poAppsYearsMap[item.label] || []).sort().join(', ')
      }))
    }

    // Most winning seasons (RS: RS_W > RS_L; Total: W > L)
    const winSeasonsRS = {}, winSeasonsRSYears = {}
    const winSeasonsTot = {}, winSeasonsTotYears = {}
    history.forEach(r => {
      const team = String(r?.Team || '').trim()
      const season = String(r?.Season || '').trim()
      if (parseNumber(r?.RS_W) > parseNumber(r?.RS_L)) {
        winSeasonsRS[team] = (winSeasonsRS[team] || 0) + 1
        if (!winSeasonsRSYears[team]) winSeasonsRSYears[team] = []
        winSeasonsRSYears[team].push(season)
      }
      if (parseNumber(r?.W) > parseNumber(r?.L)) {
        winSeasonsTot[team] = (winSeasonsTot[team] || 0) + 1
        if (!winSeasonsTotYears[team]) winSeasonsTotYears[team] = []
        winSeasonsTotYears[team].push(season)
      }
    })

    // Weekly High Scorer — Reg Season only
    // For each (Season, Week), find the team with the highest PF.
    // Group all RS games by season+week, find max PF per group, count per team.
    const weeklyHighMap = {}
    const weeklyHighYears = {}
    const rsByWeek = {}
    games.forEach(g => {
      if (String(g?.GameStage || '').trim() !== 'Reg Season') return
      const season = String(g?.Season || '').trim()
      const week = String(g?.Week || '').trim()
      const team = String(g?.Team || '').trim()
      const pf = parseNumber(g?.PF)
      if (!season || !week || !team || pf <= 0) return
      const key = `${season}|${week}`
      if (!rsByWeek[key] || pf > rsByWeek[key].pf) {
        rsByWeek[key] = { season, week, team, pf }
      }
    })
    Object.values(rsByWeek).forEach(({ season, team }) => {
      weeklyHighMap[team] = (weeklyHighMap[team] || 0) + 1
      if (!weeklyHighYears[team]) weeklyHighYears[team] = {}
      weeklyHighYears[team][season] = (weeklyHighYears[team][season] || 0) + 1
    })
    const mkWeeklyHighRecord = (weeks, years) => {
      const sorted = Object.entries(weeks).sort((a, b) => b[1] - a[1])
      const topVal = sorted[0]?.[1] || 0
      return {
        value: topVal,
        teams: sorted.filter(e => e[1] === topVal).map(e => e[0]),
        top5: sorted.slice(0, 5).map(([team, count]) => ({
          label: team,
          sub: Object.entries(years[team] || {}).sort().map(([yr, n]) => `${yr}(${n})`).join(', '),
          value: count
        }))
      }
    }
    // Filter variants for 2021+ and 2023+
    const weeklyHighMap21 = {}, weeklyHighYears21 = {}
    const weeklyHighMap23 = {}, weeklyHighYears23 = {}
    Object.values(rsByWeek).forEach(({ season, team }) => {
      if (Number(season) >= 2021) {
        weeklyHighMap21[team] = (weeklyHighMap21[team] || 0) + 1
        if (!weeklyHighYears21[team]) weeklyHighYears21[team] = {}
        weeklyHighYears21[team][season] = (weeklyHighYears21[team][season] || 0) + 1
      }
      if (Number(season) >= 2023) {
        weeklyHighMap23[team] = (weeklyHighMap23[team] || 0) + 1
        if (!weeklyHighYears23[team]) weeklyHighYears23[team] = {}
        weeklyHighYears23[team][season] = (weeklyHighYears23[team][season] || 0) + 1
      }
    })
    const mostWeeklyHigh = mkWeeklyHighRecord(weeklyHighMap, weeklyHighYears)
    const mostWeeklyHigh21 = mkWeeklyHighRecord(weeklyHighMap21, weeklyHighYears21)
    const mostWeeklyHigh23 = mkWeeklyHighRecord(weeklyHighMap23, weeklyHighYears23)

    return {
      mostWins: topN(allTime, 'W'),
      mostLosses: topN(allTime, 'L'),
      bestWinPct,
      mostPF: topN(allTime, 'PF', 5, false, v => Math.round(v).toLocaleString()),
      mostPoApps: mostPoAppsEnriched,
      mostFinals: mostFinalsEnriched,
      mostTitles: topN(allTime, 'Titles'),
      mostPoW: topN(allTime, 'PO_W'),
      topTenRS: mkObj(tenWSeasons, tenWSeasonsYears),
      topTenTot: mkObj(tenWTotal, tenWTotalYears),
      mostWinSeasonsRS: mkObj(winSeasonsRS, winSeasonsRSYears),
      mostWinSeasonsTot: mkObj(winSeasonsTot, winSeasonsTotYears),
      mostWeeklyHigh,
      mostWeeklyHigh21,
      mostWeeklyHigh23,
      pr1All: mkPR(pr1All),
      pr1from21: mkPR(pr1from21),
      pr1from23: mkPR(pr1from23),
    }
  }, [allTime, history, games])

  // ── STREAKS ────────────────────────────────────────────────────────
  const streakRecords = useMemo(() => {
    if (!allTime.length || !games.length) return {}

    const parseStrVal = val => parseNumber(String(val || '0').replace(/[WL]/i, ''))

    // Find the most recent season in the dataset for active detection
    const maxSeason = Math.max(...games.map(g => parseNumber(g?.Season || 0)).filter(Boolean))

    // Build chronological game list per team (all stages)
    const byTeam = {}
    games.forEach(g => {
      const team = String(g?.Team || '').trim()
      if (!team) return
      const season = parseNumber(g?.Season || 0)
      const rawWeek = String(g?.Week || '').trim()
      const weekNum = parseFloat(rawWeek.replace(/[^0-9.]/g, '')) || 0
      // Streak_Total = across all games; Streak / Streak_RS = reg season only
      const streakTotal = parseNumber(g?.Streak_Total || g?.Streak_total || 0)
      const streakRS = parseNumber(g?.Streak_RS || g?.Streak || 0)
      if (!byTeam[team]) byTeam[team] = []
      byTeam[team].push({ season, weekNum, rawWeek, streak: streakTotal, streakRS })
    })

    // For a given team + streak column, find when the best streak started and ended
    const findStreakRange = (teamGames, getStreak, bestVal) => {
      const sorted = [...teamGames].sort((a, b) =>
        a.season !== b.season ? a.season - b.season : a.weekNum - b.weekNum
      )
      // Find peak index (last time value reaches bestVal — most recent streak)
      // Using findLastIndex equivalent: if we used findIndex we'd get the oldest
      // occurrence, which could point to a different season (e.g. 2016 instead of 2025)
      // when the team matched the same streak length more than once.
      let peakIdx = -1
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (Math.abs(getStreak(sorted[i])) === bestVal) { peakIdx = i; break }
      }
      if (peakIdx === -1) return null
      // Walk back to find start (where streak becomes 1 or -1)
      const sign = getStreak(sorted[peakIdx]) > 0 ? 1 : -1
      let startIdx = peakIdx
      for (let i = peakIdx; i >= 0; i--) {
        if (getStreak(sorted[i]) === sign) { startIdx = i; break }
      }
      const start = sorted[startIdx]
      const end = sorted[peakIdx]
      // Active: last game of team is in maxSeason and streak is still going
      const last = sorted[sorted.length - 1]
      const isActive = last.season === maxSeason && Math.abs(getStreak(last)) >= bestVal
      const fmtWeek = (g) => `Week ${g.rawWeek}, ${g.season}`
      return { start: fmtWeek(start), end: fmtWeek(end), active: isActive }
    }

    const mkStreakTop = (key, useRS = false) => {
      const sorted = [...allTime].sort((a, b) => parseStrVal(b[key]) - parseStrVal(a[key]))
      const topVal = parseStrVal(sorted[0]?.[key])

      const enriched = sorted.slice(0, 5).map(r => {
        const team = String(r.Team || '').trim()
        const val = String(r[key] || '')
        const teamGames = byTeam[team] || []
        const getStreak = useRS ? (g => g.streakRS) : (g => g.streak)
        const range = findStreakRange(teamGames, getStreak, parseStrVal(r[key]))
        const rangeSub = range
          ? `${range.start} → ${range.end}${range.active ? ' · Active' : ''}`
          : ''
        return { label: team, value: val, sub: rangeSub, active: range?.active }
      })

      // Hero sub: for RS, just team names. For Total, include range.
      const topTeams = sorted.filter(r => parseStrVal(r[key]) === topVal)
      const topSubs = topTeams.map(r => {
        const team = String(r.Team || '').trim()
        if (useRS) return team  // RS: no range in hero sub
        // Total: include range in hero sub
        const teamGames = byTeam[team] || []
        const range = findStreakRange(teamGames, g => g.streak, topVal)
        return range
          ? `${team}${range.active ? ' 🔥' : ''}`
          : team
      })

      return {
        value: String(sorted[0]?.[key] || '—'),
        teams: topSubs,
        top5: enriched,
      }
    }

    // Single season — calcula pela coluna Result
    const byTeamSeason = {}
    games.forEach(g => {
      const team = String(g?.Team || '').trim()
      const season = String(g?.Season || '').trim()
      const key = `${team}|${season}`
      if (!byTeamSeason[key]) byTeamSeason[key] = []
      byTeamSeason[key].push({
        week: parseFloat(String(g?.Week || '0').replace(/[^0-9.]/g, '')) || 0,
        rawWeek: String(g?.Week || '').trim(),
        result: String(g?.Result || '').trim().toUpperCase(),
        team, season,
      })
    })

    const seasonWList = [], seasonLList = []

    Object.entries(byTeamSeason).forEach(([, gamesArr]) => {
      const sorted = gamesArr.sort((a, b) => a.week - b.week)
      const { team, season } = sorted[0]

      let curW = 0, maxW = 0, curL = 0, maxL = 0
      sorted.forEach(g => {
        if (g.result === 'W') { curW++; curL = 0; if (curW > maxW) maxW = curW }
        else if (g.result === 'L') { curL++; curW = 0; if (curL > maxL) maxL = curL }
      })

      if (maxW > 0) seasonWList.push({ team, season, val: maxW, display: `W${maxW}` })
      if (maxL > 0) seasonLList.push({ team, season, val: maxL, display: `L${maxL}` })
    })

    seasonWList.sort((a, b) => b.val - a.val)
    seasonLList.sort((a, b) => b.val - a.val)

    const topWVal = seasonWList[0]?.val || 0
    const topLVal = seasonLList[0]?.val || 0

    const bestSeasonW = {
      value: seasonWList[0]?.display || '—',
      teams: seasonWList.filter(r => r.val === topWVal).map(r => `${r.team} (${r.season})`),
      top5: seasonWList.slice(0, 5).map(r => ({ label: r.team, sub: String(r.season), value: r.display }))
    }
    const bestSeasonL = {
      value: seasonLList[0]?.display || '—',
      teams: seasonLList.filter(r => r.val === topLVal).map(r => `${r.team} (${r.season})`),
      top5: seasonLList.slice(0, 5).map(r => ({ label: r.team, sub: String(r.season), value: r.display }))
    }

    return {
      bestWTotal: mkStreakTop('W Streak Total', false),
      bestWRS: mkStreakTop('W Streak RS', true),
      bestLTotal: mkStreakTop('L Streak Total', false),
      bestLRS: mkStreakTop('L Streak RS', true),
      bestSeasonW,
      bestSeasonL,
    }
  }, [allTime, games])

  // ── GAMES ──────────────────────────────────────────────────────────
  const gameRecords = useMemo(() => {
    if (!games.length) return {}

    // Each game in GAME_FACTS_ALL has two rows (one per team's perspective),
    // both sharing the same Season/Week/Team-Opponent pair once sorted.
    // For matchup-level stats (margin, closest/biggest game) we want exactly
    // one row per game — but it must be the WINNER's row (PF > PA), otherwise
    // mkBiggest's `PF > PA` filter can drop the entire game if the loser's
    // row happens to be the one that survives deduping.
    const dedup = arr => {
      const byKey = new Map()
      arr.forEach(g => {
        const key = [String(g?.Season || ''), String(g?.Week || ''), String(g?.Team || ''), String(g?.Opponent || '')].sort().join('|')
        const existing = byKey.get(key)
        if (!existing) {
          byKey.set(key, g)
          return
        }
        // Prefer the row with the higher PF (the winner's perspective)
        if (parseNumber(g?.PF) > parseNumber(existing?.PF)) {
          byKey.set(key, g)
        }
      })
      return Array.from(byKey.values())
    }

    const allDedup = dedup(games)
    const regDedup = dedup(games.filter(g => String(g?.GameStage || '').trim() === 'Reg Season'))
    const poDedup = dedup(games.filter(g => String(g?.GameStage || '').trim() === 'Playoffs'))
    const noDouble = allDedup.filter(g => !isDoubleWeek(g))
    const regNoDb = regDedup.filter(g => !isDoubleWeek(g))
    const poNoDb = poDedup.filter(g => !isDoubleWeek(g))

    const mkHighest = arr => {
      const sorted = [...arr].filter(g => parseNumber(g?.PF) > 0).sort((a, b) => parseNumber(b.PF) - parseNumber(a.PF))
      const topVal = parseNumber(sorted[0]?.PF)
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => parseNumber(g.PF) === topVal).map(g => String(g.Team || '').trim()),
        sub2: sorted[0] ? `vs ${String(sorted[0].Opponent || '').trim()} · Week ${sorted[0].Week} ${sorted[0].Season}` : '',
        sub2Href: sorted[0] ? matchupHref(sorted[0], games) : null,
        top5: sorted.slice(0, 5).map(g => ({ label: String(g.Team || '').trim(), sub: `vs ${String(g.Opponent || '').trim()} · Week ${g.Week} ${g.Season}`, value: parseNumber(g.PF).toFixed(2), href: matchupHref(g, games) }))
      }
    }

    const mkLowest = arr => {
      const sorted = [...arr].filter(g => parseNumber(g?.PF) > 0).sort((a, b) => parseNumber(a.PF) - parseNumber(b.PF))
      const topVal = parseNumber(sorted[0]?.PF)
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => parseNumber(g.PF) === topVal).map(g => String(g.Team || '').trim()),
        sub2: sorted[0] ? `vs ${String(sorted[0].Opponent || '').trim()} · Week ${sorted[0].Week} ${sorted[0].Season}` : '',
        sub2Href: sorted[0] ? matchupHref(sorted[0], games) : null,
        top5: sorted.slice(0, 5).map(g => ({ label: String(g.Team || '').trim(), sub: `vs ${String(g.Opponent || '').trim()} · Week ${g.Week} ${g.Season}`, value: parseNumber(g.PF).toFixed(2), href: matchupHref(g, games) }))
      }
    }

    const mkClosest = arr => {
      const sorted = [...arr]
        .filter(g => parseNumber(g?.PF) > 0 && parseNumber(g?.PA) > 0)
        .map(g => ({ ...g, margin: Math.abs(parseNumber(g.PF) - parseNumber(g.PA)) }))
        .sort((a, b) => a.margin - b.margin)
      const topVal = sorted[0]?.margin || 0
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => Math.abs(g.margin - topVal) < 0.001).map(g => `${String(g.Team || '').trim()} vs ${String(g.Opponent || '').trim()}`),
        sub2: sorted[0] ? `Week ${sorted[0].Week} ${sorted[0].Season}` : '',
        sub2Href: sorted[0] ? matchupHref(sorted[0], games) : null,
        top5: sorted.slice(0, 5).map(g => ({ label: `${String(g.Team || '').trim()} vs ${String(g.Opponent || '').trim()}`, sub: `Week ${g.Week} ${g.Season}`, value: g.margin.toFixed(2), href: matchupHref(g, games) }))
      }
    }

    const mkBiggest = arr => {
      const sorted = [...arr]
        .filter(g => parseNumber(g?.PF) > parseNumber(g?.PA))
        .map(g => ({ ...g, margin: parseNumber(g.PF) - parseNumber(g.PA) }))
        .sort((a, b) => b.margin - a.margin)
      const topVal = sorted[0]?.margin || 0
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => Math.abs(g.margin - topVal) < 0.001).map(g => `${String(g.Team || '').trim()} vs ${String(g.Opponent || '').trim()}`),
        sub2: sorted[0] ? `Week ${sorted[0].Week} ${sorted[0].Season}` : '',
        sub2Href: sorted[0] ? matchupHref(sorted[0], games) : null,
        top5: sorted.slice(0, 5).map(g => ({ label: `${String(g.Team || '').trim()} vs ${String(g.Opponent || '').trim()}`, sub: `Week ${g.Week} ${g.Season}`, value: g.margin.toFixed(2), href: matchupHref(g, games) }))
      }
    }

    // Most games over 200 pts — deduplicate per team+season+week (not matchup)
    // so both sides of a game are counted independently
    const over200 = {}
    const over200Seen = new Set()
    games.filter(g => !isDoubleWeek(g)).forEach(g => {
      const team = String(g?.Team || '').trim()
      const key = `${team}|${String(g?.Season || '')}|${String(g?.Week || '')}`
      if (over200Seen.has(key)) return
      over200Seen.add(key)
      if (parseNumber(g?.PF) >= 200) {
        over200[team] = (over200[team] || 0) + 1
      }
    })
    const over200Sorted = Object.entries(over200).sort((a, b) => b[1] - a[1])
    const topOver200 = over200Sorted[0]?.[1] || 0
    const most200 = {
      value: topOver200,
      teams: over200Sorted.filter(e => e[1] === topOver200).map(e => e[0]),
      top5: over200Sorted.slice(0, 5).map(([team, cnt]) => ({ label: team, value: cnt }))
    }

    return {
      highAll: mkHighest(allDedup),
      highNoDouble: mkHighest(noDouble),
      highReg: mkHighest(regDedup),
      highRegNoDb: mkHighest(regNoDb),
      highPO: mkHighest(poDedup),
      highPONoDb: mkHighest(poNoDb),
      // Lowest score is a TEAM score, not a matchup score. Keep both mirrored rows
      // so the losing side's lower PF can also qualify as the record.
      // Lowest score: single weeks only. Double weeks are excluded from all
      // three versions because a double-week total is not comparable to a
      // normal weekly score.
      lowSingle: mkLowest(games.filter(g => !isDoubleWeek(g))),
      lowSingleSince21: mkLowest(games.filter(g => !isDoubleWeek(g) && (parseInt(g?.Season, 10) || 0) >= 2021)),
      lowSingleSince23: mkLowest(games.filter(g => !isDoubleWeek(g) && (parseInt(g?.Season, 10) || 0) >= 2023)),
      closestAll: mkClosest(allDedup),
      closestNoDouble: mkClosest(noDouble),
      biggestAll: mkBiggest(allDedup),
      biggestNoDouble: mkBiggest(noDouble),
      most200,
    }
  }, [games])

  // ── PLAYERS ────────────────────────────────────────────────────────
  // Player records are derived from the same GAME_FACTS_ALL roster/points
  // logic used by the Teams Player Profile. A player-franchise pair is the
  // unit of record, so the same player can hold different records for
  // different franchises.
  const playerRecords = useMemo(() => {
    if (!games.length) return {}

    const lookup = new Map()
    playerCache.forEach(row => {
      const playerId = String(row?.player_id || '').trim()
      const abbreviated = String(row?.name || '').trim()
      const fullName = String(row?.full_name || '').trim()
      const position = String(row?.pos || row?.position || row?.Position || '').trim().toUpperCase()
      if (!playerId) return
      const entry = { playerId, abbreviated, fullName, position }
      ;[abbreviated, fullName].filter(Boolean).forEach(value => {
        const key = normalizePlayerKey(value)
        if (key && !lookup.has(key)) lookup.set(key, entry)
      })
    })

    const displayName = raw => {
      const value = String(raw || '').trim()
      const data = lookup.get(normalizePlayerKey(value))
      return data?.abbreviated || data?.fullName || value
    }

    const positionOf = raw => {
      const value = String(raw || '').trim()
      const data = lookup.get(normalizePlayerKey(value))
      if (data?.position) return data.position
      return getNFLTeamLogo(value) ? 'DEF' : ''
    }

    const identityOf = raw => {
      const value = String(raw || '').trim()
      const data = lookup.get(normalizePlayerKey(value))
      return data?.playerId ? `id:${data.playerId}` : `name:${normalizePlayerKey(value)}`
    }

    const buildEra = minSeason => {
      const map = new Map()

      games.forEach(game => {
        const season = Number(game?.Season) || 0
        if (minSeason && season < minSeason) return

        const team = String(game?.Team || '').trim()
        if (!team) return

        // One GAME_FACTS_ALL row is one franchise's game. Therefore a double
        // week is already one roster/start appearance and must not be counted
        // twice. This matches the Player Profile logic.
        const appearances = extractPlayerAppearances(game)
        const seen = new Set()

        appearances.forEach(app => {
          const rawName = String(app?.name || '').trim()
          if (!rawName || getNFLTeamLogo(rawName)) return

          const identity = identityOf(rawName)
          const key = `${normalizeTeamName(team)}|${identity}`
          if (seen.has(identity)) return
          seen.add(identity)

          if (!map.has(key)) {
            map.set(key, {
              identity,
              playerId: lookup.get(normalizePlayerKey(rawName))?.playerId || '',
              team,
              name: displayName(rawName),
              position: positionOf(rawName),
              rostered: 0,
              started: 0,
              totalPts: 0,
              avgCount: 0,
              bestPts: 0,
              bestGame: null,
              lastGame: null,
              appearances: 0,
            })
          }

          const entry = map.get(key)
          entry.rostered += 1
          entry.appearances += 1
          entry.lastGame = game
          if (app.status === 'Starter') entry.started += 1

          const doubleWeek = isDoubleWeek(game)
          const adjustedPts = doubleWeek ? app.pts / 2 : app.pts

          // Exact AVG rule:
          // Bench + 0 is excluded; everything else counts.
          if (!(app.status === 'Bench' && adjustedPts === 0)) {
            entry.totalPts += adjustedPts
            entry.avgCount += 1
          }

          // BEST excludes double weeks entirely.
          if (!doubleWeek && app.pts > entry.bestPts) {
            entry.bestPts = app.pts
            entry.bestGame = game
          }
        })
      })

      return Array.from(map.values())
        .map(row => ({
          ...row,
          avgPts: row.avgCount ? row.totalPts / row.avgCount : 0,
        }))
        .filter(row => row.position !== 'DEF')
    }

    const makeMetric = (rows, metric, higher = true) => {
      const eligible = rows.filter(r => Number(r?.[metric]) > 0)
      const sorted = [...eligible].sort((a, b) => {
        const av = Number(a?.[metric]) || 0
        const bv = Number(b?.[metric]) || 0
        if (bv !== av) return higher ? bv - av : av - bv
        return String(a.name || '').localeCompare(String(b.name || ''))
      })

      const topValue = Number(sorted[0]?.[metric] || 0)
      const tiedWinners = sorted.filter(r => Math.abs(Number(r[metric]) - topValue) < 0.0001)

      // The highlighted player is intentionally a single player for aesthetics.
      // Tie-breakers:
      // - Most Started -> more Rostered
      // - Most Rostered -> more Starts
      // - Still tied -> alphabetical
      const winners = (metric === 'started' || metric === 'rostered')
        ? [ [...tiedWinners].sort((a, b) => {
            if (metric === 'started') {
              const rosteredDiff = (Number(b.rostered) || 0) - (Number(a.rostered) || 0)
              if (rosteredDiff !== 0) return rosteredDiff
            } else {
              const startedDiff = (Number(b.started) || 0) - (Number(a.started) || 0)
              if (startedDiff !== 0) return startedDiff
            }
            return String(a.name || '').localeCompare(String(b.name || ''))
          })[0] ]
        : tiedWinners

      const gameInfo = game => {
        if (!game) return ''
        const season = String(game?.Season || '').trim()
        const week = String(game?.Week || '').trim()
        const opp = String(game?.Opponent || '').trim()
        if (!season && !week && !opp) return ''
        return `${season}${week ? ` Week ${week}` : ''}${opp ? ` · vs ${opp}` : ''}`
      }

      return {
        value: metric === 'avgPts' || metric === 'bestPts'
          ? topValue.toFixed(2)
          : topValue,
        sub: winners.map(r => `${r.name}${r.position ? ` [${r.position}]` : ''}`),
        subItems: winners.map(r => ({
          text: r.name,
          position: r.position,
          playerId: r.playerId,
          meta: (metric === 'rostered' || metric === 'started') ? r.team : '',
          href: metric === 'bestPts' && r.bestGame
            ? matchupHref(r.bestGame, games)
            : teamHref(r.team),
        })),
        // Show the season/week/opponent context directly on the main card.
        // BEST uses the actual record game; cumulative/average records use
        // the latest appearance represented by the row.
        sub2: winners.map(r => {
          if (metric === 'rostered' || metric === 'started') return r.team
          if (metric === 'avgPts') return r.team
          return gameInfo(metric === 'bestPts' && r.bestGame ? r.bestGame : r.lastGame)
        }),
        sub2Href: metric === 'bestPts' && winners[0]?.bestGame
          ? matchupHref(winners[0].bestGame, games)
          : undefined,
        teams: winners.map(r => r.team),
        players: winners.map(r => ({ playerId: r.playerId, name: r.name, position: r.position })),
        top5: sorted.slice(0, 5).map(r => ({
          label: r.name,
          position: r.position,
          playerId: r.playerId,
          value: metric === 'avgPts' || metric === 'bestPts' ? Number(r[metric]).toFixed(2) : Number(r[metric]),
          sub: (metric === 'rostered' || metric === 'started')
            ? ''
            : metric === 'bestPts'
              ? (() => {
                  const g = r.bestGame
                  if (!g) return r.team
                  const team = String(g?.Team || r.team || '').trim()
                  const opponent = String(g?.Opponent || '').trim()
                  const week = String(g?.Week || '').trim()
                  const season = String(g?.Season || '').trim()
                  return `${team}${opponent ? ` vs ${opponent}` : ''}${week ? ` - Week ${week}` : ''}${season ? ` - ${season}` : ''}`
                })()
              : metric === 'avgPts'
                ? r.team
                : r.team,
          meta: (metric === 'rostered' || metric === 'started') ? r.team : '',
          team: r.team,
          href: metric === 'bestPts' && r.bestGame
            ? matchupHref(r.bestGame, games)
            : teamHref(r.team),
        })),
      }
    }

    const buildEraRecords = minSeason => {
      const rows = buildEra(minSeason)
      return {
        mostRostered: makeMetric(rows, 'rostered'),
        mostStarted: makeMetric(rows, 'started'),
        bestPts: makeMetric(rows, 'bestPts'),
        avgPts: makeMetric(rows, 'avgPts'),
      }
    }

    return {
      all: buildEraRecords(null),
      from21: buildEraRecords(2021),
      from23: buildEraRecords(2023),
    }
  }, [games, playerCache])

  // ── SEASONS ────────────────────────────────────────────────────────
  const seasonRecords = useMemo(() => {
    if (!history.length) return {}

    // Aggregate total-season (RS + Playoffs + Consolation) PF and game count
    // directly from GAME_FACTS_ALL so we don't need extra sheet columns.
    const totByTeamSeason = {}
    games.forEach(g => {
      const team = String(g?.Team || '').trim()
      const season = String(g?.Season || '').trim()
      const pf = parseNumber(g?.PF)
      if (!team || !season || pf <= 0) return
      const key = `${team}|${season}`
      if (!totByTeamSeason[key]) totByTeamSeason[key] = { team, season, totalPF: 0, gp: 0 }
      totByTeamSeason[key].totalPF += pf
      totByTeamSeason[key].gp += 1
    })
    // Build avgPF-total rows (all seasons, in-progress included)
    const withAvgTot = Object.values(totByTeamSeason)
      .filter(r => r.gp > 0)
      .map(r => ({ ...r, avgPF: r.totalPF / r.gp }))
    const withAvgTot21 = withAvgTot.filter(r => Number(r.season) >= 2021)
    const withAvgTot23 = withAvgTot.filter(r => Number(r.season) >= 2023)

    const mkTop = (arr, key, n = 5, asc = false, fmt = v => v) => {
      const sorted = [...arr].filter(r => parseNumber(r[key]) > 0).sort((a, b) =>
        asc ? parseNumber(a[key]) - parseNumber(b[key]) : parseNumber(b[key]) - parseNumber(a[key])
      )
      const topVal = parseNumber(sorted[0]?.[key])
      return {
        value: sorted[0],
        topVal,
        teams: sorted.filter(r => parseNumber(r[key]) === topVal).map(r => `${String(r.Team || '').trim()} (${String(r.Season || '')})`),
        top5: sorted.slice(0, n).map(r => ({ label: String(r.Team || '').trim(), sub: String(r.Season || ''), value: fmt(parseNumber(r[key])) }))
      }
    }

    // Only use seasons that are complete (have Standing data)
    const completedSeasons = new Set(
      history
        .filter(r => parseNumber(r?.Standing) > 0)
        .map(r => String(r?.Season || '').trim())
    )
    const completedHistory = history.filter(r =>
      completedSeasons.has(String(r?.Season || '').trim())
    )

    const from21 = history.filter(r => Number(String(r?.Season || '0')) >= 2021)
    const from23 = history.filter(r => Number(String(r?.Season || '0')) >= 2023)
    // completed variants — only for fewest points
    const from21c = completedHistory.filter(r => Number(String(r?.Season || '0')) >= 2021)
    const from23c = completedHistory.filter(r => Number(String(r?.Season || '0')) >= 2023)

    // Avg pts/week — all seasons (useful to see in-progress averages)
    const withAvg = history.map(r => ({
      ...r,
      avgPF: parseNumber(r?.RS_GP) > 0 ? parseNumber(r?.RS_PF) / parseNumber(r?.RS_GP) : 0
    })).filter(r => r.avgPF > 0)

    const withAvg21 = withAvg.filter(r => Number(String(r?.Season || '0')) >= 2021)
    const withAvg23 = withAvg.filter(r => Number(String(r?.Season || '0')) >= 2023)

    const mkAvg = arr => {
      const sorted = [...arr].sort((a, b) => b.avgPF - a.avgPF)
      const topVal = sorted[0]?.avgPF || 0
      return {
        value: sorted[0],
        avgVal: topVal,
        teams: sorted.filter(r => Math.abs(r.avgPF - topVal) < 0.001).map(r => `${String(r.Team || '').trim()} (${String(r.Season || '')})`),
        top5: sorted.slice(0, 5).map(r => ({ label: String(r.Team || '').trim(), sub: String(r.Season || ''), value: r.avgPF.toFixed(2) }))
      }
    }

    const mkAvgLow = arr => {
      const sorted = [...arr].sort((a, b) => a.avgPF - b.avgPF)
      const topVal = sorted[0]?.avgPF || 0
      return {
        value: sorted[0],
        avgVal: topVal,
        teams: sorted.filter(r => Math.abs(r.avgPF - topVal) < 0.001).map(r => `${String(r.Team || '').trim()} (${String(r.Season || '')})`),
        top5: sorted.slice(0, 5).map(r => ({ label: String(r.Team || '').trim(), sub: String(r.Season || ''), value: r.avgPF.toFixed(2) }))
      }
    }

    // Total-season avg helpers (same shape as mkAvg/mkAvgLow but uses totalPF rows)
    const mkAvgTot = arr => {
      const sorted = [...arr].sort((a, b) => b.avgPF - a.avgPF)
      const topVal = sorted[0]?.avgPF || 0
      return {
        value: sorted[0],
        avgVal: topVal,
        teams: sorted.filter(r => Math.abs(r.avgPF - topVal) < 0.001).map(r => `${r.team} (${r.season})`),
        top5: sorted.slice(0, 5).map(r => ({ label: r.team, sub: r.season, value: r.avgPF.toFixed(2) }))
      }
    }
    const mkAvgTotLow = arr => {
      const sorted = [...arr].sort((a, b) => a.avgPF - b.avgPF)
      const topVal = sorted[0]?.avgPF || 0
      return {
        value: sorted[0],
        avgVal: topVal,
        teams: sorted.filter(r => Math.abs(r.avgPF - topVal) < 0.001).map(r => `${r.team} (${r.season})`),
        top5: sorted.slice(0, 5).map(r => ({ label: r.team, sub: r.season, value: r.avgPF.toFixed(2) }))
      }
    }

    return {
      byWin: mkTop(history, 'RS_W'),
      byLoss: mkTop(history, 'RS_L'),
      byTotW: mkTop(history, 'W'),
      byTotL: mkTop(history, 'L'),
      byPF: mkTop(history, 'RS_PF', 5, false, v => Math.round(v).toLocaleString()),
      byPF21: mkTop(from21, 'RS_PF', 5, false, v => Math.round(v).toLocaleString()),
      byPF23: mkTop(from23, 'RS_PF', 5, false, v => Math.round(v).toLocaleString()),
      byLowPF: mkTop(completedHistory, 'RS_PF', 5, true, v => Math.round(v).toLocaleString()),
      byLow21: mkTop(from21c, 'RS_PF', 5, true, v => Math.round(v).toLocaleString()),
      byLow23: mkTop(from23c, 'RS_PF', 5, true, v => Math.round(v).toLocaleString()),
      avgHigh: mkAvg(withAvg),
      avgHigh21: mkAvg(withAvg21),
      avgHigh23: mkAvg(withAvg23),
      avgLow: mkAvgLow(withAvg),
      avgLow21: mkAvgLow(withAvg21),
      avgLow23: mkAvgLow(withAvg23),
      avgHighTot: mkAvgTot(withAvgTot),
      avgHighTot21: mkAvgTot(withAvgTot21),
      avgHighTot23: mkAvgTot(withAvgTot23),
      avgLowTot: mkAvgTotLow(withAvgTot),
      avgLowTot21: mkAvgTotLow(withAvgTot21),
      avgLowTot23: mkAvgTotLow(withAvgTot23),
    }
  }, [history, games])

  // ── RIVALRY ────────────────────────────────────────────────────────
  const rivalryRecords = useMemo(() => {
    if (!h2h.length) return {}
    const seen = new Set()
    const dedup = h2h.filter(r => {
      const key = [normalizeString(r?.['Team A'] || ''), normalizeString(r?.['Team B'] || '')].sort().join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const parseStreakVal = val => {
      // Formato: "Team Name W7 (2014 Week 11 → ...)" ou "Team Name W3 (...)"
      // Pega o número que vem após o último W ou L antes do parêntese
      const m = String(val || '').match(/[WL](\d+)\s*\(/)
      return m ? parseInt(m[1]) : 0
    }

    // Most games
    const mgSorted = [...dedup].sort((a, b) => parseNumber(b.Games) - parseNumber(a.Games))
    const topMG = parseNumber(mgSorted[0]?.Games)
    const mostGames = {
      value: topMG,
      teams: mgSorted.filter(r => parseNumber(r.Games) === topMG).map(r => `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`),
      subHref: mgSorted[0] ? rivalryHref(mgSorted[0]['Team A'], mgSorted[0]['Team B']) : '/rivalries',
      top5: mgSorted.slice(0, 5).map(r => ({ label: `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`, value: parseNumber(r.Games), href: rivalryHref(r['Team A'], r['Team B']) }))
    }

    // Best H2H streak — compara todas as linhas corretamente
    const allStreaks = []
    dedup.forEach(r => {
      const a = String(r?.['Team A'] || '').trim()
      const b = String(r?.['Team B'] || '').trim()
      const sA = String(r?.['Best Streak Team A'] || '').trim()
      const sB = String(r?.['Best Streak Team B'] || '').trim()
      const vA = parseStreakVal(sA)
      const vB = parseStreakVal(sB)
      console.log('Row:', a, 'vs', b, '| sA:', sA, 'vA:', vA, '| sB:', sB, 'vB:', vB)
      if (sA && vA > 0) allStreaks.push({ team: a, opponent: b, streak: sA, val: vA })
      if (sB && vB > 0) allStreaks.push({ team: b, opponent: a, streak: sB, val: vB })
    })
    const extractStreakParts = (streakStr) => {
      // "Ocupa e Resiste W7 (2014 W16-17 → 2022 W6)"
      // valor: "W7", período: "(2014 W16-17 → 2022 W6)"
      const match = String(streakStr || '').match(/([WL]\d+)\s*(\(.*\))/)
      return {
        value: match ? match[1] : streakStr,
        period: match ? match[2] : '',
      }
    }

    // Best H2H streak — label shows only "TeamA vs TeamB", period in sub
    allStreaks.sort((a, b) => b.val - a.val)
    const topSV = allStreaks[0]?.val || 0

    const bestH2HStreak = {
      value: extractStreakParts(allStreaks[0]?.streak).value,
      teams: allStreaks
        .filter(s => s.val === topSV)
        .map(s => `${s.team} vs ${s.opponent}`),
      subHref: allStreaks[0] ? rivalryHref(allStreaks[0].team, allStreaks[0].opponent) : '/rivalries',
      top5: allStreaks.slice(0, 5).map(s => {
        const { value, period } = extractStreakParts(s.streak)
        return {
          label: `${s.team} vs ${s.opponent}`,
          sub: period,
          value,
          href: rivalryHref(s.team, s.opponent),
        }
      })
    }

    // Most balanced
    const balSorted = [...dedup]
      .filter(r => parseNumber(r.Games) >= 6)
      .map(r => ({
        ...r,
        diff: Math.abs(parseNumber(r['A Wins']) - parseNumber(r['B Wins'])),
        recA: parseNumber(r['A Wins']),
        recB: parseNumber(r['B Wins']),
      }))
      .sort((a, b) => {
        if (a.diff !== b.diff) return a.diff - b.diff
        return parseNumber(b.Games) - parseNumber(a.Games)
      })

    const topRec = `${balSorted[0]?.recA}–${balSorted[0]?.recB}`
    const mostBalanced = {
      value: topRec,
      teams: balSorted
        .filter(r => r.recA === balSorted[0].recA && r.recB === balSorted[0].recB)
        .map(r => `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`),
      subHref: balSorted[0] ? rivalryHref(balSorted[0]['Team A'], balSorted[0]['Team B']) : '/rivalries',
      top5: balSorted.slice(0, 5).map(r => ({
        label: `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`,
        value: `${r.recA}–${r.recB}`,
        href: rivalryHref(r['Team A'], r['Team B'])
      }))
    }

    // Highest avg margin — ensure dominant team is listed first, margin always positive
    const normalizeMargin = r => {
      const rawMargin = parseFloat(String(r['Avg Margin'] || '0').replace(',', '.')) || 0
      const absMargin = Math.abs(rawMargin)
      const aWins = parseNumber(r['A Wins'])
      const bWins = parseNumber(r['B Wins'])
      // Dominant team is whoever has more wins
      const teamA = String(r['Team A'] || '').trim()
      const teamB = String(r['Team B'] || '').trim()
      const dominant = aWins >= bWins ? teamA : teamB
      const other = aWins >= bWins ? teamB : teamA
      return { dominant, other, margin: absMargin }
    }

    const hmSorted = [...dedup]
      .map(r => ({ ...r, _norm: normalizeMargin(r) }))
      .sort((a, b) => b._norm.margin - a._norm.margin)
    const topHM = hmSorted[0]?._norm.margin || 0
    const highestMargin = {
      value: `${topHM.toFixed(2)} pts`,
      teams: hmSorted.filter(r => Math.abs(r._norm.margin - topHM) < 0.01).map(r => `${r._norm.dominant} vs ${r._norm.other}`),
      subHref: hmSorted[0] ? rivalryHref(hmSorted[0]._norm.dominant, hmSorted[0]._norm.other) : '/rivalries',
      top5: hmSorted.slice(0, 5).map(r => ({ label: `${r._norm.dominant} vs ${r._norm.other}`, value: `${r._norm.margin.toFixed(2)} pts`, href: rivalryHref(r._norm.dominant, r._norm.other) }))
    }

    // Lowest avg margin — same normalization, ascending
    const lmSorted = [...dedup]
      .map(r => ({ ...r, _norm: normalizeMargin(r) }))
      .filter(r => r._norm.margin > 0)
      .sort((a, b) => a._norm.margin - b._norm.margin)
    const topLM = lmSorted[0]?._norm.margin || 0
    const lowestMargin = {
      value: `${topLM.toFixed(2)} pts`,
      teams: lmSorted.filter(r => Math.abs(r._norm.margin - topLM) < 0.01).map(r => `${r._norm.dominant} vs ${r._norm.other}`),
      subHref: lmSorted[0] ? rivalryHref(lmSorted[0]._norm.dominant, lmSorted[0]._norm.other) : '/rivalries',
      top5: lmSorted.slice(0, 5).map(r => ({ label: `${r._norm.dominant} vs ${r._norm.other}`, value: `${r._norm.margin.toFixed(2)} pts`, href: rivalryHref(r._norm.dominant, r._norm.other) }))
    }

    return { mostGames, bestH2HStreak, mostBalanced, highestMargin, lowestMargin }
  }, [h2h])

  // ── GLORY ──────────────────────────────────────────────────────────
  const gloryRecords = useMemo(() => {
    if (!history.length) return {}

    const champions = history
      .filter(r => String(r?.Champion || '').toUpperCase() === 'TRUE')
      .sort((a, b) => Number(String(b?.Season || '0')) - Number(String(a?.Season || '0')))

    // Unicórnios — último colocado por temporada
    const unicorns = []
    const seasonGroups = {}
    history.forEach(r => {
      const s = String(r?.Season || '').trim()
      if (!seasonGroups[s]) seasonGroups[s] = []
      seasonGroups[s].push(r)
    })
    Object.entries(seasonGroups).forEach(([season, rows]) => {
      const total = rows.length
      // Only process seasons that have Standing data for all teams
      const byStanding = rows.filter(r => parseNumber(r?.Standing) > 0)
      // Skip seasons with no standings at all (e.g. future/incomplete seasons)
      if (byStanding.length === 0) return
      // Use the highest standing number (last place)
      const last = byStanding.sort((a, b) => parseNumber(b.Standing) - parseNumber(a.Standing))[0]
      unicorns.push(last)
    })
    unicorns.sort((a, b) => Number(String(b?.Season || '0')) - Number(String(a?.Season || '0')))

    // Counts + anos
    const titleYears = {}, finalsYears = {}, unicornYears = {}
    champions.forEach(r => {
      const t = String(r?.Team || '').trim(); const s = String(r?.Season || '').trim()
      if (!titleYears[t]) titleYears[t] = []
      titleYears[t].push(s)
    })
    history.filter(r => String(r?.Reached_Final || '').toUpperCase() === 'TRUE').forEach(r => {
      const t = String(r?.Team || '').trim(); const s = String(r?.Season || '').trim()
      if (!finalsYears[t]) finalsYears[t] = []
      finalsYears[t].push(s)
    })
    unicorns.forEach(r => {
      const t = String(r?.Team || '').trim(); const s = String(r?.Season || '').trim()
      if (!unicornYears[t]) unicornYears[t] = []
      unicornYears[t].push(s)
    })

    const mkGlory = (yearsObj) => {
      const entries = Object.entries(yearsObj).map(([team, years]) => ({ team, count: years.length, years: years.sort() }))
      entries.sort((a, b) => b.count - a.count)
      const topVal = entries[0]?.count || 0
      const top5thresh = entries[4]?.count || 0
      // Mostra todos os empatados com o 5º lugar
      const showAll = entries.filter(e => e.count >= top5thresh)
      return {
        value: topVal,
        teams: entries.filter(e => e.count === topVal).map(e => e.team),
        top5: showAll.map(e => ({ label: e.team, sub: e.years.join(', '), value: e.count }))
      }
    }

    return {
      champions,
      unicorns,
      mostTitles: mkGlory(titleYears),
      mostFinals: mkGlory(finalsYears),
      mostUnicorn: mkGlory(unicornYears),
    }
  }, [history])

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      <Header onSummaryOpen={() => setDrawerOpen(true)} />

      <section className="px-3 pb-20 md:px-6">

        {/* Hero */}
        <div className="relative mb-10 overflow-hidden border-2 border-[#0A0A0A] bg-white shadow-[6px_6px_0_#16274F]">
          <div className="absolute inset-0 overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 900 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g opacity="0.06" fill="#16274F">
                {[280,355,400,475,520,595,640,715,760,835].map((x,i) => (
                  <rect key={i} x={x} y="-80" width={i%2===0?55:22} height="450" transform={`rotate(-18 ${x+(i%2===0?27:11)} 140)`}/>
                ))}
              </g>
              <g opacity="0.08" fill="none" stroke="#16274F" strokeWidth="1">
                {["M380 -30 L460 85 L380 200 L300 85 Z","M460 85 L540 200 L460 315 L380 200 Z","M540 -30 L620 85 L540 200 L460 85 Z","M620 85 L700 200 L620 315 L540 200 Z","M700 -30 L780 85 L700 200 L620 85 Z"].map((d,i)=><path key={i} d={d}/>)}
              </g>
              <g opacity="0.06" fill="#F5C518">
                {["M420 30 L440 58 L420 86 L400 58 Z","M580 30 L600 58 L580 86 L560 58 Z","M740 30 L760 58 L740 86 L720 58 Z","M500 120 L520 148 L500 176 L480 148 Z","M660 120 L680 148 L660 176 L640 148 Z"].map((d,i)=><path key={i} d={d}/>)}
              </g>
              <text x="815" y="262" fontFamily="'Bebas Neue',sans-serif" fontSize="280" fill="#16274F" opacity="0.035" textAnchor="middle">REC</text>
            </svg>
          </div>

          <div className="relative z-10 p-6 sm:p-8 md:p-10">
            <div className="mb-5 inline-flex items-center border-2 border-[#D01F2D] bg-[#D01F2D] px-4 py-2 text-white shadow-[3px_3px_0_#16274F]">
              <span className="text-xs font-black uppercase tracking-[0.25em]">League</span>
            </div>

            <h1
              className="mb-4 leading-[0.84]"
              style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(58px, 9vw, 104px)', letterSpacing: '0.02em' }}
            >
              <span className="block text-[#16274F]">League</span>
              <span className="block text-[#D01F2D]" style={{ textShadow: '2px 2px 0 #0A0A0A' }}>Records</span>
            </h1>

            <p className="max-w-xl text-sm font-semibold text-slate-600 sm:text-base">
              The numbers that define glory, rivalry and heartbreak.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 overflow-hidden border-2 border-[#16274F] bg-white shadow-[4px_4px_0_#16274F]">
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-shrink-0 items-center gap-2 border-b-4 px-5 py-4 text-sm font-black uppercase transition-all sm:px-6 ${
                  tab === t.key
                    ? 'border-[#D01F2D] bg-[#FFF3F4] text-[#D01F2D]'
                    : 'border-transparent text-[#16274F]/60 hover:bg-[#F7F6F2] hover:text-[#16274F]'
                }`}
              >
                <t.Icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Loading...</div>
        ) : (
          <div className="border-2 border-[#16274F] bg-white p-4 shadow-[5px_5px_0_#16274F] sm:p-6 md:p-8">

            {/* FRANCHISE */}
{tab === 'franchise' && (
  <>
    <RecordSection title="All-Time Wins & Losses">
      <RecordCard label="Most Wins All-Time" value={franchiseRecords.mostWins?.value} sub={franchiseRecords.mostWins?.teams} team={franchiseRecords.mostWins?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostWins?.top5} />
      <RecordCard label="Most Losses All-Time" value={franchiseRecords.mostLosses?.value} sub={franchiseRecords.mostLosses?.teams} team={franchiseRecords.mostLosses?.teams} accent="red" icon={TrendingDown} top5={franchiseRecords.mostLosses?.top5} />
      <RecordCard label="Best Win % All-Time" value={franchiseRecords.bestWinPct?.value} sub={franchiseRecords.bestWinPct?.teams} team={franchiseRecords.bestWinPct?.teams} accent="cyan" icon={Target} top5={franchiseRecords.bestWinPct?.top5} />
      <RecordCard label="Most Points All-Time" value={franchiseRecords.mostPF?.value} sub={franchiseRecords.mostPF?.teams} team={franchiseRecords.mostPF?.teams} accent="emerald" icon={Activity} top5={franchiseRecords.mostPF?.top5} />
    </RecordSection>

    <RecordSection title="Playoff Dominance">
      <RecordCard label="Most Playoff Apps" value={franchiseRecords.mostPoApps?.value} sub={franchiseRecords.mostPoApps?.teams} team={franchiseRecords.mostPoApps?.teams} accent="purple" icon={Star} top5={franchiseRecords.mostPoApps?.top5} />
      <RecordCard label="Most Finals Apps" value={franchiseRecords.mostFinals?.value} sub={franchiseRecords.mostFinals?.teams} team={franchiseRecords.mostFinals?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostFinals?.top5} />
      <RecordCard label="Most Titles" value={franchiseRecords.mostTitles?.value} sub={franchiseRecords.mostTitles?.teams} team={franchiseRecords.mostTitles?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostTitles?.top5} />
      <RecordCard label="Most Playoff Wins" value={franchiseRecords.mostPoW?.value} sub={franchiseRecords.mostPoW?.teams} team={franchiseRecords.mostPoW?.teams} accent="cyan" icon={TrendingUp} top5={franchiseRecords.mostPoW?.top5} />
    </RecordSection>

    <RecordSection title="10-Win Seasons">
      <RecordCard label="Most 10W Seasons (RS)" value={franchiseRecords.topTenRS?.value} sub={franchiseRecords.topTenRS?.teams} team={franchiseRecords.topTenRS?.teams} accent="emerald" icon={Star} top5={franchiseRecords.topTenRS?.top5} />
      <RecordCard label="Most 10W Seasons (Total)" value={franchiseRecords.topTenTot?.value} sub={franchiseRecords.topTenTot?.teams} team={franchiseRecords.topTenTot?.teams} accent="cyan" icon={Star} top5={franchiseRecords.topTenTot?.top5} />
    </RecordSection>

    <RecordSection title="Most Winning Seasons">
      <RecordCard label="Reg Season Only" value={franchiseRecords.mostWinSeasonsRS?.value} sub={franchiseRecords.mostWinSeasonsRS?.teams} team={franchiseRecords.mostWinSeasonsRS?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostWinSeasonsRS?.top5} />
      <RecordCard label="Full Season (RS + Playoffs)" value={franchiseRecords.mostWinSeasonsTot?.value} sub={franchiseRecords.mostWinSeasonsTot?.teams} team={franchiseRecords.mostWinSeasonsTot?.teams} accent="emerald" icon={Trophy} top5={franchiseRecords.mostWinSeasonsTot?.top5} />
    </RecordSection>

    <RecordSection title="Weekly High Scorer (RS)">
      <RecordCard label="All-Time" value={franchiseRecords.mostWeeklyHigh?.value} sub={franchiseRecords.mostWeeklyHigh?.teams} team={franchiseRecords.mostWeeklyHigh?.teams} accent="gold" icon={Flame} top5={franchiseRecords.mostWeeklyHigh?.top5} />
      <RecordCard label="Since 2021" value={franchiseRecords.mostWeeklyHigh21?.value} sub={franchiseRecords.mostWeeklyHigh21?.teams} team={franchiseRecords.mostWeeklyHigh21?.teams} accent="orange" icon={Flame} top5={franchiseRecords.mostWeeklyHigh21?.top5} />
      <RecordCard label="Since 2023" value={franchiseRecords.mostWeeklyHigh23?.value} sub={franchiseRecords.mostWeeklyHigh23?.teams} team={franchiseRecords.mostWeeklyHigh23?.teams} accent="cyan" icon={Flame} top5={franchiseRecords.mostWeeklyHigh23?.top5} />
    </RecordSection>

    <RecordSection title="Power Rankings — Most Weeks at #1 (RS)">
      <RecordCard label="All-Time" value={franchiseRecords.pr1All?.value} sub={franchiseRecords.pr1All?.teams} team={franchiseRecords.pr1All?.teams} sub2="All seasons" accent="gold" icon={Zap} top5={franchiseRecords.pr1All?.top5} />
      <RecordCard label="Since 2021" value={franchiseRecords.pr1from21?.value} sub={franchiseRecords.pr1from21?.teams} team={franchiseRecords.pr1from21?.teams} sub2="From 2021 on" accent="orange" icon={Zap} top5={franchiseRecords.pr1from21?.top5} />
      <RecordCard label="Since 2023" value={franchiseRecords.pr1from23?.value} sub={franchiseRecords.pr1from23?.teams} team={franchiseRecords.pr1from23?.teams} sub2="New era (2023+)" accent="cyan" icon={Zap} top5={franchiseRecords.pr1from23?.top5} />
    </RecordSection>
  </>
)}

{/* STREAKS */}
{tab === 'streaks' && (
  <>
    <RecordSection title="All-Time Win Streaks">
      <RecordCard label="Best Winning Streak (Total)" value={streakRecords.bestWTotal?.value} sub={streakRecords.bestWTotal?.teams} team={streakRecords.bestWTotal?.teams} accent="gold" icon={Flame} top5={streakRecords.bestWTotal?.top5} />
      <RecordCard label="Best Winning Streak (Reg Season)" value={streakRecords.bestWRS?.value} sub={streakRecords.bestWRS?.teams} team={streakRecords.bestWRS?.teams} accent="emerald" icon={Flame} top5={streakRecords.bestWRS?.top5} />
    </RecordSection>

    <RecordSection title="All-Time Loss Streaks">
      <RecordCard label="Worst Losing Streak (Total)" value={streakRecords.bestLTotal?.value} sub={streakRecords.bestLTotal?.teams} team={streakRecords.bestLTotal?.teams} accent="red" icon={TrendingDown} top5={streakRecords.bestLTotal?.top5} />
      <RecordCard label="Worst Losing Streak (Reg Season)" value={streakRecords.bestLRS?.value} sub={streakRecords.bestLRS?.teams} team={streakRecords.bestLRS?.teams} accent="orange" icon={TrendingDown} top5={streakRecords.bestLRS?.top5} />
    </RecordSection>

    <RecordSection title="Single Season Streaks">
      <RecordCard label="Best Win Streak in a Single Season" value={streakRecords.bestSeasonW?.value} sub={streakRecords.bestSeasonW?.teams} team={streakRecords.bestSeasonW?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="gold" icon={Flame} top5={streakRecords.bestSeasonW?.top5} />
      <RecordCard label="Worst Loss Streak in a Single Season" value={streakRecords.bestSeasonL?.value} sub={streakRecords.bestSeasonL?.teams} team={streakRecords.bestSeasonL?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="red" icon={TrendingDown} top5={streakRecords.bestSeasonL?.top5} />
    </RecordSection>
  </>
)}

{/* GAMES */}
{tab === 'games' && (
  <>
    <RecordSection title="Highest Scores — Including Double Weeks">
      <RecordCard label="All-Time" value={gameRecords.highAll?.value} sub={gameRecords.highAll?.teams} team={gameRecords.highAll?.teams} sub2={gameRecords.highAll?.sub2} sub2Href={gameRecords.highAll?.sub2Href} accent="gold" icon={Flame} top5={gameRecords.highAll?.top5} />
      <RecordCard label="Reg Season" value={gameRecords.highReg?.value} sub={gameRecords.highReg?.teams} team={gameRecords.highReg?.teams} sub2={gameRecords.highReg?.sub2} sub2Href={gameRecords.highReg?.sub2Href} accent="cyan" icon={Flame} top5={gameRecords.highReg?.top5} />
      <RecordCard label="Playoffs" value={gameRecords.highPO?.value} sub={gameRecords.highPO?.teams} team={gameRecords.highPO?.teams} sub2={gameRecords.highPO?.sub2} sub2Href={gameRecords.highPO?.sub2Href} accent="purple" icon={Flame} top5={gameRecords.highPO?.top5} />
    </RecordSection>

    <RecordSection title="Highest Scores — Single Weeks Only">
      <RecordCard label="All-Time" value={gameRecords.highNoDouble?.value} sub={gameRecords.highNoDouble?.teams} team={gameRecords.highNoDouble?.teams} sub2={gameRecords.highNoDouble?.sub2} sub2Href={gameRecords.highNoDouble?.sub2Href} accent="gold" icon={Flame} top5={gameRecords.highNoDouble?.top5} />
      <RecordCard label="Reg Season" value={gameRecords.highRegNoDb?.value} sub={gameRecords.highRegNoDb?.teams} team={gameRecords.highRegNoDb?.teams} sub2={gameRecords.highRegNoDb?.sub2} sub2Href={gameRecords.highRegNoDb?.sub2Href} accent="cyan" icon={Flame} top5={gameRecords.highRegNoDb?.top5} />
      <RecordCard label="Playoffs" value={gameRecords.highPONoDb?.value} sub={gameRecords.highPONoDb?.teams} team={gameRecords.highPONoDb?.teams} sub2={gameRecords.highPONoDb?.sub2} sub2Href={gameRecords.highPONoDb?.sub2Href} accent="purple" icon={Flame} top5={gameRecords.highPONoDb?.top5} />
      <RecordCard label="Most Games Over 200 pts" value={gameRecords.most200?.value} sub={gameRecords.most200?.teams} team={gameRecords.most200?.teams} sub2="Single weeks only · all stages" accent="orange" icon={Zap} top5={gameRecords.most200?.top5} />
    </RecordSection>

    <RecordSection title="Lowest Scores">
      <RecordCard label="Lowest Score" value={gameRecords.lowSingle?.value} sub={gameRecords.lowSingle?.teams} team={gameRecords.lowSingle?.teams} sub2={gameRecords.lowSingle?.sub2} sub2Href={gameRecords.lowSingle?.sub2Href} accent="red" icon={TrendingDown} top5={gameRecords.lowSingle?.top5} />
      <RecordCard label="Lowest Score Since 2021" value={gameRecords.lowSingleSince21?.value} sub={gameRecords.lowSingleSince21?.teams} team={gameRecords.lowSingleSince21?.teams} sub2={gameRecords.lowSingleSince21?.sub2} sub2Href={gameRecords.lowSingleSince21?.sub2Href} accent="orange" icon={TrendingDown} top5={gameRecords.lowSingleSince21?.top5} />
      <RecordCard label="Lowest Score Since 2023" value={gameRecords.lowSingleSince23?.value} sub={gameRecords.lowSingleSince23?.teams} team={gameRecords.lowSingleSince23?.teams} sub2={gameRecords.lowSingleSince23?.sub2} sub2Href={gameRecords.lowSingleSince23?.sub2Href} accent="cyan" icon={TrendingDown} top5={gameRecords.lowSingleSince23?.top5} />
    </RecordSection>

    <RecordSection title="Notable Games">
      <RecordCard label="Closest Game (inc. doubles)" value={gameRecords.closestAll?.value} sub={gameRecords.closestAll?.teams} sub2={gameRecords.closestAll?.sub2} sub2Href={gameRecords.closestAll?.sub2Href} accent="emerald" icon={Target} top5={gameRecords.closestAll?.top5} />
      <RecordCard label="Closest Game (single weeks only)" value={gameRecords.closestNoDouble?.value} sub={gameRecords.closestNoDouble?.teams} sub2={gameRecords.closestNoDouble?.sub2} sub2Href={gameRecords.closestNoDouble?.sub2Href} accent="cyan" icon={Target} top5={gameRecords.closestNoDouble?.top5} />
      <RecordCard label="Biggest Win (inc. doubles)" value={gameRecords.biggestAll?.value} sub={gameRecords.biggestAll?.teams} sub2={gameRecords.biggestAll?.sub2} sub2Href={gameRecords.biggestAll?.sub2Href} accent="gold" icon={Zap} top5={gameRecords.biggestAll?.top5} />
      <RecordCard label="Biggest Win (single weeks only)" value={gameRecords.biggestNoDouble?.value} sub={gameRecords.biggestNoDouble?.teams} sub2={gameRecords.biggestNoDouble?.sub2} sub2Href={gameRecords.biggestNoDouble?.sub2Href} accent="orange" icon={Zap} top5={gameRecords.biggestNoDouble?.top5} />
    </RecordSection>
  </>
)}

{/* PLAYERS */}
{tab === 'players' && (
  <>
    <RecordSection title="All-Time">
      <RecordCard
        label="Most Rostered"
        value={playerRecords?.all?.mostRostered?.value}
        subItems={playerRecords?.all?.mostRostered?.subItems}
        sub2={(playerRecords?.all?.mostRostered?.metric === "rostered" || playerRecords?.all?.mostRostered?.metric === "started") ? undefined : playerRecords?.all?.mostRostered?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.all?.mostRostered?.sub2Href}
        team={playerRecords?.all?.mostRostered?.teams}
        player={playerRecords?.all?.mostRostered?.players}
        accent="gold" icon={Users}
        top5={playerRecords?.all?.mostRostered?.top5}
      />
      <RecordCard
        label="Most Started"
        value={playerRecords?.all?.mostStarted?.value}
        subItems={playerRecords?.all?.mostStarted?.subItems}
        sub2={(playerRecords?.all?.mostStarted?.metric === "rostered" || playerRecords?.all?.mostStarted?.metric === "started") ? undefined : playerRecords?.all?.mostStarted?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.all?.mostStarted?.sub2Href}
        team={playerRecords?.all?.mostStarted?.teams}
        player={playerRecords?.all?.mostStarted?.players}
        accent="cyan" icon={Star}
        top5={playerRecords?.all?.mostStarted?.top5}
      />
      <RecordCard
        label="Most Points Scored"
        value={playerRecords?.all?.bestPts?.value}
        subItems={playerRecords?.all?.bestPts?.subItems}
        sub2={(playerRecords?.all?.bestPts?.metric === "rostered" || playerRecords?.all?.bestPts?.metric === "started") ? undefined : playerRecords?.all?.bestPts?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.all?.bestPts?.sub2Href}
        team={playerRecords?.all?.bestPts?.teams}
        player={playerRecords?.all?.bestPts?.players}
        accent="red" icon={Flame}
        top5={playerRecords?.all?.bestPts?.top5}
      />
      <RecordCard
        label="Best Average Points"
        value={playerRecords?.all?.avgPts?.value}
        subItems={playerRecords?.all?.avgPts?.subItems}
        sub2={(playerRecords?.all?.avgPts?.metric === "rostered" || playerRecords?.all?.avgPts?.metric === "started") ? undefined : playerRecords?.all?.avgPts?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.all?.avgPts?.sub2Href}
        team={playerRecords?.all?.avgPts?.teams}
        player={playerRecords?.all?.avgPts?.players}
        accent="emerald" icon={Activity}
        top5={playerRecords?.all?.avgPts?.top5}
      />
    </RecordSection>

    <RecordSection title="Since 2021">
      <RecordCard
        label="Most Rostered"
        value={playerRecords?.from21?.mostRostered?.value}
        subItems={playerRecords?.from21?.mostRostered?.subItems}
        sub2={(playerRecords?.from21?.mostRostered?.metric === "rostered" || playerRecords?.from21?.mostRostered?.metric === "started") ? undefined : playerRecords?.from21?.mostRostered?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.from21?.mostRostered?.sub2Href}
        team={playerRecords?.from21?.mostRostered?.teams}
        player={playerRecords?.from21?.mostRostered?.players}
        accent="gold" icon={Users}
        top5={playerRecords?.from21?.mostRostered?.top5}
      />
      <RecordCard
        label="Most Started"
        value={playerRecords?.from21?.mostStarted?.value}
        subItems={playerRecords?.from21?.mostStarted?.subItems}
        sub2={(playerRecords?.from21?.mostStarted?.metric === "rostered" || playerRecords?.from21?.mostStarted?.metric === "started") ? undefined : playerRecords?.from21?.mostStarted?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.from21?.mostStarted?.sub2Href}
        team={playerRecords?.from21?.mostStarted?.teams}
        player={playerRecords?.from21?.mostStarted?.players}
        accent="cyan" icon={Star}
        top5={playerRecords?.from21?.mostStarted?.top5}
      />
      <RecordCard
        label="Most Points Scored"
        value={playerRecords?.from21?.bestPts?.value}
        subItems={playerRecords?.from21?.bestPts?.subItems}
        sub2={(playerRecords?.from21?.bestPts?.metric === "rostered" || playerRecords?.from21?.bestPts?.metric === "started") ? undefined : playerRecords?.from21?.bestPts?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.from21?.bestPts?.sub2Href}
        team={playerRecords?.from21?.bestPts?.teams}
        player={playerRecords?.from21?.bestPts?.players}
        accent="red" icon={Flame}
        top5={playerRecords?.from21?.bestPts?.top5}
      />
      <RecordCard
        label="Best Average Points"
        value={playerRecords?.from21?.avgPts?.value}
        subItems={playerRecords?.from21?.avgPts?.subItems}
        sub2={(playerRecords?.from21?.avgPts?.metric === "rostered" || playerRecords?.from21?.avgPts?.metric === "started") ? undefined : playerRecords?.from21?.avgPts?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.from21?.avgPts?.sub2Href}
        team={playerRecords?.from21?.avgPts?.teams}
        player={playerRecords?.from21?.avgPts?.players}
        accent="emerald" icon={Activity}
        top5={playerRecords?.from21?.avgPts?.top5}
      />
    </RecordSection>

    <RecordSection title="Since 2023">
      <RecordCard
        label="Most Rostered"
        value={playerRecords?.from23?.mostRostered?.value}
        subItems={playerRecords?.from23?.mostRostered?.subItems}
        sub2={(playerRecords?.from23?.mostRostered?.metric === "rostered" || playerRecords?.from23?.mostRostered?.metric === "started") ? undefined : playerRecords?.from23?.mostRostered?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.from23?.mostRostered?.sub2Href}
        team={playerRecords?.from23?.mostRostered?.teams}
        player={playerRecords?.from23?.mostRostered?.players}
        accent="gold" icon={Users}
        top5={playerRecords?.from23?.mostRostered?.top5}
      />
      <RecordCard
        label="Most Started"
        value={playerRecords?.from23?.mostStarted?.value}
        subItems={playerRecords?.from23?.mostStarted?.subItems}
        sub2={(playerRecords?.from23?.mostStarted?.metric === "rostered" || playerRecords?.from23?.mostStarted?.metric === "started") ? undefined : playerRecords?.from23?.mostStarted?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.from23?.mostStarted?.sub2Href}
        team={playerRecords?.from23?.mostStarted?.teams}
        player={playerRecords?.from23?.mostStarted?.players}
        accent="cyan" icon={Star}
        top5={playerRecords?.from23?.mostStarted?.top5}
      />
      <RecordCard
        label="Most Points Scored"
        value={playerRecords?.from23?.bestPts?.value}
        subItems={playerRecords?.from23?.bestPts?.subItems}
        sub2={(playerRecords?.from23?.bestPts?.metric === "rostered" || playerRecords?.from23?.bestPts?.metric === "started") ? undefined : playerRecords?.from23?.bestPts?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.from23?.bestPts?.sub2Href}
        team={playerRecords?.from23?.bestPts?.teams}
        player={playerRecords?.from23?.bestPts?.players}
        accent="red" icon={Flame}
        top5={playerRecords?.from23?.bestPts?.top5}
      />
      <RecordCard
        label="Best Average Points"
        value={playerRecords?.from23?.avgPts?.value}
        subItems={playerRecords?.from23?.avgPts?.subItems}
        sub2={(playerRecords?.from23?.avgPts?.metric === "rostered" || playerRecords?.from23?.avgPts?.metric === "started") ? undefined : playerRecords?.from23?.avgPts?.sub2?.filter(Boolean).join(" · ")}
        sub2Href={playerRecords?.from23?.avgPts?.sub2Href}
        team={playerRecords?.from23?.avgPts?.teams}
        player={playerRecords?.from23?.avgPts?.players}
        accent="emerald" icon={Activity}
        top5={playerRecords?.from23?.avgPts?.top5}
      />
    </RecordSection>
  </>
)}

{/* SEASONS */}
{tab === 'seasons' && (
  <>
    <RecordSection title="Best & Worst Records">
      <RecordCard label="Best RS Record" value={`${parseNumber(seasonRecords.byWin?.value?.RS_W)}–${parseNumber(seasonRecords.byWin?.value?.RS_L)}`} sub={seasonRecords.byWin?.teams} team={seasonRecords.byWin?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="gold" icon={Trophy} top5={seasonRecords.byWin?.top5?.map(r => ({ ...r, value: `${r.value}W` }))} />
      <RecordCard label="Worst RS Record" value={`${parseNumber(seasonRecords.byLoss?.value?.RS_W)}–${parseNumber(seasonRecords.byLoss?.value?.RS_L)}`} sub={seasonRecords.byLoss?.teams} team={seasonRecords.byLoss?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="red" icon={TrendingDown} top5={seasonRecords.byLoss?.top5?.map(r => ({ ...r, value: `${r.value}L` }))} />
      <RecordCard label="Best Overall Record" value={`${parseNumber(seasonRecords.byTotW?.value?.W)}–${parseNumber(seasonRecords.byTotW?.value?.L)}`} sub={seasonRecords.byTotW?.teams} team={seasonRecords.byTotW?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="cyan" icon={Star} top5={seasonRecords.byTotW?.top5?.map(r => ({ ...r, value: `${r.value}W` }))} />
      <RecordCard label="Worst Overall Record" value={`${parseNumber(seasonRecords.byTotL?.value?.W)}–${parseNumber(seasonRecords.byTotL?.value?.L)}`} sub={seasonRecords.byTotL?.teams} team={seasonRecords.byTotL?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="orange" icon={TrendingDown} top5={seasonRecords.byTotL?.top5?.map(r => ({ ...r, value: `${r.value}L` }))} />
    </RecordSection>

    <RecordSection title="Most Points in a Season (RS)">
      <RecordCard label="All-Time" value={Math.round(parseNumber(seasonRecords.byPF?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byPF?.teams} team={seasonRecords.byPF?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="gold" icon={Flame} top5={seasonRecords.byPF?.top5} />
      <RecordCard label="Since 2021" value={Math.round(parseNumber(seasonRecords.byPF21?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byPF21?.teams} team={seasonRecords.byPF21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="cyan" icon={Flame} top5={seasonRecords.byPF21?.top5} />
      <RecordCard label="Since 2023" value={Math.round(parseNumber(seasonRecords.byPF23?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byPF23?.teams} team={seasonRecords.byPF23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="emerald" icon={Flame} top5={seasonRecords.byPF23?.top5} />
    </RecordSection>

    <RecordSection title="Fewest Points in a Season (RS)">
      <RecordCard label="All-Time" value={Math.round(parseNumber(seasonRecords.byLowPF?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLowPF?.teams} team={seasonRecords.byLowPF?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="red" icon={TrendingDown} top5={seasonRecords.byLowPF?.top5} />
      <RecordCard label="Since 2021" value={Math.round(parseNumber(seasonRecords.byLow21?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLow21?.teams} team={seasonRecords.byLow21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="orange" icon={TrendingDown} top5={seasonRecords.byLow21?.top5} />
      <RecordCard label="Since 2023" value={Math.round(parseNumber(seasonRecords.byLow23?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLow23?.teams} team={seasonRecords.byLow23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="purple" icon={TrendingDown} top5={seasonRecords.byLow23?.top5} />
    </RecordSection>

    <RecordSection title="Best Avg Points/Week in a Season (RS)">
      <RecordCard label="All-Time" value={seasonRecords.avgHigh?.avgVal?.toFixed(2)} sub={seasonRecords.avgHigh?.teams} team={seasonRecords.avgHigh?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="gold" icon={Activity} top5={seasonRecords.avgHigh?.top5} />
      <RecordCard label="Since 2021" value={seasonRecords.avgHigh21?.avgVal?.toFixed(2)} sub={seasonRecords.avgHigh21?.teams} team={seasonRecords.avgHigh21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="cyan" icon={Activity} top5={seasonRecords.avgHigh21?.top5} />
      <RecordCard label="Since 2023" value={seasonRecords.avgHigh23?.avgVal?.toFixed(2)} sub={seasonRecords.avgHigh23?.teams} team={seasonRecords.avgHigh23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="emerald" icon={Activity} top5={seasonRecords.avgHigh23?.top5} />
    </RecordSection>

    <RecordSection title="Fewest Avg Points/Week in a Season (RS)">
      <RecordCard label="All-Time" value={seasonRecords.avgLow?.avgVal?.toFixed(2)} sub={seasonRecords.avgLow?.teams} team={seasonRecords.avgLow?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="red" icon={TrendingDown} top5={seasonRecords.avgLow?.top5} />
      <RecordCard label="Since 2021" value={seasonRecords.avgLow21?.avgVal?.toFixed(2)} sub={seasonRecords.avgLow21?.teams} team={seasonRecords.avgLow21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="orange" icon={TrendingDown} top5={seasonRecords.avgLow21?.top5} />
      <RecordCard label="Since 2023" value={seasonRecords.avgLow23?.avgVal?.toFixed(2)} sub={seasonRecords.avgLow23?.teams} team={seasonRecords.avgLow23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="purple" icon={TrendingDown} top5={seasonRecords.avgLow23?.top5} />
    </RecordSection>

    <RecordSection title="Best Avg Points/Week in a Season (Total)">
      <RecordCard label="All-Time" value={seasonRecords.avgHighTot?.avgVal?.toFixed(2)} sub={seasonRecords.avgHighTot?.teams} team={seasonRecords.avgHighTot?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="gold" icon={Activity} top5={seasonRecords.avgHighTot?.top5} />
      <RecordCard label="Since 2021" value={seasonRecords.avgHighTot21?.avgVal?.toFixed(2)} sub={seasonRecords.avgHighTot21?.teams} team={seasonRecords.avgHighTot21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="cyan" icon={Activity} top5={seasonRecords.avgHighTot21?.top5} />
      <RecordCard label="Since 2023" value={seasonRecords.avgHighTot23?.avgVal?.toFixed(2)} sub={seasonRecords.avgHighTot23?.teams} team={seasonRecords.avgHighTot23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="emerald" icon={Activity} top5={seasonRecords.avgHighTot23?.top5} />
    </RecordSection>

    <RecordSection title="Fewest Avg Points/Week in a Season (Total)">
      <RecordCard label="All-Time" value={seasonRecords.avgLowTot?.avgVal?.toFixed(2)} sub={seasonRecords.avgLowTot?.teams} team={seasonRecords.avgLowTot?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="red" icon={TrendingDown} top5={seasonRecords.avgLowTot?.top5} />
      <RecordCard label="Since 2021" value={seasonRecords.avgLowTot21?.avgVal?.toFixed(2)} sub={seasonRecords.avgLowTot21?.teams} team={seasonRecords.avgLowTot21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="orange" icon={TrendingDown} top5={seasonRecords.avgLowTot21?.top5} />
      <RecordCard label="Since 2023" value={seasonRecords.avgLowTot23?.avgVal?.toFixed(2)} sub={seasonRecords.avgLowTot23?.teams} team={seasonRecords.avgLowTot23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="purple" icon={TrendingDown} top5={seasonRecords.avgLowTot23?.top5} />
    </RecordSection>
  </>
)}

{/* RIVALRY */}
{tab === 'rivalry' && (
  <>
    <RecordSection title="Most Played">
      <RecordCard label="Most H2H Games" value={rivalryRecords.mostGames?.value} sub={rivalryRecords.mostGames?.teams} accent="gold" icon={Swords} top5={rivalryRecords.mostGames?.top5} subHref={rivalryRecords.mostGames?.subHref} wide />
    </RecordSection>

    <RecordSection title="H2H Streaks">
      <RecordCard label="Longest H2H Winning Streak" value={rivalryRecords.bestH2HStreak?.value} sub={rivalryRecords.bestH2HStreak?.teams} accent="gold" icon={Flame} top5={rivalryRecords.bestH2HStreak?.top5} subHref={rivalryRecords.bestH2HStreak?.subHref} wide />
    </RecordSection>

    <RecordSection title="Dominance & Balance">
      <RecordCard label="Most Balanced Rivalry" value={rivalryRecords.mostBalanced?.value} sub={rivalryRecords.mostBalanced?.teams} accent="emerald" icon={Target} top5={rivalryRecords.mostBalanced?.top5} subHref={rivalryRecords.mostBalanced?.subHref} />
      <RecordCard label="Highest Avg Margin H2H" value={rivalryRecords.highestMargin?.value} sub={rivalryRecords.highestMargin?.teams} accent="red" icon={TrendingUp} top5={rivalryRecords.highestMargin?.top5} subHref={rivalryRecords.highestMargin?.subHref} />
      <RecordCard label="Closest Avg Margin H2H" value={rivalryRecords.lowestMargin?.value} sub={rivalryRecords.lowestMargin?.teams} accent="cyan" icon={Target} top5={rivalryRecords.lowestMargin?.top5} subHref={rivalryRecords.lowestMargin?.subHref} />
    </RecordSection>
  </>
)}

{/* GLORY */}
{tab === 'glory' && (
  <>
    <RecordSection title="Championship Leaders">
      <RecordCard label="Most Titles" value={gloryRecords.mostTitles?.value} sub={gloryRecords.mostTitles?.teams} team={gloryRecords.mostTitles?.teams} accent="gold" icon={Trophy} top5={gloryRecords.mostTitles?.top5} />
      <RecordCard label="Most Finals Apps" value={gloryRecords.mostFinals?.value} sub={gloryRecords.mostFinals?.teams} team={gloryRecords.mostFinals?.teams} accent="purple" icon={Star} top5={gloryRecords.mostFinals?.top5} />
    </RecordSection>
  </>
)}

{/* SHAME */}
{tab === 'shame' && (
  <>
    <RecordSection title="Unicorn Leaders">
      <RecordCard label="Most Unicorn Years 🦄" value={gloryRecords.mostUnicorn?.value} sub={gloryRecords.mostUnicorn?.teams} team={gloryRecords.mostUnicorn?.teams} accent="slate" icon={Skull} top5={gloryRecords.mostUnicorn?.top5} />
    </RecordSection>
  </>
)}
          </div>
        )}
      </section>
      <SummaryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        allSeasons={allSeasons}
      />

      {/* Footer */}
      <footer className="w-full border-t-4 border-[#D01F2D] bg-[#16274F]">
        <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-3 px-5 py-6 sm:px-8 lg:px-12">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={24} height={24} style={{ filter: 'invert(1)' }} className="opacity-50" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-[#B8C0D0]">Tapitas League · Est. 2014</span>
        </div>
      </footer>
    </main>
  )
}