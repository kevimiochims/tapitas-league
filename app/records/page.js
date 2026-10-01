'use client'
import Link from 'next/link'
import { PageShell, PageBar, BarTab, LeaderCard, LoadingState, TeamLogo, PositionBadge as UiPositionBadge } from '../components/ui'
import SummaryDrawer from '../components/SummaryDrawer'
import React, { Suspense, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import PlayerCutout from '../components/PlayerCutout'
import { Trophy, Flame, Swords, Activity, Users, Star, Zap, Shield, Target, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ChevronRight, Skull, RotateCw } from 'lucide-react'

const BASE_URL = '/api/sheet'

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
  'ari': 'ari', 'atl': 'atl', 'bal': 'bal', 'buf': 'buf', 'car': 'car', 'chi': 'chi', 'cin': 'cin', 'cle': 'cle',
  'dal': 'dal', 'den': 'den', 'det': 'det', 'gb': 'gb', 'hou': 'hou', 'ind': 'ind', 'jax': 'jax', 'kc': 'kc',
  'lac': 'lac', 'lar': 'lar', 'lv': 'lv', 'mia': 'mia', 'min': 'min', 'ne': 'ne', 'no': 'no', 'nyg': 'nyg',
  'nyj': 'nyj', 'phi': 'phi', 'pit': 'pit', 'sea': 'sea', 'sf': 'sf', 'tb': 'tb', 'ten': 'ten', 'wsh': 'wsh'
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
  const px = size === 'sm' ? 28 : 36
  return (
    <span className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[10px] font-semibold uppercase text-[#16274F] ring-1 ring-[#E6E8EB]" style={{ width: px, height: px }} title={name || ''}>
      {avatar
        ? <img src={avatar} alt={name || ''} className="h-full w-full object-cover" loading="lazy" />
        : String(name || '?').split(/\s+/).map(part => part[0]).join('').slice(0, 2)}
    </span>
  )
}

function PositionBadge({ position }) {
  const pos = String(position || '').trim().toUpperCase() === 'DST' ? 'DEF' : position
  return <UiPositionBadge position={pos} />
}

function TeamAvatar({ team, size = 'md' }) {
  const px = size === 'sm' ? 24 : size === 'lg' ? 44 : 32
  return <TeamLogo name={team} size={px} />
}

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch { return [] }
}

const RECORD_ACCENTS = {
  gold: 'bg-[#FFF2B8] text-[#8D6A00]',
  cyan: 'bg-[#EEF3FF] text-[#02275F]',
  emerald: 'bg-[#E8F5EC] text-[#1E8E3E]',
  red: 'bg-[#FDECEE] text-[#D01F2D]',
  purple: 'bg-[#EEF3FF] text-[#02275F]',
  orange: 'bg-[#FFF1E0] text-[#B45309]',
  slate: 'bg-[#F1F2F4] text-[#3F4757]',
}

// Card de recorde no formato "stat leaders": líder em destaque e 2º–5º embaixo.
// Raridade da carta conforme o tipo de recorde.
const RARITY = {
  gold: { name: 'Legendary', symbol: '★', frame: 'linear-gradient(135deg, #F5C518 0%, #B8860B 55%, #F5D76E 100%)', text: 'text-[#8D6A00]' },
  cyan: { name: 'Epic', symbol: '●', frame: 'linear-gradient(135deg, #02275F 0%, #3B5B9A 60%, #02275F 100%)', text: 'text-[#02275F]' },
  purple: { name: 'Epic', symbol: '●', frame: 'linear-gradient(135deg, #02275F 0%, #3B5B9A 60%, #02275F 100%)', text: 'text-[#02275F]' },
  emerald: { name: 'Rare', symbol: '◆', frame: 'linear-gradient(135deg, #C9CED6 0%, #7C8594 55%, #DDE1E7 100%)', text: 'text-[#4B5563]' },
  orange: { name: 'Rare', symbol: '◆', frame: 'linear-gradient(135deg, #C9CED6 0%, #7C8594 55%, #DDE1E7 100%)', text: 'text-[#4B5563]' },
  red: { name: 'Infamous', symbol: '✕', frame: 'linear-gradient(135deg, #D01F2D 0%, #7A0F1D 60%, #D01F2D 100%)', text: 'text-[#B3171F]' },
  slate: { name: 'Infamous', symbol: '✕', frame: 'linear-gradient(135deg, #D01F2D 0%, #7A0F1D 60%, #D01F2D 100%)', text: 'text-[#B3171F]' },
}

// Card de recorde no estilo do Top Performance (página Players): detentor em
// destaque, número grande e o 2º–5º logo abaixo. Todos os cards têm o mesmo
// peso visual; a cor de cada tipo de recorde aparece só no rótulo e no ícone.
const RING = {
  gold: 'bg-[#B8860B]', cyan: 'bg-[#02275F]', purple: 'bg-[#02275F]', emerald: 'bg-[#1E8E3E]',
  orange: 'bg-[#C98A55]', red: 'bg-[#D01F2D]', slate: 'bg-[#C0C4CC]',
}

// Cores dos cards (equilíbrio da Home): em cada seção só o 1º card é forte
// (azul, vermelho ou azul-escuro, alternando por seção); os outros são claros.
const DARK = {
  icon: 'text-white/[0.08]', label: 'text-white/75', nameHover: 'hover:text-white/80', chip: 'bg-white/15 text-white',
  meta: 'text-white/70', divider: 'border-white/15', btn: 'text-white hover:bg-white/10', rowText: 'text-white/90',
  rowSub: 'text-white/55', rowHover: 'hover:bg-white/10', rowBorder: 'border-white/10', rank: 'text-white/50', dark: true,
}
const LIGHT = {
  icon: 'text-[#02275F]/[0.05]', label: null, nameHover: 'hover:text-[#D01F2D]', chip: 'bg-[#F1F2F4] text-[#4B5563]',
  meta: 'text-[#6B7280]', divider: 'border-[#F1F2F4]', btn: 'text-[#02275F] hover:bg-[#F7F8FA]', rowText: 'text-[#3F4757]',
  rowSub: 'text-[#9CA3AF]', rowHover: 'hover:bg-[#F7F8FA]', rowBorder: 'border-[#F7F8FA]', rank: 'text-[#9CA3AF]', dark: false,
}
const tint = (bg, line, hover) => ({ ...LIGHT, card: `${bg} text-[#111]`, divider: line, rowBorder: line, rowHover: hover, btn: `text-[#02275F] ${hover}` })
const WHITE = { ...LIGHT, card: 'bg-white text-[#111]' }
const CARD_TONES = [
  [{ ...DARK, card: 'bg-[#02275F] text-white', label: 'text-[#E8C766]' }, tint('bg-[#FDF2F3]', 'border-[#F7DDE0]', 'hover:bg-[#FBE7EA]'), WHITE],
  [{ ...DARK, card: 'bg-[#B3171F] text-white', label: 'text-white/80' }, tint('bg-[#EEF3FF]', 'border-[#DCE5F7]', 'hover:bg-[#E3EBFB]'), WHITE],
  [{ ...DARK, card: 'bg-[#16274F] text-white', label: 'text-[#E8C766]' }, tint('bg-[#F4F5F7]', 'border-[#E6E8EB]', 'hover:bg-[#ECEEF1]'), WHITE],
]

// Logos de dois times sobrepostos (confrontos)
function VersusLogos({ teams, size }) {
  return (
    <span className="flex -space-x-3">
      {teams.map((t, i) => <span key={i} className="rounded-full bg-white shadow-sm"><TeamLogo name={t} size={size} /></span>)}
    </span>
  )
}

function RecordCard({ label, value, sub, sub2, subHref, sub2Href, subItems, accent, icon: Icon, top5, team, player, tone }) {
  const [open, setOpen] = useState(false)
  const t = tone || CARD_TONES[0][2]
  const rarity = RARITY[accent] || RARITY.slate
  const subArr = Array.isArray(sub) ? sub.filter(Boolean) : sub ? [sub] : []
  const teamArr = Array.isArray(team) ? team.filter(Boolean) : team ? [team] : []
  const playerArr = Array.isArray(player) ? player : []
  const items = Array.isArray(subItems) && subItems.length > 0 ? subItems : null
  const rows = Array.isArray(top5) ? top5.slice(0, 5) : []
  const lead = rows[0] || null

  // Um único destaque (o #1 do top 5, que já vem com o desempate aplicado).
  // Sem top 5, usa o primeiro detentor informado.
  const leadLabel = lead ? (Array.isArray(lead.label) ? lead.label.join(', ') : String(lead.label || '')) : ''
  const pairSource = leadLabel.includes(' vs ') ? leadLabel : [...teamArr, ...subArr].find(x => String(x).includes(' vs '))
  const pair = pairSource ? String(pairSource).split(' vs ').slice(0, 2) : null
  const leadPlayer = lead && (lead.playerId || lead.position) ? { playerId: lead.playerId, name: leadLabel } : playerArr[0] || null
  const leadTeam = !pair && !leadPlayer ? (lead?.team || (lead ? leadLabel : teamArr[0])) : null
  const name = lead ? leadLabel : items?.[0]?.text || subArr[0] || teamArr[0] || '—'
  const meta = (lead && (lead.meta || lead.sub)) || items?.[0]?.meta || sub2 || ''
  const badge = (lead?.position || items?.[0]?.position) ? <PositionBadge position={lead?.position || items?.[0]?.position} /> : null
  const href = lead?.href || items?.[0]?.href || subHref || sub2Href || (leadTeam ? teamHref(leadTeam) : undefined)
  const tied = Math.max(teamArr.length, playerArr.length, items?.length || 0, subArr.length)

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-xl ${t.card}`}>
      {Icon && <Icon className={`pointer-events-none absolute -right-2 -top-2 h-24 w-24 ${t.icon}`} strokeWidth={2.5} />}
      <div className="relative flex items-center gap-4 p-4">
        <div className="flex-shrink-0">
          {pair ? <VersusLogos teams={pair} size={52} />
            : leadPlayer ? (t.dark
              // Card escuro: foto recortada grande, encostada na base do card
              ? <PlayerCutout sleeperId={leadPlayer.playerId} name={leadPlayer.name} className="-mb-4 h-[92px]" />
              : <span className={`block rounded-full p-0.5 ${RING[accent] || RING.slate}`}><span className="block rounded-full bg-white"><PlayerPhotoLarge playerId={leadPlayer.playerId} name={leadPlayer.name} size={64} /></span></span>)
              : leadTeam ? (t.dark ? <span className="block rounded-full bg-white p-1 shadow-lg"><TeamLogo name={leadTeam} size={58} /></span> : <TeamLogo name={leadTeam} size={64} />)
                : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4F5F7] text-[#9CA3AF]">—</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[11px] font-semibold uppercase tracking-[0.12em] ${t.label || rarity.text}`}>{label}</div>
          {href
            ? <a href={href} className={`mt-0.5 flex min-w-0 items-center gap-1.5 text-[15px] font-semibold ${t.nameHover}`}><span className="truncate">{name}</span>{badge}</a>
            : <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[15px] font-semibold"><span className="truncate">{name}</span>{badge}</div>}
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[32px] font-bold leading-none tabular-nums tracking-tight">{value ?? '—'}</span>
            {tied > 1 && <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${t.chip}`}>{tied}-way tie</span>}
          </div>
          {meta && <div className={`mt-1.5 truncate text-[12px] ${t.meta}`}>{meta}</div>}
        </div>
      </div>
      {rows.length > 1 && (
        <div className={`relative mt-auto border-t ${t.divider}`}>
          <button type="button" onClick={() => setOpen(o => !o)} className={`flex w-full items-center justify-center gap-1 py-2 text-[12px] font-medium ${t.btn}`}>
            {open ? 'Hide top 5' : 'Top 5'}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && rows.slice(1).map((item, i) => {
            const labelText = Array.isArray(item.label) ? item.label.join(', ') : item.label
            const isPlayer = Boolean(item.playerId || item.position)
            const rowPair = !Array.isArray(item.label) && String(labelText).includes(' vs ') ? String(labelText).split(' vs ').slice(0, 2) : null
            const content = (
              <>
                <span className={`w-4 flex-shrink-0 text-[12px] font-semibold tabular-nums ${t.rank}`}>{i + 2}</span>
                {rowPair ? <VersusLogos teams={rowPair} size={22} />
                  : !Array.isArray(item.label) && (isPlayer ? <PlayerAvatar playerId={item.playerId} name={labelText} size="sm" /> : <TeamAvatar team={item.team || labelText} size="sm" />)}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[12px] font-medium ${t.rowText}`}>{labelText}</span>
                  {(item.meta || item.sub) && <span className={`block truncate text-[10px] ${t.rowSub}`}>{item.meta || item.sub}</span>}
                </span>
                <span className="flex-shrink-0 text-[12px] font-semibold tabular-nums">{item.value}</span>
              </>
            )
            const cls = `flex items-center gap-2 border-t px-4 py-1.5 ${t.rowBorder} ${t.rowHover}`
            return item.href ? <a key={i} href={item.href} className={cls}>{content}</a> : <div key={i} className={cls}>{content}</div>
          })}
        </div>
      )}
    </div>
  )
}

function PlayerPhotoLarge({ playerId, name, size }) {
  const [failed, setFailed] = useState(false)
  const id = String(playerId || '').trim()
  const initials = String(name || '?').split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className="flex items-center justify-center overflow-hidden rounded-full bg-[#F4F5F7] font-semibold text-[#16274F]" style={{ width: size, height: size, fontSize: size * 0.3 }}>
      {id && !failed
        ? <img src={`https://sleepercdn.com/content/nfl/players/${encodeURIComponent(id)}.jpg`} alt={name} className="h-full w-full object-cover" style={{ objectPosition: '50% 20%' }} onError={() => setFailed(true)} />
        : initials}
    </span>
  )
}

function RecordSection({ title, index = 0, children }) {
  const palette = CARD_TONES[index % CARD_TONES.length]
  const cards = React.Children.toArray(children).filter(Boolean)
  return (
    <section className="mb-4">
      <h2 className="mb-2 px-1 text-[15px] font-bold text-[#111]">{title}</h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, i) => React.isValidElement(card) ? React.cloneElement(card, { tone: i === 0 ? palette[0] : palette[1 + ((i - 1) % 2)] }) : card)}
      </div>
    </section>
  )
}

// Numera as seções de uma aba para alternar os tons de cor entre elas
function Sections({ children }) {
  let n = 0
  return React.Children.toArray(children).map(child => React.isValidElement(child) && child.type === RecordSection ? React.cloneElement(child, { index: n++ }) : child)
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

// useSearchParams precisa de um Suspense em volta nas páginas estáticas
export default function RecordsPage() {
  return (
    <Suspense fallback={<PageShell loading />}>
      <RecordsPageContent />
    </Suspense>
  )
}

function RecordsPageContent() {
  const [allTime, setAllTime] = useState([])
  const [history, setHistory] = useState([])
  const [games, setGames] = useState([])
  const [h2h, setH2h] = useState([])
  const [playerCache, setPlayerCache] = useState([])
  const [loading, setLoading] = useState(true)
  // Abre direto numa aba via ?tab= (ex.: vindo dos números da Home)
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab')
    return TABS.some(x => x.key === t) ? t : 'franchise'
  })
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

    // Only franchises currently present in TEAM_ALL_TIME may be record holders.
    // Historical opponents can still participate in matchup-based records elsewhere,
    // but they cannot be shown as the franchise that owns a franchise record.
    const currentTeams = new Set(
      allTime
        .map(r => String(r?.Team || '').trim())
        .filter(Boolean)
        .map(normalizeTeamName)
    )

    const topN = (arr, key, n = 5, asc = false, fmt = v => v) => {
      const sorted = [...arr].sort((a, b) =>
        asc ? parseNumber(a[key]) - parseNumber(b[key]) : parseNumber(b[key]) - parseNumber(a[key])
      )
      const topVal = parseNumber(sorted[0]?.[key])
      const winners = sorted.filter(r => parseNumber(r[key]) === topVal).map(r => String(r.Team || '').trim())
      return {
        value: fmt(topVal),
        teams: winners,
        top5: sorted.slice(0, n).map(r => ({ label: String(r.Team || '').trim(), sub: `${parseNumber(r.W)}–${parseNumber(r.L)} all-time`, value: fmt(parseNumber(r[key])) }))
      }
    }

    const parseWinPct = r => parseNumber(String(r?.['W%'] || '0').replace('%', ''))
    const sortedByWP = [...allTime].sort((a, b) => parseWinPct(b) - parseWinPct(a))
    const topWP = parseWinPct(sortedByWP[0])
    const bestWinPct = {
      value: String(sortedByWP[0]?.['W%'] || ''),
      teams: sortedByWP.filter(r => parseWinPct(r) === topWP).map(r => String(r.Team || '').trim()),
      top5: sortedByWP.slice(0, 5).map(r => ({ label: String(r.Team || '').trim(), sub: `${parseNumber(r.W)}–${parseNumber(r.L)} all-time`, value: String(r['W%'] || '') }))
    }

    // 10W seasons — track which years
    const tenWSeasons = {}, tenWTotal = {}
    const tenWSeasonsYears = {}, tenWTotalYears = {}
    history.forEach(r => {
      const team = String(r?.Team || '').trim()
      if (!currentTeams.has(normalizeTeamName(team))) return
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
      return { value: topVal, teams: sorted.filter(e => e[1] === topVal).map(e => e[0]), top5: sorted.slice(0, 5).map(([l, v]) => ({ label: l, sub: `${v} week${v === 1 ? '' : 's'} at #1 · reg season`, value: v })) }
    }

    // PR #1 weeks — Reg Season only
    // Same eligibility rule used by Weekly High Scorer (RS): playoff and
    // consolation weeks do not count because not every team can compete for #1.
    const pr1All = {}, pr1from21 = {}, pr1from23 = {}
    games.forEach(g => {
      if (String(g?.GameStage || '').trim() !== 'Reg Season') return
      if (parseNumber(g?.['Power Ranking']) !== 1) return
      const team = String(g?.Team || '').trim()
      if (!currentTeams.has(normalizeTeamName(team))) return
      const season = Number(String(g?.Season || '0').trim())
      pr1All[team] = (pr1All[team] || 0) + 1
      if (season >= 2021) pr1from21[team] = (pr1from21[team] || 0) + 1
      if (season >= 2023) pr1from23[team] = (pr1from23[team] || 0) + 1
    })

    // Playoff finals years per team
    const finalsYearsMap = {}
    history.filter(r => String(r?.Reached_Final || '').toUpperCase() === 'TRUE').forEach(r => {
      const t = String(r?.Team || '').trim()
      if (!currentTeams.has(normalizeTeamName(t))) return
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
      if (!currentTeams.has(normalizeTeamName(t))) return
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
      if (!currentTeams.has(normalizeTeamName(team))) return
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

    // Weekly High Scorer — Reg Season only (same rule as the Teams page)
    // For each regular-season single week, the highest PF among ALL teams
    // (former franchises included) wins the week; ties credit every tied team.
    // Only afterwards are the results limited to current franchises.
    const weeklyHighMap = {}
    const weeklyHighYears = {}
    const rsWeeks = {}
    games.forEach(g => {
      if (String(g?.GameStage || '').trim() !== 'Reg Season') return
      if (isDoubleWeek(g)) return
      const season = String(g?.Season || '').trim()
      const week = String(g?.Week || '').trim()
      const team = String(g?.Team || '').trim()
      if (!season || !week || !team) return
      const key = `${season}|${week}`
      if (!rsWeeks[key]) rsWeeks[key] = { season, max: -Infinity, teams: new Map() }
      const pf = parseNumber(g?.PF)
      rsWeeks[key].teams.set(normalizeTeamName(team), { team, pf })
      rsWeeks[key].max = Math.max(rsWeeks[key].max, pf)
    })
    const rsByWeek = Object.values(rsWeeks).flatMap(({ season, max, teams }) =>
      max > 0
        ? Array.from(teams.values())
          .filter(t => t.pf === max && currentTeams.has(normalizeTeamName(t.team)))
          .map(t => ({ season, team: t.team }))
        : []
    )
    rsByWeek.forEach(({ season, team }) => {
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
    rsByWeek.forEach(({ season, team }) => {
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

    // Melhor média de pontos por jogo (semanas simples, todas as fases),
    // só franquias atuais
    const currentSet = new Set(allTime.map(r => normalizeTeamName(String(r?.Team || '').trim())))
    const avgAcc = {}
    games.filter(g => !isDoubleWeek(g) && parseNumber(g?.PF) > 0).forEach(g => {
      const team = String(g?.Team || '').trim()
      if (!currentSet.has(normalizeTeamName(team))) return
      if (!avgAcc[team]) avgAcc[team] = { sum: 0, n: 0 }
      avgAcc[team].sum += parseNumber(g.PF)
      avgAcc[team].n += 1
    })
    const avgRows = Object.entries(avgAcc).map(([team, a]) => ({ team, avg: a.sum / a.n, n: a.n })).sort((a, b) => b.avg - a.avg)
    const bestAvg = avgRows.length ? {
      value: avgRows[0].avg.toFixed(2),
      teams: avgRows.filter(r => Math.abs(r.avg - avgRows[0].avg) < 0.005).map(r => r.team),
      top5: avgRows.slice(0, 5).map(r => ({ label: r.team, value: r.avg.toFixed(2), sub: `${r.n} games` })),
    } : null

    return {
      bestAvg,
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

    // TEAM_ALL_TIME defines the current Tapitas League franchises. It is used
    // only as the eligibility list; streak values themselves are calculated
    // from GAME_FACTS_ALL so Total and Single Season use the same source of truth.
    const currentTeams = new Map()
    allTime.forEach(row => {
      const team = String(row?.Team || '').trim()
      if (team) currentTeams.set(normalizeTeamName(team), team)
    })

    const parseWeek = value => {
      const match = String(value ?? '').match(/\d+(?:\.\d+)?/)
      return match ? Number(match[0]) : 0
    }

    const parseResult = game => {
      const result = String(game?.Result || '').trim().toUpperCase()
      if (result === 'W' || result === 'L' || result === 'T') return result

      const pf = parseNumber(game?.PF)
      const pa = parseNumber(game?.PA)
      if (pf > pa) return 'W'
      if (pf < pa) return 'L'
      return 'T'
    }

    // Build chronological game rows only for the 10 current franchises.
    // Opponents are deliberately NOT filtered: a current team can keep a
    // streak through games against historical/former franchises.
    const byTeam = new Map()
    games.forEach(game => {
      const rawTeam = String(game?.Team || '').trim()
      const canonicalTeam = currentTeams.get(normalizeTeamName(rawTeam))
      if (!canonicalTeam) return

      const row = {
        team: canonicalTeam,
        season: parseNumber(game?.Season || 0),
        weekNum: parseWeek(game?.Week),
        rawWeek: String(game?.Week || '').trim(),
        result: parseResult(game),
      }

      const key = normalizeTeamName(canonicalTeam)
      if (!byTeam.has(key)) byTeam.set(key, [])
      byTeam.get(key).push(row)
    })

    const sortChronologically = arr => [...arr].sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season
      if (a.weekNum !== b.weekNum) return a.weekNum - b.weekNum
      return String(a.rawWeek).localeCompare(String(b.rawWeek), undefined, { numeric: true })
    })

    const formatRange = (start, end, active = false) => {
      if (!start || !end) return ''
      return `Week ${start.rawWeek}, ${start.season} → Week ${end.rawWeek}, ${end.season}${active ? ' · Active' : ''}`
    }

    // Finds the best streak(s) in a chronological sequence. For Total we keep
    // one record per team and retain the most recent occurrence of that team's
    // maximum. For Single Season, the caller creates one sequence per season.
    const calculateSequence = rows => {
      if (!rows.length) return null

      let bestW = 0
      let bestL = 0
      let curW = 0
      let curL = 0
      let bestWEnd = null
      let bestLEnd = null
      let bestWStart = null
      let bestLStart = null
      let curWStart = null
      let curLStart = null

      rows.forEach(row => {
        if (row.result === 'W') {
          curW += 1
          curL = 0
          curWStart = curW === 1 ? row : curWStart
          curLStart = null

          if (curW >= bestW) {
            bestW = curW
            bestWStart = curWStart
            bestWEnd = row
          }
        } else if (row.result === 'L') {
          curL += 1
          curW = 0
          curLStart = curL === 1 ? row : curLStart
          curWStart = null

          if (curL >= bestL) {
            bestL = curL
            bestLStart = curLStart
            bestLEnd = row
          }
        } else {
          curW = 0
          curL = 0
          curWStart = null
          curLStart = null
        }
      })

      return {
        bestW,
        bestL,
        bestWStart,
        bestWEnd,
        bestLStart,
        bestLEnd,
      }
    }

    // Total streaks: calculated from actual W/L results across all seasons and
    // all stages. A former franchise as the opponent does not interrupt a run.
    const totalRows = []
    byTeam.forEach((teamGames) => {
      const sorted = sortChronologically(teamGames)
      if (!sorted.length) return

      const calc = calculateSequence(sorted)
      const team = sorted[0].team
      const last = sorted[sorted.length - 1]

      if (calc?.bestW > 0) {
        const active = last.result === 'W' && calc.bestWEnd?.season === last.season && calc.bestWEnd?.weekNum === last.weekNum
        totalRows.push({
          team,
          type: 'W',
          val: calc.bestW,
          display: `W${calc.bestW}`,
          start: calc.bestWStart,
          end: calc.bestWEnd,
          active,
        })
      }
      if (calc?.bestL > 0) {
        const active = last.result === 'L' && calc.bestLEnd?.season === last.season && calc.bestLEnd?.weekNum === last.weekNum
        totalRows.push({
          team,
          type: 'L',
          val: calc.bestL,
          display: `L${calc.bestL}`,
          start: calc.bestLStart,
          end: calc.bestLEnd,
          active,
        })
      }
    })

    const buildTotalRecord = type => {
      const rows = totalRows
        .filter(r => r.type === type)
        .sort((a, b) => {
          if (b.val !== a.val) return b.val - a.val
          const bySeason = (b.end?.season || 0) - (a.end?.season || 0)
          if (bySeason !== 0) return bySeason
          return normalizeTeamName(a.team).localeCompare(normalizeTeamName(b.team))
        })

      const topVal = rows[0]?.val || 0
      const top = rows.filter(r => r.val === topVal)
      return {
        value: rows[0]?.display || '—',
        teams: top.map(r => r.team),
        top5: rows.slice(0, 5).map(r => ({
          label: r.team,
          sub: formatRange(r.start, r.end, r.active),
          value: r.display,
        })),
      }
    }

    // Single-season streaks: one independent record per current team + season.
    // Therefore, if OldBrady has L7 in two different seasons, BOTH rows remain
    // eligible for the Top 5 and can appear simultaneously.
    const byTeamSeason = new Map()
    byTeam.forEach(teamGames => {
      teamGames.forEach(row => {
        const key = `${normalizeTeamName(row.team)}|${row.season}`
        if (!byTeamSeason.has(key)) byTeamSeason.set(key, [])
        byTeamSeason.get(key).push(row)
      })
    })

    const seasonRows = []
    byTeamSeason.forEach(seasonGames => {
      const sorted = sortChronologically(seasonGames)
      if (!sorted.length) return

      const calc = calculateSequence(sorted)
      const { team, season } = sorted[0]
      const last = sorted[sorted.length - 1]

      if (calc?.bestW > 0) {
        seasonRows.push({
          team,
          season,
          type: 'W',
          val: calc.bestW,
          display: `W${calc.bestW}`,
          start: calc.bestWStart,
          end: calc.bestWEnd,
          active: last.result === 'W' && calc.bestWEnd?.weekNum === last.weekNum,
        })
      }
      if (calc?.bestL > 0) {
        seasonRows.push({
          team,
          season,
          type: 'L',
          val: calc.bestL,
          display: `L${calc.bestL}`,
          start: calc.bestLStart,
          end: calc.bestLEnd,
          active: last.result === 'L' && calc.bestLEnd?.weekNum === last.weekNum,
        })
      }
    })

    const buildSeasonRecord = type => {
      const rows = seasonRows
        .filter(r => r.type === type)
        .sort((a, b) => {
          if (b.val !== a.val) return b.val - a.val
          if (b.season !== a.season) return b.season - a.season
          return normalizeTeamName(a.team).localeCompare(normalizeTeamName(b.team))
        })

      const topVal = rows[0]?.val || 0
      const top = rows.filter(r => r.val === topVal)
      return {
        value: rows[0]?.display || '—',
        teams: top.map(r => `${r.team} (${r.season})`),
        top5: rows.slice(0, 5).map(r => ({
          label: r.team,
          sub: `${r.season}`,
          value: r.display,
        })),
      }
    }

    // Regular-season streaks use the exact same Result-based engine, but only
    // consume rows whose GameStage is Reg Season. This avoids relying on the
    // precomputed TEAM_ALL_TIME streak columns while keeping the meaning of the
    // existing RS cards unchanged.
    const regRowsByTeam = new Map()
    games.forEach(game => {
      if (String(game?.GameStage || '').trim() !== 'Reg Season') return
      const rawTeam = String(game?.Team || '').trim()
      const canonicalTeam = currentTeams.get(normalizeTeamName(rawTeam))
      if (!canonicalTeam) return

      const key = normalizeTeamName(canonicalTeam)
      if (!regRowsByTeam.has(key)) regRowsByTeam.set(key, [])
      regRowsByTeam.get(key).push({
        team: canonicalTeam,
        season: parseNumber(game?.Season || 0),
        weekNum: parseWeek(game?.Week),
        rawWeek: String(game?.Week || '').trim(),
        result: parseResult(game),
      })
    })

    const regTotalRows = []
    regRowsByTeam.forEach(teamGames => {
      const sorted = sortChronologically(teamGames)
      if (!sorted.length) return
      const calc = calculateSequence(sorted)
      const last = sorted[sorted.length - 1]
      const team = sorted[0].team

      if (calc?.bestW > 0) {
        regTotalRows.push({
          team, type: 'W', val: calc.bestW, display: `W${calc.bestW}`,
          start: calc.bestWStart, end: calc.bestWEnd,
          active: last.result === 'W' && calc.bestWEnd?.season === last.season && calc.bestWEnd?.weekNum === last.weekNum,
        })
      }
      if (calc?.bestL > 0) {
        regTotalRows.push({
          team, type: 'L', val: calc.bestL, display: `L${calc.bestL}`,
          start: calc.bestLStart, end: calc.bestLEnd,
          active: last.result === 'L' && calc.bestLEnd?.season === last.season && calc.bestLEnd?.weekNum === last.weekNum,
        })
      }
    })

    const buildRegRecord = type => {
      const rows = regTotalRows
        .filter(r => r.type === type)
        .sort((a, b) => {
          if (b.val !== a.val) return b.val - a.val
          const bySeason = (b.end?.season || 0) - (a.end?.season || 0)
          if (bySeason !== 0) return bySeason
          return normalizeTeamName(a.team).localeCompare(normalizeTeamName(b.team))
        })

      const topVal = rows[0]?.val || 0
      const top = rows.filter(r => r.val === topVal)
      return {
        value: rows[0]?.display || '—',
        teams: top.map(r => r.team),
        top5: rows.slice(0, 5).map(r => ({
          label: r.team,
          sub: formatRange(r.start, r.end, r.active),
          value: r.display,
        })),
      }
    }

    return {
      bestWTotal: buildTotalRecord('W'),
      bestWRS: buildRegRecord('W'),
      bestLTotal: buildTotalRecord('L'),
      bestLRS: buildRegRecord('L'),
      bestSeasonW: buildSeasonRecord('W'),
      bestSeasonL: buildSeasonRecord('L'),
    }
  }, [allTime, games])

  // ── GAMES ──────────────────────────────────────────────────────────
  const gameRecords = useMemo(() => {
    if (!games.length || !allTime.length) return {}

    const currentTeams = new Set(
      allTime
        .map(r => String(r?.Team || '').trim())
        .filter(Boolean)
        .map(normalizeTeamName)
    )

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
      const sorted = [...arr]
        .filter(g => currentTeams.has(normalizeTeamName(String(g?.Team || '').trim())))
        .filter(g => parseNumber(g?.PF) > 0)
        .sort((a, b) => parseNumber(b.PF) - parseNumber(a.PF))
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
      const sorted = [...arr]
        .filter(g => currentTeams.has(normalizeTeamName(String(g?.Team || '').trim())))
        .filter(g => parseNumber(g?.PF) > 0)
        .sort((a, b) => parseNumber(a.PF) - parseNumber(b.PF))
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
        .filter(g => currentTeams.has(normalizeTeamName(String(g?.Team || '').trim())) || currentTeams.has(normalizeTeamName(String(g?.Opponent || '').trim())))
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
        .filter(g => currentTeams.has(normalizeTeamName(String(g?.Team || '').trim())))
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
      if (!currentTeams.has(normalizeTeamName(team))) return
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
      top5: over200Sorted.slice(0, 5).map(([team, cnt]) => ({ label: team, sub: `${cnt} game${cnt === 1 ? '' : 's'} with 200+ pts`, value: cnt }))
    }

    return {
      // Score records use the original team rows, not matchup deduplication,
      // because a current team can own a high/low score even when it lost the game.
      highAll: mkHighest(games),
      highNoDouble: mkHighest(games.filter(g => !isDoubleWeek(g))),
      highReg: mkHighest(games.filter(g => String(g?.GameStage || '').trim() === 'Reg Season')),
      highRegNoDb: mkHighest(games.filter(g => String(g?.GameStage || '').trim() === 'Reg Season' && !isDoubleWeek(g))),
      highPO: mkHighest(games.filter(g => String(g?.GameStage || '').trim() === 'Playoffs')),
      highPONoDb: mkHighest(games.filter(g => String(g?.GameStage || '').trim() === 'Playoffs' && !isDoubleWeek(g))),
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
  }, [games, allTime])

  // ── PLAYERS ────────────────────────────────────────────────────────
  // Player records are derived from the same GAME_FACTS_ALL roster/points
  // logic used by the Teams Player Profile. A player-franchise pair is the
  // unit of record, so the same player can hold different records for
  // different franchises.
  const playerRecords = useMemo(() => {
    if (!games.length || !allTime.length) return {}

    const currentTeams = new Set(
      allTime
        .map(r => String(r?.Team || '').trim())
        .filter(Boolean)
        .map(normalizeTeamName)
    )

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
        if (!team || !currentTeams.has(normalizeTeamName(team))) return

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
        // Mesmo desempate do destaque, para o top 5 seguir a mesma ordem
        // (Most Rostered → mais starts; Most Started → mais vezes no elenco)
        if (metric === 'rostered') { const d = (Number(b.started) || 0) - (Number(a.started) || 0); if (d) return d }
        if (metric === 'started') { const d = (Number(b.rostered) || 0) - (Number(a.rostered) || 0); if (d) return d }
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
        ? [[...tiedWinners].sort((a, b) => {
          if (metric === 'started') {
            const rosteredDiff = (Number(b.rostered) || 0) - (Number(a.rostered) || 0)
            if (rosteredDiff !== 0) return rosteredDiff
          } else {
            const startedDiff = (Number(b.started) || 0) - (Number(a.started) || 0)
            if (startedDiff !== 0) return startedDiff
          }
          return String(a.name || '').localeCompare(String(b.name || ''))
        })[0]]
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
          sub: metric === 'rostered'
            ? `${r.team} · ${r.started} starts`
            : metric === 'started'
              ? `${r.team} · ${r.rostered} rostered`
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
                ? `${r.team} · ${r.avgCount} games`
                : r.team,
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
  }, [games, playerCache, allTime])

  // ── SEASONS ────────────────────────────────────────────────────────
  const seasonRecords = useMemo(() => {
    if (!history.length || !allTime.length) return {}

    const currentTeams = new Set(
      allTime
        .map(r => String(r?.Team || '').trim())
        .filter(Boolean)
        .map(normalizeTeamName)
    )
    const eligibleHistory = history.filter(r => currentTeams.has(normalizeTeamName(String(r?.Team || '').trim())))

    // Aggregate total-season (RS + Playoffs + Consolation) PF and game count
    // directly from GAME_FACTS_ALL so we don't need extra sheet columns.
    const totByTeamSeason = {}
    games.forEach(g => {
      const team = String(g?.Team || '').trim()
      const season = String(g?.Season || '').trim()
      const pf = parseNumber(g?.PF)
      if (!team || !season || pf <= 0 || !currentTeams.has(normalizeTeamName(team))) return
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
    const completedHistory = eligibleHistory.filter(r =>
      completedSeasons.has(String(r?.Season || '').trim())
    )

    const from21 = eligibleHistory.filter(r => Number(String(r?.Season || '0')) >= 2021)
    const from23 = eligibleHistory.filter(r => Number(String(r?.Season || '0')) >= 2023)
    // completed variants — only for fewest points
    const from21c = completedHistory.filter(r => Number(String(r?.Season || '0')) >= 2021)
    const from23c = completedHistory.filter(r => Number(String(r?.Season || '0')) >= 2023)

    // Avg pts/week — all seasons (useful to see in-progress averages)
    const withAvg = eligibleHistory.map(r => ({
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
      byWin: mkTop(eligibleHistory, 'RS_W'),
      byLoss: mkTop(eligibleHistory, 'RS_L'),
      byTotW: mkTop(eligibleHistory, 'W'),
      byTotL: mkTop(eligibleHistory, 'L'),
      byPF: mkTop(eligibleHistory, 'RS_PF', 5, false, v => Math.round(v).toLocaleString()),
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
  }, [history, games, allTime])

  // ── RIVALRY ────────────────────────────────────────────────────────
  const rivalryRecords = useMemo(() => {
    if (!h2h.length || !allTime.length) return {}

    const currentTeams = new Set(
      allTime
        .map(r => String(r?.Team || '').trim())
        .filter(Boolean)
        .map(normalizeTeamName)
    )

    const seen = new Set()
    const dedup = h2h.filter(r => {
      const teamA = String(r?.['Team A'] || '').trim()
      const teamB = String(r?.['Team B'] || '').trim()
      if (!currentTeams.has(normalizeTeamName(teamA)) && !currentTeams.has(normalizeTeamName(teamB))) return false
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
      top5: mgSorted.slice(0, 5).map(r => ({ label: `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`, sub: `${parseNumber(r.Games)} meetings all-time`, value: parseNumber(r.Games), href: rivalryHref(r['Team A'], r['Team B']) }))
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
      if (sA && vA > 0 && currentTeams.has(normalizeTeamName(a))) allStreaks.push({ team: a, opponent: b, streak: sA, val: vA })
      if (sB && vB > 0 && currentTeams.has(normalizeTeamName(b))) allStreaks.push({ team: b, opponent: a, streak: sB, val: vB })
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
      top5: hmSorted.slice(0, 5).map(r => ({ label: `${r._norm.dominant} vs ${r._norm.other}`, sub: `${r._norm.dominant} ahead on average`, value: `${r._norm.margin.toFixed(2)} pts`, href: rivalryHref(r._norm.dominant, r._norm.other) }))
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
      top5: lmSorted.slice(0, 5).map(r => ({ label: `${r._norm.dominant} vs ${r._norm.other}`, sub: 'Average margin per meeting', value: `${r._norm.margin.toFixed(2)} pts`, href: rivalryHref(r._norm.dominant, r._norm.other) }))
    }

    return { mostGames, bestH2HStreak, mostBalanced, highestMargin, lowestMargin }
  }, [h2h, allTime])

  // ── GLORY ──────────────────────────────────────────────────────────
  const gloryRecords = useMemo(() => {
    if (!history.length || !allTime.length) return {}

    const currentTeams = new Set(
      allTime
        .map(r => String(r?.Team || '').trim())
        .filter(Boolean)
        .map(normalizeTeamName)
    )

    const currentHistory = history.filter(r => currentTeams.has(normalizeTeamName(String(r?.Team || '').trim())))
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
    currentHistory.filter(r => String(r?.Champion || '').toUpperCase() === 'TRUE').forEach(r => {
      const t = String(r?.Team || '').trim(); const s = String(r?.Season || '').trim()
      if (!titleYears[t]) titleYears[t] = []
      titleYears[t].push(s)
    })
    currentHistory.filter(r => String(r?.Reached_Final || '').toUpperCase() === 'TRUE').forEach(r => {
      const t = String(r?.Team || '').trim(); const s = String(r?.Season || '').trim()
      if (!finalsYears[t]) finalsYears[t] = []
      finalsYears[t].push(s)
    })
    unicorns.forEach(r => {
      const t = String(r?.Team || '').trim()
      if (!currentTeams.has(normalizeTeamName(t))) return
      const s = String(r?.Season || '').trim()
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
  }, [history, allTime])

  return (
    <PageShell headerProps={{ onSummaryOpen: () => setDrawerOpen(true) }}>
      <PageBar title="Record Book">
        {TABS.map(t => (
          <BarTab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            <t.Icon className="h-3.5 w-3.5" />
            {t.label}
          </BarTab>
        ))}
      </PageBar>

        {loading ? (
          <LoadingState />
        ) : (
          <div>

            {/* FRANCHISE */}
            {tab === 'franchise' && (
              <Sections>
                <RecordSection title="All-Time Wins & Losses">
                  <RecordCard label="Most Wins All-Time" value={franchiseRecords.mostWins?.value} sub={franchiseRecords.mostWins?.teams} team={franchiseRecords.mostWins?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostWins?.top5} />
                  <RecordCard label="Most Losses All-Time" value={franchiseRecords.mostLosses?.value} sub={franchiseRecords.mostLosses?.teams} team={franchiseRecords.mostLosses?.teams} accent="red" icon={TrendingDown} top5={franchiseRecords.mostLosses?.top5} />
                  <RecordCard label="Best Win % All-Time" value={franchiseRecords.bestWinPct?.value} sub={franchiseRecords.bestWinPct?.teams} team={franchiseRecords.bestWinPct?.teams} accent="cyan" icon={Target} top5={franchiseRecords.bestWinPct?.top5} />
                </RecordSection>

                <RecordSection title="Playoff Dominance">
                  <RecordCard label="Most Playoff Apps" value={franchiseRecords.mostPoApps?.value} sub={franchiseRecords.mostPoApps?.teams} team={franchiseRecords.mostPoApps?.teams} accent="purple" icon={Star} top5={franchiseRecords.mostPoApps?.top5} />
                  <RecordCard label="Most Finals Apps" value={franchiseRecords.mostFinals?.value} sub={franchiseRecords.mostFinals?.teams} team={franchiseRecords.mostFinals?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostFinals?.top5} />
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

                <RecordSection title="Scoring">
                  <RecordCard label="Most Points All-Time" value={franchiseRecords.mostPF?.value} sub={franchiseRecords.mostPF?.teams} team={franchiseRecords.mostPF?.teams} accent="emerald" icon={Activity} top5={franchiseRecords.mostPF?.top5} />
                  <RecordCard label="Best Points Average" value={franchiseRecords.bestAvg?.value} sub={franchiseRecords.bestAvg?.teams} team={franchiseRecords.bestAvg?.teams} sub2="Per game · single weeks · all stages" accent="cyan" icon={TrendingUp} top5={franchiseRecords.bestAvg?.top5} />
                  <RecordCard label="Most Games Over 200 pts" value={gameRecords.most200?.value} sub={gameRecords.most200?.teams} team={gameRecords.most200?.teams} sub2="Single weeks only · all stages" accent="orange" icon={Zap} top5={gameRecords.most200?.top5} />
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
              </Sections>
            )}

            {/* STREAKS */}
            {tab === 'streaks' && (
              <Sections>
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
              </Sections>
            )}

            {/* GAMES */}
            {tab === 'games' && (
              <Sections>
                <RecordSection title="Highest Scores — Including Double Weeks">
                  <RecordCard label="All-Time" value={gameRecords.highAll?.value} sub={gameRecords.highAll?.teams} team={gameRecords.highAll?.teams} sub2={gameRecords.highAll?.sub2} sub2Href={gameRecords.highAll?.sub2Href} accent="gold" icon={Flame} top5={gameRecords.highAll?.top5} />
                  <RecordCard label="Reg Season" value={gameRecords.highReg?.value} sub={gameRecords.highReg?.teams} team={gameRecords.highReg?.teams} sub2={gameRecords.highReg?.sub2} sub2Href={gameRecords.highReg?.sub2Href} accent="cyan" icon={Flame} top5={gameRecords.highReg?.top5} />
                  <RecordCard label="Playoffs" value={gameRecords.highPO?.value} sub={gameRecords.highPO?.teams} team={gameRecords.highPO?.teams} sub2={gameRecords.highPO?.sub2} sub2Href={gameRecords.highPO?.sub2Href} accent="purple" icon={Flame} top5={gameRecords.highPO?.top5} />
                </RecordSection>

                <RecordSection title="Highest Scores — Single Weeks Only">
                  <RecordCard label="All-Time" value={gameRecords.highNoDouble?.value} sub={gameRecords.highNoDouble?.teams} team={gameRecords.highNoDouble?.teams} sub2={gameRecords.highNoDouble?.sub2} sub2Href={gameRecords.highNoDouble?.sub2Href} accent="gold" icon={Flame} top5={gameRecords.highNoDouble?.top5} />
                  <RecordCard label="Reg Season" value={gameRecords.highRegNoDb?.value} sub={gameRecords.highRegNoDb?.teams} team={gameRecords.highRegNoDb?.teams} sub2={gameRecords.highRegNoDb?.sub2} sub2Href={gameRecords.highRegNoDb?.sub2Href} accent="cyan" icon={Flame} top5={gameRecords.highRegNoDb?.top5} />
                  <RecordCard label="Playoffs" value={gameRecords.highPONoDb?.value} sub={gameRecords.highPONoDb?.teams} team={gameRecords.highPONoDb?.teams} sub2={gameRecords.highPONoDb?.sub2} sub2Href={gameRecords.highPONoDb?.sub2Href} accent="purple" icon={Flame} top5={gameRecords.highPONoDb?.top5} />
                </RecordSection>

                <RecordSection title="Lowest Scores">
                  <RecordCard label="Lowest Score" value={gameRecords.lowSingle?.value} sub={gameRecords.lowSingle?.teams} team={gameRecords.lowSingle?.teams} sub2={gameRecords.lowSingle?.sub2} sub2Href={gameRecords.lowSingle?.sub2Href} accent="red" icon={TrendingDown} top5={gameRecords.lowSingle?.top5} />
                  <RecordCard label="Lowest Score Since 2021" value={gameRecords.lowSingleSince21?.value} sub={gameRecords.lowSingleSince21?.teams} team={gameRecords.lowSingleSince21?.teams} sub2={gameRecords.lowSingleSince21?.sub2} sub2Href={gameRecords.lowSingleSince21?.sub2Href} accent="orange" icon={TrendingDown} top5={gameRecords.lowSingleSince21?.top5} />
                  <RecordCard label="Lowest Score Since 2023" value={gameRecords.lowSingleSince23?.value} sub={gameRecords.lowSingleSince23?.teams} team={gameRecords.lowSingleSince23?.teams} sub2={gameRecords.lowSingleSince23?.sub2} sub2Href={gameRecords.lowSingleSince23?.sub2Href} accent="cyan" icon={TrendingDown} top5={gameRecords.lowSingleSince23?.top5} />
                </RecordSection>

                <RecordSection title="Notable Games">
                  <RecordCard label="Closest Game" value={gameRecords.closestNoDouble?.value} sub={gameRecords.closestNoDouble?.teams} sub2={gameRecords.closestNoDouble?.sub2} sub2Href={gameRecords.closestNoDouble?.sub2Href} accent="cyan" icon={Target} top5={gameRecords.closestNoDouble?.top5} />
                  <RecordCard label="Biggest Win (inc. doubles)" value={gameRecords.biggestAll?.value} sub={gameRecords.biggestAll?.teams} sub2={gameRecords.biggestAll?.sub2} sub2Href={gameRecords.biggestAll?.sub2Href} accent="gold" icon={Zap} top5={gameRecords.biggestAll?.top5} />
                  <RecordCard label="Biggest Win (single weeks only)" value={gameRecords.biggestNoDouble?.value} sub={gameRecords.biggestNoDouble?.teams} sub2={gameRecords.biggestNoDouble?.sub2} sub2Href={gameRecords.biggestNoDouble?.sub2Href} accent="orange" icon={Zap} top5={gameRecords.biggestNoDouble?.top5} />
                </RecordSection>
              </Sections>
            )}

            {/* PLAYERS */}
            {tab === 'players' && (
              <Sections>
                {[
                  ['mostRostered', 'Most Rostered', 'gold', Users],
                  ['mostStarted', 'Most Started', 'cyan', Star],
                  ['bestPts', 'Most Points', 'red', Flame],
                  ['avgPts', 'Best Average', 'emerald', Activity],
                ].map(([key, title, accent, Icon]) => (
                  <RecordSection key={key} title={title}>
                    {[['all', 'All-Time'], ['from21', 'Since 2021'], ['from23', 'Since 2023']].map(([era, eraLabel]) => {
                      const rec = playerRecords?.[era]?.[key]
                      return (
                        <RecordCard
                          key={era}
                          label={eraLabel}
                          value={rec?.value}
                          subItems={rec?.subItems}
                          sub2={(rec?.metric === 'rostered' || rec?.metric === 'started') ? undefined : rec?.sub2?.filter(Boolean).join(' · ')}
                          sub2Href={rec?.sub2Href}
                          team={rec?.teams}
                          player={rec?.players}
                          accent={accent}
                          icon={Icon}
                          top5={rec?.top5}
                        />
                      )
                    })}
                  </RecordSection>
                ))}
              </Sections>
            )}

            {/* SEASONS */}
            {tab === 'seasons' && (
              <Sections>
                <RecordSection title="Best Records">
                  <RecordCard label="Best RS Record" value={`${parseNumber(seasonRecords.byWin?.value?.RS_W)}–${parseNumber(seasonRecords.byWin?.value?.RS_L)}`} sub={seasonRecords.byWin?.teams} team={seasonRecords.byWin?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="gold" icon={Trophy} top5={seasonRecords.byWin?.top5?.map(r => ({ ...r, value: `${r.value}W` }))} />
                  <RecordCard label="Best Overall Record" value={`${parseNumber(seasonRecords.byTotW?.value?.W)}–${parseNumber(seasonRecords.byTotW?.value?.L)}`} sub={seasonRecords.byTotW?.teams} team={seasonRecords.byTotW?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="cyan" icon={Star} top5={seasonRecords.byTotW?.top5?.map(r => ({ ...r, value: `${r.value}W` }))} />
                </RecordSection>

                <RecordSection title="Worst Records">
                  <RecordCard label="Worst RS Record" value={`${parseNumber(seasonRecords.byLoss?.value?.RS_W)}–${parseNumber(seasonRecords.byLoss?.value?.RS_L)}`} sub={seasonRecords.byLoss?.teams} team={seasonRecords.byLoss?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="red" icon={TrendingDown} top5={seasonRecords.byLoss?.top5?.map(r => ({ ...r, value: `${r.value}L` }))} />
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
              </Sections>
            )}

            {/* RIVALRY */}
            {tab === 'rivalry' && (
              <Sections>
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
              </Sections>
            )}

            {/* GLORY */}
            {tab === 'glory' && (
              <Sections>
                <RecordSection title="Championship Leaders">
                  <RecordCard label="Most Titles" value={gloryRecords.mostTitles?.value} sub={gloryRecords.mostTitles?.teams} team={gloryRecords.mostTitles?.teams} accent="gold" icon={Trophy} top5={gloryRecords.mostTitles?.top5} />
                  <RecordCard label="Most Finals Apps" value={gloryRecords.mostFinals?.value} sub={gloryRecords.mostFinals?.teams} team={gloryRecords.mostFinals?.teams} accent="purple" icon={Star} top5={gloryRecords.mostFinals?.top5} />
                </RecordSection>
              </Sections>
            )}

            {/* SHAME */}
            {tab === 'shame' && (
              <Sections>
                <RecordSection title="Unicorn Leaders">
                  <RecordCard label="Most Unicorn Years 🦄" value={gloryRecords.mostUnicorn?.value} sub={gloryRecords.mostUnicorn?.teams} team={gloryRecords.mostUnicorn?.teams} accent="slate" icon={Skull} top5={gloryRecords.mostUnicorn?.top5} />
                </RecordSection>
              </Sections>
            )}
          </div>
        )}
      <SummaryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} allSeasons={allSeasons} />
    </PageShell>
  )
}