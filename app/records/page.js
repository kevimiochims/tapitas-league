'use client'
import Link from 'next/link'
import { PageShell, PageBar, BarTab, LoadingState, TeamLogo, CardShell, StatRow, BrandBackdrop, PositionBadge as UiPositionBadge } from '../components/ui'
import SummaryDrawer from '../components/SummaryDrawer'
import React, { Suspense, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import PlayerCutout from '../components/PlayerCutout'
import PlayerProfileModal from '../components/PlayerProfileModal'
import { Trophy, Flame, Swords, Activity, Users, Star, Zap, Shield, Target, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ChevronRight, Skull, RotateCw, Search, BookOpen, Crown } from 'lucide-react'

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

// Mínimo de jogos pela franquia para entrar no Best Average (Records, Teams e Players)
const MIN_APPS_FOR_AVG = 10

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

// Logos de dois times sobrepostos (confrontos)
function VersusLogos({ teams, size }) {
  return (
    <span className="flex -space-x-2.5">
      {teams.map((t, i) => <span key={i} className="rounded-full bg-white ring-2 ring-white"><TeamLogo name={t} size={size} /></span>)}
    </span>
  )
}

const slug = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const stripParens = v => String(v || '').replace(/\s*\(.*?\)\s*/g, '').trim()

// Número de um valor exibido ("60,00%", "25,001", "16.83", "W7") para calcular a diferença
function heroNumber(v) {
  let t = String(v ?? '').replace(/[^0-9.,-]/g, '')
  if (!t) return null
  if (/^-?\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, '')
  else t = t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

// Marcas que ninguém quer (derrotas, piores pontuações, unicórnio)
const isShameLabel = l => /loss|losing|lowest|fewest|worst|unicorn/i.test(String(l || ''))

// Cada aba descreve seus recordes com <RecordSection>/<RecordCard> (só os
// dados); quem desenha a página é o <RecordBook>.
function RecordSection() { return null }
function RecordCard() { return null }

// Épocas: recordes que existem em versões "All-Time / Since 2021 / Since 2023"
// aparecem uma vez só, na época escolhida
const ERAS = [['all', 'All-Time'], ['2021', 'Since 2021'], ['2023', 'Since 2023']]
const eraOf = label => (/since 2023/i.test(label) ? '2023' : /since 2021/i.test(label) ? '2021' : 'all')
const PURE_ERA = /^(all-time|since 20\d\d)$/i
const GENERIC_TITLE = /^(all-time|since 20\d\d|reg season( only)?|playoffs|full season.*)$/i

// Um recorde pronto para a página: nome, valor, detentor (time, jogador ou
// confronto), contexto e o top 5
function describeRecord(props, title, group, tab) {
  const { value, sub, sub2, subHref, sub2Href, subItems, top5, team, player } = props
  const subArr = Array.isArray(sub) ? sub.filter(Boolean) : sub ? [sub] : []
  const teamArr = (Array.isArray(team) ? team : team ? [team] : []).filter(Boolean).map(t => stripParens(t))
  const playerArr = Array.isArray(player) ? player : []
  const items = Array.isArray(subItems) && subItems.length > 0 ? subItems : null
  const rows = Array.isArray(top5) ? top5.slice(0, 5) : []
  const lead = rows[0] || null
  const leadLabel = lead ? (Array.isArray(lead.label) ? lead.label.join(', ') : String(lead.label || '')) : ''
  const pairSource = leadLabel.includes(' vs ') ? leadLabel : [...teamArr, ...subArr].find(x => String(x).includes(' vs '))
  const pair = pairSource ? String(pairSource).split(' vs ').slice(0, 2).map(stripParens) : null
  const leadPlayer = lead && (lead.playerId || lead.position) ? { playerId: lead.playerId, name: leadLabel, position: lead.position } : playerArr[0] || null
  const name = lead ? leadLabel : items?.[0]?.text || subArr[0] || teamArr[0] || ''
  const leadTeam = !pair && !leadPlayer ? stripParens(lead?.team || name) : null
  if (!name || value === undefined || value === null || value === '' || value === 'NaN' || value === '—') return null
  const tied = Math.max(teamArr.length, playerArr.length, items?.length || 0, subArr.length)
  // Quem leva o crédito pelo recorde (empate: todos os empatados)
  const holders = pair
    ? pair.map(t => ({ key: `t:${normalizeTeamName(t)}`, name: t, team: t }))
    : leadPlayer
      ? (tied > 1 && playerArr.length > 1 ? playerArr : [leadPlayer]).map(p => ({ key: `p:${p.playerId || p.name}`, name: p.name, playerId: p.playerId, team: stripParens(lead?.team || '') }))
      : (tied > 1 && teamArr.length > 1 ? teamArr : [leadTeam]).filter(Boolean).map(t => ({ key: `t:${normalizeTeamName(t)}`, name: t, team: t }))
  return {
    id: `${tab}-${slug(group)}-${slug(title)}`,
    title, group, value,
    name, pair, leadPlayer, leadTeam, tied, rows, lead, holders,
    meta: (lead && (lead.meta || lead.sub)) || items?.[0]?.meta || (typeof sub2 === 'string' ? sub2 : '') || '',
    href: lead?.href || items?.[0]?.href || subHref || sub2Href || (leadTeam ? teamHref(leadTeam) : undefined),
    profile: lead?.profile || null,
    infamous: tab === 'shame' || isShameLabel(title),
    // Nome completo fora do grupo (laterais): "Most Winning Seasons · Reg Season Only"
    fullTitle: GENERIC_TITLE.test(String(title).trim()) ? `${group} · ${title}` : title,
  }
}

// Foto redonda do jogador (Sleeper) ou iniciais
function PlayerFace({ playerId, name, size = 36 }) {
  const [failed, setFailed] = useState(false)
  const id = String(playerId || '').trim()
  return (
    <span className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F4F5F7] font-semibold text-[#16274F] ring-1 ring-[#E6E8EB]" style={{ width: size, height: size, fontSize: size * 0.32 }}>
      {id && !failed
        ? <img src={`https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(id)}.jpg`} alt={name || ''} className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
        : String(name || '?').split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()}
    </span>
  )
}

function HolderVisual({ rec, size = 34 }) {
  if (rec.pair) return <VersusLogos teams={rec.pair} size={Math.round(size * 0.72)} />
  if (rec.leadPlayer) return <PlayerFace playerId={rec.leadPlayer.playerId} name={rec.leadPlayer.name} size={size} />
  return <TeamLogo name={rec.leadTeam} size={size} />
}

// Uma linha do livro: recorde, detentor e valor. Toque abre o top 5.
function RecordRow({ rec, open, onToggle, onPlayer, plain = false }) {
  const stop = e => e.stopPropagation()
  const openLead = onPlayer && rec.profile ? () => onPlayer(rec.profile) : null
  const holderName = openLead
    ? <button type="button" onClick={e => { stop(e); openLead() }} className="truncate text-left font-semibold text-[#111] hover:text-[#D01F2D]">{rec.name}</button>
    : rec.href
      ? <a href={rec.href} onClick={stop} className="truncate font-semibold text-[#111] hover:text-[#D01F2D]">{rec.name}</a>
      : <span className="truncate font-semibold text-[#111]">{rec.name}</span>
  return (
    <div id={`rec-${rec.id}`} className="scroll-mt-16 border-t border-[#F1F2F4] first:border-t-0">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[#F7F8FA] lg:px-4 ${open ? 'bg-[#F7F8FA]' : ''}`}
      >
        <div className="flex w-10 flex-shrink-0 justify-center"><HolderVisual rec={rec} /></div>
        <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
          <div className={`min-w-0 text-[13px] font-medium sm:w-[38%] sm:flex-shrink-0 ${rec.infamous && !plain ? 'text-[#B3171F]' : 'text-[#3F4757]'}`}>
            <span className="line-clamp-2 sm:line-clamp-none">{rec.title}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
              {holderName}
              {rec.leadPlayer?.position && <PositionBadge position={rec.leadPlayer.position} />}
              {rec.tied > 1 && <span className="flex-shrink-0 rounded bg-[#F1F2F4] px-1.5 py-0.5 text-[10px] font-semibold text-[#4B5563]">{rec.tied}-way tie</span>}
            </div>
            {rec.meta && (openLead && rec.href
              ? <a href={rec.href} onClick={stop} className="block truncate text-[11px] text-[#6B7280] underline-offset-2 hover:text-[#D01F2D] hover:underline">{rec.meta}</a>
              : <div className="truncate text-[11px] text-[#6B7280]">{rec.meta}</div>)}
          </div>
        </div>
        {/* Largura fixa: as colunas de recorde e detentor ficam alinhadas entre as linhas */}
        <div className="flex w-[104px] flex-shrink-0 items-center justify-end gap-1.5">
          <span className="truncate text-[16px] font-bold tabular-nums text-[#111]">{rec.value}</span>
          <ChevronDown className={`h-4 w-4 flex-shrink-0 text-[#9CA3AF] transition-transform ${open ? 'rotate-180' : ''} ${rec.rows.length > 1 ? '' : 'invisible'}`} />
        </div>
      </div>

      {/* 2º ao 5º */}
      {open && rec.rows.length > 1 && (
        <div className="bg-[#F7F8FA] pb-2">
          {rec.rows.slice(1).map((item, i) => {
            const labelText = Array.isArray(item.label) ? item.label.join(', ') : String(item.label || '')
            const isPlayer = Boolean(item.playerId || item.position)
            const rowPair = !Array.isArray(item.label) && labelText.includes(' vs ') ? labelText.split(' vs ').slice(0, 2).map(stripParens) : null
            const rowSub = item.meta || item.sub
            const openRow = onPlayer && item.profile ? () => onPlayer(item.profile) : null
            const visual = rowPair ? <VersusLogos teams={rowPair} size={20} />
              : isPlayer ? <PlayerFace playerId={item.playerId} name={labelText} size={26} /> : <TeamLogo name={item.team || stripParens(labelText)} size={24} />
            const nameEl = openRow
              ? <button type="button" onClick={openRow} className="block max-w-full truncate text-left text-[12px] font-medium text-[#111] hover:text-[#D01F2D]">{labelText}</button>
              : item.href && !rowSub
                ? <a href={item.href} className="block truncate text-[12px] font-medium text-[#111] hover:text-[#D01F2D]">{labelText}</a>
                : <span className="block truncate text-[12px] font-medium text-[#111]">{labelText}</span>
            return (
              <div key={i} className="flex items-center gap-3 px-3 py-1.5 lg:px-4">
                <span className="w-10 flex-shrink-0 text-center text-[12px] font-semibold tabular-nums text-[#9CA3AF]">{i + 2}</span>
                <span className="flex-shrink-0">{visual}</span>
                <span className="min-w-0 flex-1">
                  {nameEl}
                  {rowSub && (item.href
                    ? <a href={item.href} className="block truncate text-[11px] text-[#6B7280] underline-offset-2 hover:text-[#D01F2D] hover:underline">{rowSub}</a>
                    : <span className="block truncate text-[11px] text-[#6B7280]">{rowSub}</span>)}
                </span>
                {openRow
                  ? <button type="button" onClick={openRow} className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-[#111] hover:text-[#D01F2D]">{item.value}</button>
                  : <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-[#111]">{item.value}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Agrupa os recordes de uma aba (usado na aba All para saber de onde veio)
function RecordTab() { return null }

// Lê a árvore <RecordTab>/<>/<RecordSection>/<RecordCard> e devolve as seções
// com a aba de origem
function readSections(children, tabKey = null, out = []) {
  React.Children.forEach(children, c => {
    if (!React.isValidElement(c)) return
    if (c.type === RecordTab) return readSections(c.props.children, c.props.tab, out)
    if (c.type === React.Fragment) return readSections(c.props.children, tabKey, out)
    if (c.type === RecordSection) {
      const cards = []
      React.Children.forEach(c.props.children, x => { if (React.isValidElement(x) && x.type === RecordCard) cards.push(x.props) })
      out.push({ tab: tabKey, title: c.props.title, group: c.props.group, cards })
    }
  })
  return out
}

const norm = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// A página de uma aba: hero com os recordes principais, placar de
// recordistas à esquerda, o livro (lista de recordes, com busca) no centro e
// as disputas mais apertadas + os recordes desta temporada à direita.
function RecordBook({ tab, children, era, onEra, onPlayer, currentSeason }) {
  const meta = TABS.find(t => t.key === tab) || TABS[0]
  const allMode = tab === 'all'
  // Shame junta as marcas ruins de todas as abas
  const multiTab = allMode || tab === 'shame'
  const [openIds, setOpenIds] = useState(() => new Set())
  const [holderFilter, setHolderFilter] = useState(null)
  const [query, setQuery] = useState('')
  const [mobileTab, setMobileTab] = useState('book')

  const sections = readSections(children)
  // Todos os recordes seguem a época escolhida (os dados já vêm recortados)
  const hasEras = true
  const eraLabel = ERAS.find(([k]) => k === era)?.[1] || 'All-Time'
  const tabLabel = key => TABS.find(t => t.key === key)?.label || ''

  // Grupos do livro: seções com o mesmo nome em sequência se juntam; as
  // seções por época (um recorde só, na época escolhida) viram um grupo
  const groups = []
  const seen = new Set()
  sections.forEach(sec => {
    const prefix = multiTab && sec.tab !== tab ? `${tabLabel(sec.tab)} · ` : ''
    const byEra = sec.cards.some(c => eraOf(c.label) !== 'all')
    let records
    let label
    if (byEra) {
      const card = sec.cards.find(c => eraOf(c.label) === era) || sec.cards.find(c => eraOf(c.label) === 'all')
      if (!card) return
      const title = PURE_ERA.test(String(card.label).trim()) ? sec.title : String(card.label).replace(/\s*since 20\d\d/i, '').trim()
      label = `${prefix}${sec.group || `${eraLabel} leaders`}`
      records = [describeRecord(card, title, label, sec.tab)].filter(Boolean)
    } else {
      // Recordes sem versão por época valem sempre para a história toda
      label = `${prefix}${sec.title}`
      records = sec.cards.map(c => describeRecord(c, c.label, label, sec.tab)).filter(Boolean)
    }
    if (tab === 'shame') records = records.filter(r => r.infamous)
    // Textos "all-time" dos dados viram a época escolhida ("since 2021")
    if (era !== 'all') {
      const t = v => (typeof v === 'string' ? v.replace(/\ball-time\b/gi, eraLabel.toLowerCase()) : v)
      records = records.map(r => ({ ...r, meta: t(r.meta), rows: r.rows.map(x => ({ ...x, sub: t(x.sub), meta: t(x.meta) })) }))
    }
    // Na aba All, o mesmo recorde em duas abas (Most Finals Appearances) conta uma vez
    records = records.filter(r => {
      const key = `${norm(r.title)}|${norm(r.name)}|${r.value}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    if (!records.length) return
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.records.push(...records)
    else groups.push({ label, records })
  })
  const all = groups.flatMap(g => g.records)

  // Placar de recordistas (empate no recorde: crédito para todos)
  const tally = new Map()
  all.forEach(rec => rec.holders.forEach(h => {
    if (!tally.has(h.key)) tally.set(h.key, { ...h, good: 0, bad: 0 })
    tally.get(h.key)[rec.infamous ? 'bad' : 'good'] += 1
  }))
  const shame = tab === 'shame'
  const holders = Array.from(tally.values())
    .map(h => ({ ...h, count: shame ? h.bad : h.good }))
    .filter(h => h.count > 0)
    .sort((a, b) => b.count - a.count || (shame ? b.good - a.good : a.bad - b.bad) || a.name.localeCompare(b.name))

  // Dono do livro (1º do placar)
  const top = holders[0] || null

  // Disputas mais apertadas: diferença relativa entre o 1º e o 2º
  const races = all
    .map(rec => {
      if (rec.rows.length < 2 || rec.pair || rec.tied > 1) return null
      const a = heroNumber(rec.rows[0].value), b = heroNumber(rec.rows[1].value)
      if (a === null || b === null) return null
      const gap = Math.abs(a - b)
      if (gap === 0) return null // empate não é disputa: aparece como "2-way tie" no recorde
      const decimals = (String(rec.rows[0].value).match(/[.,](\d+)\D*$/)?.[1] || '').length
      return { rec, rel: gap / Math.max(Math.abs(a), 1), gapText: gap.toFixed(Number.isInteger(a) && Number.isInteger(b) ? 0 : Math.min(decimals, 2)) }
    })
    .filter(Boolean)
    .sort((x, y) => x.rel - y.rel)
    // A mesma disputa (mesmo jogo/temporada) pode valer para mais de um
    // recorde (Total e RS): mostra uma vez só
    .filter((r, i, arr) => {
      const key = x => `${x.rec.name}|${x.rec.value}|${x.rec.meta}|${JSON.stringify(x.rec.rows[1].label)}|${x.rec.rows[1].value}`
      return arr.findIndex(o => key(o) === key(r)) === i
    })
    .slice(0, 6)

  // Recordes com marca desta temporada (listas de anos, como "2014, 2021,
  // 2026", não contam: o recorde não foi batido agora)
  const season = String(currentSeason || '')
  const fresh = season ? all.filter(rec => `${rec.name} ${rec.meta}`.includes(season) && !/\d{4},\s*\d{4}/.test(`${rec.name} ${rec.meta}`)) : []

  // Busca: nome do recorde, grupo, detentor ou contexto
  const q = norm(query.trim())
  const matches = rec => !q || norm(`${rec.title} ${rec.group} ${rec.name} ${rec.meta}`).includes(q)
  const filtered = holderFilter || q
    ? all.filter(r => matches(r) && (!holderFilter || r.holders.some(h => h.key === holderFilter)))
    : null

  const toggle = id => setOpenIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const focus = rec => {
    setHolderFilter(null)
    setQuery('')
    setMobileTab('book')
    setOpenIds(prev => new Set([...prev, rec.id]))
    setTimeout(() => document.getElementById(`rec-${rec.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }

  const holderVisual = (h, size) => (h.playerId ? <PlayerFace playerId={h.playerId} name={h.name} size={size} /> : <TeamLogo name={h.team} size={size} />)
  // Na Shame tudo é marca ruim: sem o vermelho no nome
  const row = rec => <RecordRow key={rec.id} rec={rec} open={openIds.has(rec.id)} onToggle={() => toggle(rec.id)} onPlayer={onPlayer} plain={shame} />

  const holdersCard = (
    <CardShell title={shame ? 'Most infamous' : allMode ? 'Most records overall' : 'Record holders'} subtitle={`${allMode ? 'Every tab' : meta.label}${hasEras ? ` · ${eraLabel}` : ''} · tap to filter`} sidebar className={mobileTab === 'holders' ? '' : 'hidden lg:block'}>
      <div className="py-1 lg:py-2">
        {holders.map((h, i) => (
          <button
            key={h.key}
            type="button"
            onClick={() => { setHolderFilter(f => (f === h.key ? null : h.key)); setMobileTab('book') }}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors lg:px-4 ${holderFilter === h.key ? 'bg-[#02275F]/[0.06]' : 'hover:bg-black/[0.03]'}`}
          >
            <span className="w-4 flex-shrink-0 text-[12px] font-semibold tabular-nums text-[#9CA3AF]">{i + 1}</span>
            {holderVisual(h, 28)}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-[#111]">{h.name}</span>
              <span className="block truncate text-[11px] text-[#6B7280]">
                {shame ? `${h.bad} mark${h.bad === 1 ? '' : 's'}` : `${h.good} record${h.good === 1 ? '' : 's'}`}
                {!shame && h.bad > 0 && <span className="text-[#B3171F]"> · {h.bad} infamous</span>}
              </span>
            </span>
            <span className="flex-shrink-0 text-[15px] font-bold tabular-nums text-[#111]">{h.count}</span>
          </button>
        ))}
        {!holders.length && <div className="px-3 py-6 text-center text-[12px] text-[#6B7280] lg:px-4">No records yet</div>}
      </div>
    </CardShell>
  )

  const sideCards = (
    <div className={mobileTab === 'races' ? '' : 'hidden lg:block'}>
      {races.length > 0 && (
        <CardShell title="Closest races" subtitle="Smallest gap between #1 and #2" sidebar>
          <div className="py-1 lg:py-2">
            {races.map(({ rec, gapText }) => {
              const chaser = rec.rows[1]
              const chaserName = Array.isArray(chaser.label) ? chaser.label.join(', ') : String(chaser.label || '')
              return (
                <StatRow
                  key={rec.id}
                  onClick={() => focus(rec)}
                  left={<div className="flex w-8 flex-shrink-0 justify-center"><HolderVisual rec={rec} size={28} /></div>}
                  eyebrow={rec.fullTitle}
                  title={`${rec.name} ${rec.value}`}
                  subtitle={`${chaserName} ${chaser.value}`}
                  value={`+${gapText}`}
                />
              )
            })}
          </div>
        </CardShell>
      )}
      {fresh.length > 0 && (
        <CardShell title={`Set in ${season}`} subtitle="Records with a mark from this season" sidebar>
          <div className="py-1 lg:py-2">
            {fresh.map(rec => (
              <StatRow
                key={rec.id}
                onClick={() => focus(rec)}
                left={<div className="flex w-8 flex-shrink-0 justify-center"><HolderVisual rec={rec} size={28} /></div>}
                eyebrow={rec.fullTitle}
                title={rec.name}
                subtitle={rec.meta}
                value={rec.value}
              />
            ))}
          </div>
        </CardShell>
      )}
      {!races.length && !fresh.length && (
        <CardShell title="Closest races" sidebar><div className="px-3 py-6 text-center text-[12px] text-[#6B7280] lg:px-4">Nothing close right now</div></CardShell>
      )}
    </div>
  )

  return (
    <>
      {/* Hero: o dono do livro da aba (coroa, número grande e os recordes
          dele) e o 2º e o 3º como medalhas de prata e bronze */}
      {top && (() => {
        const owned = all.filter(r => r.infamous === shame && r.holders.some(h => h.key === top.key))
        const medal = (h, place) => h && (
          <div key={h.key} className="flex min-w-0 items-center gap-2.5 rounded-xl bg-white/[0.08] px-3 py-2.5">
            <span className="relative flex-shrink-0">
              <span className="block rounded-full p-[3px]" style={{ background: place === 2 ? 'linear-gradient(135deg,#F1F3F6,#A9B0BC)' : 'linear-gradient(135deg,#F2C79B,#A8673A)' }}>
                <span className="block rounded-full bg-white p-0.5">{holderVisual(h, 38)}</span>
              </span>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black text-white shadow" style={{ background: place === 2 ? '#8E96A3' : '#A8673A' }}>{place}</span>
            </span>
            <span className="min-w-0">
              <span className="line-clamp-2 block text-[13px] font-semibold leading-tight">{h.name}</span>
              <span className="block text-[12px] text-white/70"><span className="font-bold tabular-nums text-white">{h.count}</span> {shame ? 'mark' : 'record'}{h.count === 1 ? '' : 's'}</span>
            </span>
          </div>
        )
        return (
          <div className="relative mb-2 overflow-hidden rounded-xl text-white" style={{ background: shame ? 'linear-gradient(120deg,#3A0B11 0%,#7A1420 55%,#B3171F 100%)' : 'linear-gradient(120deg,#02275F 0%,#0A3A86 55%,#1D5FD1 100%)' }}>
            {/* Brilho dourado atrás do campeão */}
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 h-[340px] w-[340px] rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, #E8C766 0%, transparent 65%)' }} />
            <div className="relative flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-6">
              {/* Campeão */}
              <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
                <div className="relative flex-shrink-0">
                  {top.playerId ? (
                    // Jogador no mesmo círculo com anel dourado do logo dos times
                    <span className="block rounded-full p-1 shadow-xl" style={{ background: 'linear-gradient(135deg,#F5DE8C,#C9A13E)' }}>
                      <span className="flex h-[84px] w-[84px] items-end justify-center overflow-hidden rounded-full bg-[#16274F] sm:h-[116px] sm:w-[116px]">
                        <PlayerCutout sleeperId={top.playerId} name={top.name} className="h-[80px] max-w-none sm:h-[110px]" />
                      </span>
                    </span>
                  ) : (
                    <span className="block rounded-full p-1 shadow-xl" style={{ background: 'linear-gradient(135deg,#F5DE8C,#C9A13E)' }}>
                      <span className="block rounded-full bg-white p-1 sm:hidden"><TeamLogo name={top.team} size={76} /></span>
                      <span className="hidden rounded-full bg-white p-1.5 sm:block"><TeamLogo name={top.team} size={104} /></span>
                    </span>
                  )}
                  <span className="absolute -top-3 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full shadow-lg" style={{ background: shame ? '#1F0508' : 'linear-gradient(135deg,#F5DE8C,#C9A13E)' }}>
                    {shame ? <Skull className="h-5 w-5 text-white" /> : <Crown className="h-5 w-5 text-[#5A3F00]" fill="#5A3F00" />}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-white/70">Record Book · {allMode ? 'All records' : meta.label}{hasEras ? ` · ${eraLabel}` : ''}</div>
                  <div className="mt-1 text-[12px] font-semibold text-[#F5DE8C]">{shame ? 'Most infamous of the league' : allMode ? 'Owns the most records' : `Owns the ${meta.label.toLowerCase()} book`}</div>
                  <h1 className="line-clamp-2 text-[22px] font-bold leading-tight tracking-tight sm:text-[32px]">{top.name}</h1>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-[40px] font-black leading-none tabular-nums text-[#F5DE8C] sm:text-[48px]">{top.count}</span>
                    <span className="text-[13px] text-white/80">of {all.filter(r => r.infamous === shame).length} {shame ? 'infamous marks' : 'records'}</span>
                  </div>
                  {/* Recordes do campeão numa linha só: até 3 etiquetas + "mais N" */}
                  {owned.length > 0 && (
                    <div className="mt-2.5 hidden min-w-0 flex-nowrap gap-1.5 sm:flex">
                      {owned.slice(0, 3).map(r => (
                        <button key={r.id} type="button" onClick={() => focus(r)} className="min-w-0 max-w-[220px] flex-shrink truncate rounded-full bg-white/[0.12] px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-white/20">{r.fullTitle}</button>
                      ))}
                      {owned.length > 3 && (
                        <button type="button" onClick={() => { setHolderFilter(top.key); setMobileTab('book') }} className="flex-shrink-0 whitespace-nowrap rounded-full bg-[#F5DE8C] px-2.5 py-1 text-[12px] font-semibold text-[#3A2A00] hover:bg-[#F8E6A8]">+{owned.length - 3} more</button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2º e 3º lugares */}
              {holders.length > 1 && (
                <div className="grid grid-cols-2 gap-2 lg:w-[260px] lg:flex-shrink-0 lg:grid-cols-1 lg:self-end">
                  {medal(holders[1], 2)}
                  {medal(holders[2], 3)}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Celular: o livro, o placar de recordistas e as disputas em abas */}
      <div className="mb-2 flex overflow-hidden rounded-xl bg-white lg:hidden">
        {[['book', 'Records'], ['holders', shame ? 'Infamous' : 'Holders'], ['races', 'Races']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMobileTab(key)}
            className={`flex-1 border-b-2 px-2 py-2.5 text-[13px] transition-colors ${mobileTab === key ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div data-sticky-cols className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)_260px] lg:items-start lg:gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px] xl:gap-5">
        <div className="min-w-0">{holdersCard}</div>

        <div className={`min-w-0 ${mobileTab === 'book' ? '' : 'hidden lg:block'}`}>
          <CardShell
            title={allMode ? 'All records' : `${meta.label} records`}
            subtitle={filtered ? `${filtered.length} of ${all.length} records` : `${all.length} records · tap a record for the top 5`}
            action={hasEras && (
              <div className="flex flex-shrink-0 rounded-full bg-[#F4F5F7] p-0.5">
                {ERAS.map(([k, l]) => (
                  <button key={k} type="button" onClick={() => onEra(k)} className={`h-7 whitespace-nowrap rounded-full px-2.5 text-[12px] transition-colors ${era === k ? 'bg-[#02275F] font-semibold text-white' : 'text-[#3F4757] hover:text-[#111]'}`}>
                    <span className="sm:hidden">{k === 'all' ? 'All' : `'${k.slice(2)}+`}</span>
                    <span className="hidden sm:inline">{l}</span>
                  </button>
                ))}
              </div>
            )}
          >
            {/* Busca */}
            <div className="px-3 pt-2.5 lg:px-4">
              <label className="flex h-9 items-center gap-2 rounded-lg bg-[#F4F5F7] px-3 text-[#6B7280] focus-within:ring-2 focus-within:ring-[#02275F]/20">
                <Search className="h-4 w-4 flex-shrink-0" />
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search records, teams or players"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[#111] outline-none placeholder:text-[#9CA3AF]"
                />
                {query && <button type="button" onClick={() => setQuery('')} className="text-[12px] font-medium text-[#D01F2D]">Clear</button>}
              </label>
            </div>
            {holderFilter && (
              <div className="mt-2 flex items-center justify-between gap-2 border-y border-[#F1F2F4] px-3 py-2 text-[12px] lg:px-4">
                <span className="flex min-w-0 items-center gap-1.5 text-[#3F4757]">{holderVisual(tally.get(holderFilter), 18)}<span className="truncate">Records held by {tally.get(holderFilter)?.name}</span></span>
                <button type="button" onClick={() => setHolderFilter(null)} className="flex-shrink-0 font-medium text-[#D01F2D] hover:underline">Show all</button>
              </div>
            )}
            {filtered
              ? (
                <div className="pt-1">
                  {filtered.map(row)}
                  {!filtered.length && <div className="px-3 py-8 text-center text-[13px] text-[#6B7280] lg:px-4">No records match</div>}
                </div>
              )
              : groups.map((g, gi) => (
                <div key={`${g.label}-${gi}`} className={gi === 0 ? 'pt-1' : 'mt-1 border-t-[6px] border-[#F4F5F7] pt-1'}>
                  <div className="px-3 pb-1 pt-2 text-[12px] font-semibold text-[#6B7280] lg:px-4">{g.label}</div>
                  {g.records.map(row)}
                </div>
              ))}
            <div className="h-2" />
          </CardShell>
        </div>

        <div className="min-w-0">{sideCards}</div>
      </div>
    </>
  )
}

// ── Época ────────────────────────────────────────────────────────────
// Com "Since 2021/2023", todos os recordes são recalculados só com as
// temporadas do período. As tabelas de totais (TEAM_ALL_TIME e
// HEAD_TO_HEAD) não separam por ano, então são remontadas a partir das
// temporadas (TEAM_HISTORY) e dos jogos (GAME_FACTS_ALL) do período.
const decimal = v => String(Math.round(v * 100) / 100).replace('.', ',')
const pctText = (w, gp) => `${(gp ? (w / gp) * 100 : 0).toFixed(2).replace('.', ',')}%`
const SUM_KEYS = ['GP', 'W', 'L', 'PF', 'PA', 'RS_GP', 'RS_W', 'RS_L', 'RS_PF', 'RS_PA', 'PO_GP', 'PO_W', 'PO_L', 'PO_PF', 'PO_PA', 'CON_GP', 'CON_W', 'CON_L', 'CON_PF', 'CON_PA']

function eraDataset(minSeason, base) {
  if (!minSeason) return base
  const inEra = r => (Number(String(r?.Season || '').trim()) || 0) >= minSeason
  const history = base.history.filter(inEra)
  const games = base.games.filter(inEra)
  const isTrue = v => String(v || '').trim().toUpperCase() === 'TRUE'

  // Totais por franquia (só as franquias atuais, como na TEAM_ALL_TIME)
  const allTime = base.allTime.map(row => {
    const team = String(row?.Team || '').trim()
    const rows = history.filter(h => normalizeTeamName(h?.Team) === normalizeTeamName(team))
    if (!rows.length) return null
    const out = { Team: team }
    SUM_KEYS.forEach(k => { out[k] = decimal(rows.reduce((sum, h) => sum + parseNumber(h?.[k]), 0)) })
    out['W%'] = pctText(parseNumber(out.W), parseNumber(out.GP))
    out['RS_W%'] = pctText(parseNumber(out.RS_W), parseNumber(out.RS_GP))
    out['PO_W%'] = pctText(parseNumber(out.PO_W), parseNumber(out.PO_GP))
    out['Playoff Apps'] = String(rows.filter(h => isTrue(h?.Made_Playoffs) || parseNumber(h?.PO_GP) > 0).length)
    out.Finals = String(rows.filter(h => isTrue(h?.Reached_Final)).length)
    out.Titles = String(rows.filter(h => isTrue(h?.Champion)).length)
    return out
  }).filter(Boolean)

  // Confrontos diretos a partir dos jogos do período
  const weekNum = w => parseFloat(String(w || '0')) || 0
  const byPair = new Map()
  games.forEach(g => {
    const a = String(g?.Team || '').trim()
    const b = String(g?.Opponent || '').trim()
    if (!a || !b) return
    const key = `${a}|${b}`
    if (!byPair.has(key)) byPair.set(key, [])
    byPair.get(key).push(g)
  })
  const done = new Set()
  const h2h = []
  byPair.forEach((list, key) => {
    const [a, b] = key.split('|')
    const pairKey = [normalizeTeamName(a), normalizeTeamName(b)].sort().join('|')
    if (done.has(pairKey)) return
    done.add(pairKey)
    const rows = [...list].sort((x, y) => (Number(x.Season) - Number(y.Season)) || (weekNum(x.Week) - weekNum(y.Week)))
    const res = g => String(g?.Result || '').trim().toUpperCase()
    const aWins = rows.filter(g => res(g) === 'W').length
    const bWins = rows.filter(g => res(g) === 'L').length
    const margin = rows.reduce((sum, g) => sum + parseNumber(g?.PF) - parseNumber(g?.PA), 0) / Math.max(rows.length, 1)
    const best = (team, want) => {
      let run = 0, start = null, bestRun = 0, bestFrom = null, bestTo = null
      rows.forEach(g => {
        if (res(g) === want) {
          if (!run) start = g
          run += 1
          if (run > bestRun) { bestRun = run; bestFrom = start; bestTo = g }
        } else run = 0
      })
      return bestRun ? `${team} W${bestRun} (${bestFrom.Season} Week ${bestFrom.Week} → ${bestTo.Season} Week ${bestTo.Week})` : ''
    }
    h2h.push({
      'Team A': a,
      'Team B': b,
      Games: String(rows.length),
      'A Wins': String(aWins),
      'B Wins': String(bWins),
      'Avg Margin': decimal(margin),
      'Best Streak Team A': best(a, 'W'),
      'Best Streak Team B': best(b, 'L'),
    })
  })
  return { allTime, history, games, h2h }
}

const TABS = [
  { key: 'all', blurb: 'Every mark in league history, and who owns the most.', label: 'All', Icon: BookOpen },
  { key: 'franchise', blurb: 'All-time franchise marks: wins, playoffs, scoring.', label: 'Franchise', Icon: Shield },
  { key: 'streaks', blurb: 'The hottest runs and the coldest slumps.', label: 'Streaks', Icon: Flame },
  { key: 'games', blurb: 'Single-week highs, lows and the wildest finishes.', label: 'Games', Icon: Activity },
  { key: 'players', blurb: 'The players who carried Tapitas rosters.', label: 'Players', Icon: Users },
  { key: 'seasons', blurb: 'The best and worst seasons on record.', label: 'Seasons', Icon: Star },
  { key: 'rivalry', blurb: 'Head-to-head history between franchises.', label: 'Rivalries', Icon: Swords },
  { key: 'glory', blurb: 'Rings and finals: who owns the league.', label: 'Glory', Icon: Trophy },
  { key: 'shame', blurb: 'The marks nobody wants to hold, from every corner of the book.', label: 'Shame', Icon: Skull },
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
    return TABS.some(x => x.key === t) ? t : 'all'
  })
  // Filtro de seção dentro da aba ("All" mostra todas); volta para All ao trocar de aba
  // Época dos recordes que têm versões All-Time / Since 2021 / Since 2023
  const [era, setEra] = useState('all')
  const pickTab = key => setTab(key)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [allSeasons, setAllSeasons] = useState([])
  // Player Profile aberto a partir de um recorde de jogador
  const [profile, setProfile] = useState(null)

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
  // Dados da época escolhida (All-Time = tudo; Since 2021/2023 = só o período)
  const D = useMemo(() => eraDataset(era === 'all' ? 0 : Number(era), { allTime, history, games, h2h }), [era, allTime, history, games, h2h])

  const franchiseRecords = useMemo(() => ((allTime, history, games, h2h) => {
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

    // Média de pontos por jogo (semanas simples, todas as fases), só franquias
    // atuais. Em três recortes (todas, desde 2021, desde 2023), porque o tamanho
    // do elenco mudou ao longo dos anos (2014–16 menores; 2021–22 maiores).
    const currentSet = new Set(allTime.map(r => normalizeTeamName(String(r?.Team || '').trim())))
    const mkAvg = minSeason => {
      const avgAcc = {}
      games.filter(g => !isDoubleWeek(g) && parseNumber(g?.PF) > 0 && Number(String(g?.Season || '').trim()) >= minSeason).forEach(g => {
        const team = String(g?.Team || '').trim()
        if (!currentSet.has(normalizeTeamName(team))) return
        if (!avgAcc[team]) avgAcc[team] = { sum: 0, n: 0 }
        avgAcc[team].sum += parseNumber(g.PF)
        avgAcc[team].n += 1
      })
      const avgRows = Object.entries(avgAcc).map(([team, a]) => ({ team, avg: a.sum / a.n, n: a.n })).sort((a, b) => b.avg - a.avg)
      return avgRows.length ? {
        value: avgRows[0].avg.toFixed(2),
        teams: avgRows.filter(r => Math.abs(r.avg - avgRows[0].avg) < 0.005).map(r => r.team),
        top5: avgRows.slice(0, 5).map(r => ({ label: r.team, value: r.avg.toFixed(2), sub: `${r.n} games` })),
      } : null
    }
    const bestAvg = mkAvg(0)
    const bestAvg21 = mkAvg(2021)
    const bestAvg23 = mkAvg(2023)

    // Pontos somados desde um ano (todas as fases, franquias atuais)
    const mkPF = minSeason => {
      const acc = {}
      const seen = new Set()
      games.filter(g => Number(String(g?.Season || '').trim()) >= minSeason).forEach(g => {
        const team = String(g?.Team || '').trim()
        if (!currentSet.has(normalizeTeamName(team))) return
        const key = `${team}|${String(g?.Season || '')}|${String(g?.Week || '')}`
        if (seen.has(key)) return
        seen.add(key)
        if (!acc[team]) acc[team] = { pts: 0, n: 0 }
        acc[team].pts += parseNumber(g?.PF)
        acc[team].n += 1
      })
      const rows = Object.entries(acc).map(([team, a]) => ({ team, ...a })).sort((a, b) => b.pts - a.pts)
      if (!rows.length) return null
      const fmt = v => Math.round(v).toLocaleString()
      return {
        value: fmt(rows[0].pts),
        teams: rows.filter(r => Math.round(r.pts) === Math.round(rows[0].pts)).map(r => r.team),
        top5: rows.slice(0, 5).map(r => ({ label: r.team, value: fmt(r.pts), sub: `${r.n} games` })),
      }
    }

    return {
      bestAvg,
      bestAvg21,
      bestAvg23,
      mostPF21: mkPF(2021),
      mostPF23: mkPF(2023),
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
  })(D.allTime, D.history, D.games, D.h2h), [D])

  // ── STREAKS ────────────────────────────────────────────────────────
  const streakRecords = useMemo(() => ((allTime, history, games, h2h) => {
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
  })(D.allTime, D.history, D.games, D.h2h), [D])

  // ── GAMES ──────────────────────────────────────────────────────────
  const gameRecords = useMemo(() => ((allTime, history, games, h2h) => {
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
    // Jogos de 200+ (semanas simples, franquias atuais), em três recortes
    // pelo mesmo motivo da média: o tamanho do elenco mudou ao longo dos anos.
    const mk200 = minSeason => {
      const over200 = {}
      const over200Seen = new Set()
      games.filter(g => !isDoubleWeek(g) && Number(String(g?.Season || '').trim()) >= minSeason).forEach(g => {
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
      return {
        value: topOver200,
        teams: over200Sorted.filter(e => e[1] === topOver200).map(e => e[0]),
        top5: over200Sorted.slice(0, 5).map(([team, cnt]) => ({ label: team, sub: `${cnt} game${cnt === 1 ? '' : 's'} with 200+ pts`, value: cnt }))
      }
    }
    const most200 = mk200(0)
    const most200_21 = mk200(2021)
    const most200_23 = mk200(2023)

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
      most200_21,
      most200_23,
    }
  })(D.allTime, D.history, D.games, D.h2h), [D])

  // ── PLAYERS ────────────────────────────────────────────────────────
  // Player records are derived from the same GAME_FACTS_ALL roster/points
  // logic used by the Teams Player Profile. A player-franchise pair is the
  // unit of record, so the same player can hold different records for
  // different franchises.
  const playerRecords = useMemo(() => ((allTime, history, games, h2h) => {
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
              rawName,
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

    const fmtTotal = v => Math.round(Number(v) || 0).toLocaleString('en-US')
    const makeMetric = (rows, metric, higher = true) => {
      // Best Average: só quem tem 10+ jogos pela franquia (mesma regra da
      // página Players e dos recordes de cada time)
      const eligible = rows.filter(r => Number(r?.[metric]) > 0 && (metric !== 'avgPts' || r.appearances >= MIN_APPS_FOR_AVG))
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
          : metric === 'totalPts' ? fmtTotal(topValue) : topValue,
        sub: winners.map(r => `${r.name}${r.position ? ` [${r.position}]` : ''}`),
        subItems: winners.map(r => ({
          text: r.name,
          position: r.position,
          playerId: r.playerId,
          meta: (metric === 'rostered' || metric === 'started') ? r.team : '',
          href: metric === 'bestPts' && r.bestGame
            ? matchupHref(r.bestGame, games)
            : (r.league ? undefined : teamHref(r.team)),
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
          // Abre o Player Profile (no Most Points, já no jogo do recorde)
          profile: { rawName: r.rawName, name: r.name, position: r.position, playerId: r.playerId, team: r.league ? '' : r.team, game: metric === 'bestPts' ? r.bestGame : null },
          label: r.name,
          position: r.position,
          playerId: r.playerId,
          value: metric === 'avgPts' || metric === 'bestPts' ? Number(r[metric]).toFixed(2) : metric === 'totalPts' ? fmtTotal(r[metric]) : Number(r[metric]),
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
                : metric === 'totalPts'
                  ? `${r.team} · ${r.appearances} games`
                  : r.team,
          team: r.team,
          href: metric === 'bestPts' && r.bestGame
            ? matchupHref(r.bestGame, games)
            : (r.league ? undefined : teamHref(r.team)),
        })),
      }
    }

    // Liga toda: o mesmo jogador somado em todas as franquias por onde passou
    const leagueRows = rows => {
      const map = new Map()
      rows.forEach(r => {
        if (!map.has(r.identity)) map.set(r.identity, { ...r, teamsSet: new Map(), rostered: 0, started: 0, totalPts: 0, avgCount: 0, appearances: 0, bestPts: 0, bestGame: null })
        const e = map.get(r.identity)
        e.rostered += r.rostered
        e.started += r.started
        e.totalPts += r.totalPts
        e.avgCount += r.avgCount
        e.appearances += r.appearances
        e.teamsSet.set(r.team, (e.teamsSet.get(r.team) || 0) + r.appearances)
        if (r.bestPts > e.bestPts) { e.bestPts = r.bestPts; e.bestGame = r.bestGame }
      })
      return Array.from(map.values()).map(e => {
        const n = e.teamsSet.size
        const main = Array.from(e.teamsSet.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
        return { ...e, league: true, team: n > 1 ? `${n} franchises` : main, avgPts: e.avgCount ? e.totalPts / e.avgCount : 0 }
      })
    }

    const buildEraRecords = minSeason => {
      const rows = buildEra(minSeason)
      const league = leagueRows(rows)
      return {
        mostRostered: makeMetric(rows, 'rostered'),
        mostStarted: makeMetric(rows, 'started'),
        bestPts: makeMetric(rows, 'bestPts'),
        avgPts: makeMetric(rows, 'avgPts'),
        leagueRostered: makeMetric(league, 'rostered'),
        leagueStarted: makeMetric(league, 'started'),
        leagueTotal: makeMetric(league, 'totalPts'),
        leagueAvg: makeMetric(league, 'avgPts'),
      }
    }

    return {
      all: buildEraRecords(null),
      from21: buildEraRecords(2021),
      from23: buildEraRecords(2023),
    }
  })(D.allTime, D.history, D.games, D.h2h), [D, playerCache])

  // ── SEASONS ────────────────────────────────────────────────────────
  const seasonRecords = useMemo(() => ((allTime, history, games, h2h) => {
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
  })(D.allTime, D.history, D.games, D.h2h), [D])

  // ── RIVALRY ────────────────────────────────────────────────────────
  const rivalryRecords = useMemo(() => ((allTime, history, games, h2h) => {
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
  })(D.allTime, D.history, D.games, D.h2h), [D])

  // ── GLORY ──────────────────────────────────────────────────────────
  const gloryRecords = useMemo(() => ((allTime, history, games, h2h) => {
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
  })(D.allTime, D.history, D.games, D.h2h), [D])

  // Temporada mais recente (para "Set in 2026" na lateral)
  const currentSeason = games.reduce((m, g) => Math.max(m, Number(g?.Season) || 0), 0) || ''
  const bookProps = { tab, era, onEra: setEra, onPlayer: setProfile, currentSeason }

  // Recordes de cada aba (só os dados; o <RecordBook> desenha). A aba All
  // junta todas para o placar geral de recordistas.
  const tabSections = {
    franchise: (
      <>
                <RecordSection title="Wins & Losses">
                  <RecordCard label="Most Wins" value={franchiseRecords.mostWins?.value} sub={franchiseRecords.mostWins?.teams} team={franchiseRecords.mostWins?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostWins?.top5} />
                  <RecordCard label="Most Losses" value={franchiseRecords.mostLosses?.value} sub={franchiseRecords.mostLosses?.teams} team={franchiseRecords.mostLosses?.teams} accent="red" icon={TrendingDown} top5={franchiseRecords.mostLosses?.top5} />
                  <RecordCard label="Best Win %" value={franchiseRecords.bestWinPct?.value} sub={franchiseRecords.bestWinPct?.teams} team={franchiseRecords.bestWinPct?.teams} accent="cyan" icon={Target} top5={franchiseRecords.bestWinPct?.top5} />
                </RecordSection>

                <RecordSection title="Playoff Dominance">
                  <RecordCard label="Most Playoff Appearances" value={franchiseRecords.mostPoApps?.value} sub={franchiseRecords.mostPoApps?.teams} team={franchiseRecords.mostPoApps?.teams} accent="purple" icon={Star} top5={franchiseRecords.mostPoApps?.top5} />
                  <RecordCard label="Most Finals Appearances" value={franchiseRecords.mostFinals?.value} sub={franchiseRecords.mostFinals?.teams} team={franchiseRecords.mostFinals?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostFinals?.top5} />
                  <RecordCard label="Most Playoff Wins" value={franchiseRecords.mostPoW?.value} sub={franchiseRecords.mostPoW?.teams} team={franchiseRecords.mostPoW?.teams} accent="cyan" icon={TrendingUp} top5={franchiseRecords.mostPoW?.top5} />
                </RecordSection>

                <RecordSection title="Winning Seasons">
                  <RecordCard label="10-Win Seasons (RS)" value={franchiseRecords.topTenRS?.value} sub={franchiseRecords.topTenRS?.teams} team={franchiseRecords.topTenRS?.teams} accent="emerald" icon={Star} top5={franchiseRecords.topTenRS?.top5} />
                  <RecordCard label="10-Win Seasons (Total)" value={franchiseRecords.topTenTot?.value} sub={franchiseRecords.topTenTot?.teams} team={franchiseRecords.topTenTot?.teams} accent="cyan" icon={Star} top5={franchiseRecords.topTenTot?.top5} />
                </RecordSection>

                <RecordSection title="Winning Seasons">
                  <RecordCard label="Winning Seasons (RS)" value={franchiseRecords.mostWinSeasonsRS?.value} sub={franchiseRecords.mostWinSeasonsRS?.teams} team={franchiseRecords.mostWinSeasonsRS?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostWinSeasonsRS?.top5} />
                  <RecordCard label="Winning Seasons (Total)" value={franchiseRecords.mostWinSeasonsTot?.value} sub={franchiseRecords.mostWinSeasonsTot?.teams} team={franchiseRecords.mostWinSeasonsTot?.teams} accent="emerald" icon={Trophy} top5={franchiseRecords.mostWinSeasonsTot?.top5} />
                </RecordSection>

                <RecordSection title="Most Points" group="Scoring & Rankings">
                  <RecordCard label="All-Time" value={franchiseRecords.mostPF?.value} sub={franchiseRecords.mostPF?.teams} team={franchiseRecords.mostPF?.teams} sub2="All stages" accent="emerald" icon={Activity} top5={franchiseRecords.mostPF?.top5} />
                  <RecordCard label="Since 2021" value={franchiseRecords.mostPF21?.value} sub={franchiseRecords.mostPF21?.teams} team={franchiseRecords.mostPF21?.teams} sub2="All stages · current franchises" accent="cyan" icon={Activity} top5={franchiseRecords.mostPF21?.top5} />
                  <RecordCard label="Since 2023" value={franchiseRecords.mostPF23?.value} sub={franchiseRecords.mostPF23?.teams} team={franchiseRecords.mostPF23?.teams} sub2="All stages · current franchises" accent="orange" icon={Activity} top5={franchiseRecords.mostPF23?.top5} />
                </RecordSection>

                <RecordSection title="Points per Game" group="Scoring & Rankings">
                  <RecordCard label="All-Time" value={franchiseRecords.bestAvg?.value} sub={franchiseRecords.bestAvg?.teams} team={franchiseRecords.bestAvg?.teams} sub2="Per game · single weeks · current franchises" accent="emerald" icon={TrendingUp} top5={franchiseRecords.bestAvg?.top5} />
                  <RecordCard label="Since 2021" value={franchiseRecords.bestAvg21?.value} sub={franchiseRecords.bestAvg21?.teams} team={franchiseRecords.bestAvg21?.teams} sub2="Per game · single weeks · current franchises" accent="cyan" icon={TrendingUp} top5={franchiseRecords.bestAvg21?.top5} />
                  <RecordCard label="Since 2023" value={franchiseRecords.bestAvg23?.value} sub={franchiseRecords.bestAvg23?.teams} team={franchiseRecords.bestAvg23?.teams} sub2="Per game · single weeks · current roster format" accent="orange" icon={TrendingUp} top5={franchiseRecords.bestAvg23?.top5} />
                </RecordSection>

                <RecordSection title="200+ Point Games" group="Scoring & Rankings">
                  <RecordCard label="All-Time" value={gameRecords.most200?.value} sub={gameRecords.most200?.teams} team={gameRecords.most200?.teams} sub2="Single weeks · current franchises" accent="emerald" icon={Zap} top5={gameRecords.most200?.top5} />
                  <RecordCard label="Since 2021" value={gameRecords.most200_21?.value} sub={gameRecords.most200_21?.teams} team={gameRecords.most200_21?.teams} sub2="Single weeks · current franchises" accent="cyan" icon={Zap} top5={gameRecords.most200_21?.top5} />
                  <RecordCard label="Since 2023" value={gameRecords.most200_23?.value} sub={gameRecords.most200_23?.teams} team={gameRecords.most200_23?.teams} sub2="Single weeks · current roster format" accent="orange" icon={Zap} top5={gameRecords.most200_23?.top5} />
                </RecordSection>

                <RecordSection title="Most Weekly High Scores (RS)" group="Scoring & Rankings">
                  <RecordCard label="All-Time" value={franchiseRecords.mostWeeklyHigh?.value} sub={franchiseRecords.mostWeeklyHigh?.teams} team={franchiseRecords.mostWeeklyHigh?.teams} accent="gold" icon={Flame} top5={franchiseRecords.mostWeeklyHigh?.top5} />
                  <RecordCard label="Since 2021" value={franchiseRecords.mostWeeklyHigh21?.value} sub={franchiseRecords.mostWeeklyHigh21?.teams} team={franchiseRecords.mostWeeklyHigh21?.teams} accent="orange" icon={Flame} top5={franchiseRecords.mostWeeklyHigh21?.top5} />
                  <RecordCard label="Since 2023" value={franchiseRecords.mostWeeklyHigh23?.value} sub={franchiseRecords.mostWeeklyHigh23?.teams} team={franchiseRecords.mostWeeklyHigh23?.teams} accent="cyan" icon={Flame} top5={franchiseRecords.mostWeeklyHigh23?.top5} />
                </RecordSection>

                <RecordSection title="Most Weeks at #1 in Power Rankings" group="Scoring & Rankings">
                  <RecordCard label="All-Time" value={franchiseRecords.pr1All?.value} sub={franchiseRecords.pr1All?.teams} team={franchiseRecords.pr1All?.teams} sub2="All seasons" accent="gold" icon={Zap} top5={franchiseRecords.pr1All?.top5} />
                  <RecordCard label="Since 2021" value={franchiseRecords.pr1from21?.value} sub={franchiseRecords.pr1from21?.teams} team={franchiseRecords.pr1from21?.teams} sub2="From 2021 on" accent="orange" icon={Zap} top5={franchiseRecords.pr1from21?.top5} />
                  <RecordCard label="Since 2023" value={franchiseRecords.pr1from23?.value} sub={franchiseRecords.pr1from23?.teams} team={franchiseRecords.pr1from23?.teams} sub2="New era (2023+)" accent="cyan" icon={Zap} top5={franchiseRecords.pr1from23?.top5} />
                </RecordSection>
              </>
    ),
    streaks: (
      <>
                <RecordSection title="Win Streaks">
                  <RecordCard label="Longest Win Streak (Total)" value={streakRecords.bestWTotal?.value} sub={streakRecords.bestWTotal?.teams} team={streakRecords.bestWTotal?.teams} accent="gold" icon={Flame} top5={streakRecords.bestWTotal?.top5} />
                  <RecordCard label="Longest Win Streak (RS)" value={streakRecords.bestWRS?.value} sub={streakRecords.bestWRS?.teams} team={streakRecords.bestWRS?.teams} accent="emerald" icon={Flame} top5={streakRecords.bestWRS?.top5} />
                </RecordSection>

                <RecordSection title="Losing Streaks">
                  <RecordCard label="Longest Losing Streak (Total)" value={streakRecords.bestLTotal?.value} sub={streakRecords.bestLTotal?.teams} team={streakRecords.bestLTotal?.teams} accent="red" icon={TrendingDown} top5={streakRecords.bestLTotal?.top5} />
                  <RecordCard label="Longest Losing Streak (RS)" value={streakRecords.bestLRS?.value} sub={streakRecords.bestLRS?.teams} team={streakRecords.bestLRS?.teams} accent="orange" icon={TrendingDown} top5={streakRecords.bestLRS?.top5} />
                </RecordSection>

                <RecordSection title="Single-Season Streaks">
                  <RecordCard label="Longest Win Streak in a Season" value={streakRecords.bestSeasonW?.value} sub={streakRecords.bestSeasonW?.teams} team={streakRecords.bestSeasonW?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="gold" icon={Flame} top5={streakRecords.bestSeasonW?.top5} />
                  <RecordCard label="Longest Losing Streak in a Season" value={streakRecords.bestSeasonL?.value} sub={streakRecords.bestSeasonL?.teams} team={streakRecords.bestSeasonL?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="red" icon={TrendingDown} top5={streakRecords.bestSeasonL?.top5} />
                </RecordSection>
              </>
    ),
    games: (
      <>
                <RecordSection title="Highest Scores">
                  <RecordCard label="Highest Score (Total)" value={gameRecords.highNoDouble?.value} sub={gameRecords.highNoDouble?.teams} team={gameRecords.highNoDouble?.teams} sub2={gameRecords.highNoDouble?.sub2} sub2Href={gameRecords.highNoDouble?.sub2Href} accent="gold" icon={Flame} top5={gameRecords.highNoDouble?.top5} />
                  <RecordCard label="Highest Score (RS)" value={gameRecords.highRegNoDb?.value} sub={gameRecords.highRegNoDb?.teams} team={gameRecords.highRegNoDb?.teams} sub2={gameRecords.highRegNoDb?.sub2} sub2Href={gameRecords.highRegNoDb?.sub2Href} accent="cyan" icon={Flame} top5={gameRecords.highRegNoDb?.top5} />
                  <RecordCard label="Highest Score (Playoffs)" value={gameRecords.highPONoDb?.value} sub={gameRecords.highPONoDb?.teams} team={gameRecords.highPONoDb?.teams} sub2={gameRecords.highPONoDb?.sub2} sub2Href={gameRecords.highPONoDb?.sub2Href} accent="purple" icon={Flame} top5={gameRecords.highPONoDb?.top5} />
                </RecordSection>

                <RecordSection title="Highest Scores incl. Double Weeks">
                  <RecordCard label="Highest Score incl. Double Weeks (Total)" value={gameRecords.highAll?.value} sub={gameRecords.highAll?.teams} team={gameRecords.highAll?.teams} sub2={gameRecords.highAll?.sub2} sub2Href={gameRecords.highAll?.sub2Href} accent="gold" icon={Flame} top5={gameRecords.highAll?.top5} />
                  <RecordCard label="Highest Score incl. Double Weeks (RS)" value={gameRecords.highReg?.value} sub={gameRecords.highReg?.teams} team={gameRecords.highReg?.teams} sub2={gameRecords.highReg?.sub2} sub2Href={gameRecords.highReg?.sub2Href} accent="cyan" icon={Flame} top5={gameRecords.highReg?.top5} />
                  <RecordCard label="Highest Score incl. Double Weeks (Playoffs)" value={gameRecords.highPO?.value} sub={gameRecords.highPO?.teams} team={gameRecords.highPO?.teams} sub2={gameRecords.highPO?.sub2} sub2Href={gameRecords.highPO?.sub2Href} accent="purple" icon={Flame} top5={gameRecords.highPO?.top5} />
                </RecordSection>

                <RecordSection title="Lowest Score" group="Lowest Scores">
                  <RecordCard label="Lowest Score" value={gameRecords.lowSingle?.value} sub={gameRecords.lowSingle?.teams} team={gameRecords.lowSingle?.teams} sub2={gameRecords.lowSingle?.sub2} sub2Href={gameRecords.lowSingle?.sub2Href} accent="red" icon={TrendingDown} top5={gameRecords.lowSingle?.top5} />
                  <RecordCard label="Lowest Score Since 2021" value={gameRecords.lowSingleSince21?.value} sub={gameRecords.lowSingleSince21?.teams} team={gameRecords.lowSingleSince21?.teams} sub2={gameRecords.lowSingleSince21?.sub2} sub2Href={gameRecords.lowSingleSince21?.sub2Href} accent="orange" icon={TrendingDown} top5={gameRecords.lowSingleSince21?.top5} />
                  <RecordCard label="Lowest Score Since 2023" value={gameRecords.lowSingleSince23?.value} sub={gameRecords.lowSingleSince23?.teams} team={gameRecords.lowSingleSince23?.teams} sub2={gameRecords.lowSingleSince23?.sub2} sub2Href={gameRecords.lowSingleSince23?.sub2Href} accent="cyan" icon={TrendingDown} top5={gameRecords.lowSingleSince23?.top5} />
                </RecordSection>

                <RecordSection title="Margins">
                  <RecordCard label="Closest Game" value={gameRecords.closestNoDouble?.value} sub={gameRecords.closestNoDouble?.teams} sub2={gameRecords.closestNoDouble?.sub2} sub2Href={gameRecords.closestNoDouble?.sub2Href} accent="cyan" icon={Target} top5={gameRecords.closestNoDouble?.top5} />
                  <RecordCard label="Biggest Win incl. Double Weeks" value={gameRecords.biggestAll?.value} sub={gameRecords.biggestAll?.teams} sub2={gameRecords.biggestAll?.sub2} sub2Href={gameRecords.biggestAll?.sub2Href} accent="gold" icon={Zap} top5={gameRecords.biggestAll?.top5} />
                  <RecordCard label="Biggest Win" value={gameRecords.biggestNoDouble?.value} sub={gameRecords.biggestNoDouble?.teams} sub2={gameRecords.biggestNoDouble?.sub2} sub2Href={gameRecords.biggestNoDouble?.sub2Href} accent="orange" icon={Zap} top5={gameRecords.biggestNoDouble?.top5} />
                </RecordSection>
              </>
    ),
    players: (
      <>
                {[
                  // Liga toda (somando todas as franquias por onde o jogador passou)
                  ['leagueRostered', 'Most Appearances (League)', 'gold', Users, 'League · all franchises combined'],
                  ['leagueStarted', 'Most Starts (League)', 'cyan', Star, 'League · all franchises combined'],
                  ['leagueTotal', 'Most Points (League)', 'emerald', Flame, 'League · all franchises combined'],
                  ['leagueAvg', 'Best Average (League, 10+ games)', 'emerald', Activity, 'League · all franchises combined'],
                  // Por uma franquia só
                  ['mostRostered', 'Most Appearances (One Franchise)', 'gold', Users, 'One franchise'],
                  ['mostStarted', 'Most Starts (One Franchise)', 'cyan', Star, 'One franchise'],
                  ['avgPts', 'Best Average (One Franchise, 10+ games)', 'emerald', Activity, 'One franchise'],
                  ['bestPts', 'Most Points in a Game', 'red', Flame, 'Single game'],
                ].map(([key, title, accent, Icon, group]) => (
                  <RecordSection key={key} title={title} group={group}>
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
                          onPlayer={setProfile}
                        />
                      )
                    })}
                  </RecordSection>
                ))}
              </>
    ),
    seasons: (
      <>
                <RecordSection title="Best Records">
                  <RecordCard label="Best Record (RS)" value={`${parseNumber(seasonRecords.byWin?.value?.RS_W)}–${parseNumber(seasonRecords.byWin?.value?.RS_L)}`} sub={seasonRecords.byWin?.teams} team={seasonRecords.byWin?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="gold" icon={Trophy} top5={seasonRecords.byWin?.top5?.map(r => ({ ...r, value: `${r.value}W` }))} />
                  <RecordCard label="Best Record (Total)" value={`${parseNumber(seasonRecords.byTotW?.value?.W)}–${parseNumber(seasonRecords.byTotW?.value?.L)}`} sub={seasonRecords.byTotW?.teams} team={seasonRecords.byTotW?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="cyan" icon={Star} top5={seasonRecords.byTotW?.top5?.map(r => ({ ...r, value: `${r.value}W` }))} />
                </RecordSection>

                <RecordSection title="Worst Records">
                  <RecordCard label="Worst Record (RS)" value={`${parseNumber(seasonRecords.byLoss?.value?.RS_W)}–${parseNumber(seasonRecords.byLoss?.value?.RS_L)}`} sub={seasonRecords.byLoss?.teams} team={seasonRecords.byLoss?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="red" icon={TrendingDown} top5={seasonRecords.byLoss?.top5?.map(r => ({ ...r, value: `${r.value}L` }))} />
                  <RecordCard label="Worst Record (Total)" value={`${parseNumber(seasonRecords.byTotL?.value?.W)}–${parseNumber(seasonRecords.byTotL?.value?.L)}`} sub={seasonRecords.byTotL?.teams} team={seasonRecords.byTotL?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="orange" icon={TrendingDown} top5={seasonRecords.byTotL?.top5?.map(r => ({ ...r, value: `${r.value}L` }))} />
                </RecordSection>

                <RecordSection title="Most Points in a Season (RS)" group="Season Points">
                  <RecordCard label="All-Time" value={Math.round(parseNumber(seasonRecords.byPF?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byPF?.teams} team={seasonRecords.byPF?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="gold" icon={Flame} top5={seasonRecords.byPF?.top5} />
                  <RecordCard label="Since 2021" value={Math.round(parseNumber(seasonRecords.byPF21?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byPF21?.teams} team={seasonRecords.byPF21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="cyan" icon={Flame} top5={seasonRecords.byPF21?.top5} />
                  <RecordCard label="Since 2023" value={Math.round(parseNumber(seasonRecords.byPF23?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byPF23?.teams} team={seasonRecords.byPF23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="emerald" icon={Flame} top5={seasonRecords.byPF23?.top5} />
                </RecordSection>

                <RecordSection title="Fewest Points in a Season (RS)" group="Season Points">
                  <RecordCard label="All-Time" value={Math.round(parseNumber(seasonRecords.byLowPF?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLowPF?.teams} team={seasonRecords.byLowPF?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="red" icon={TrendingDown} top5={seasonRecords.byLowPF?.top5} />
                  <RecordCard label="Since 2021" value={Math.round(parseNumber(seasonRecords.byLow21?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLow21?.teams} team={seasonRecords.byLow21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="orange" icon={TrendingDown} top5={seasonRecords.byLow21?.top5} />
                  <RecordCard label="Since 2023" value={Math.round(parseNumber(seasonRecords.byLow23?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLow23?.teams} team={seasonRecords.byLow23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="purple" icon={TrendingDown} top5={seasonRecords.byLow23?.top5} />
                </RecordSection>

                <RecordSection title="Best Points per Week in a Season (RS)" group="Season Points">
                  <RecordCard label="All-Time" value={seasonRecords.avgHigh?.avgVal?.toFixed(2)} sub={seasonRecords.avgHigh?.teams} team={seasonRecords.avgHigh?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="gold" icon={Activity} top5={seasonRecords.avgHigh?.top5} />
                  <RecordCard label="Since 2021" value={seasonRecords.avgHigh21?.avgVal?.toFixed(2)} sub={seasonRecords.avgHigh21?.teams} team={seasonRecords.avgHigh21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="cyan" icon={Activity} top5={seasonRecords.avgHigh21?.top5} />
                  <RecordCard label="Since 2023" value={seasonRecords.avgHigh23?.avgVal?.toFixed(2)} sub={seasonRecords.avgHigh23?.teams} team={seasonRecords.avgHigh23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="emerald" icon={Activity} top5={seasonRecords.avgHigh23?.top5} />
                </RecordSection>

                <RecordSection title="Best Points per Week in a Season (Total)" group="Season Points">
                  <RecordCard label="All-Time" value={seasonRecords.avgHighTot?.avgVal?.toFixed(2)} sub={seasonRecords.avgHighTot?.teams} team={seasonRecords.avgHighTot?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="gold" icon={Activity} top5={seasonRecords.avgHighTot?.top5} />
                  <RecordCard label="Since 2021" value={seasonRecords.avgHighTot21?.avgVal?.toFixed(2)} sub={seasonRecords.avgHighTot21?.teams} team={seasonRecords.avgHighTot21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="cyan" icon={Activity} top5={seasonRecords.avgHighTot21?.top5} />
                  <RecordCard label="Since 2023" value={seasonRecords.avgHighTot23?.avgVal?.toFixed(2)} sub={seasonRecords.avgHighTot23?.teams} team={seasonRecords.avgHighTot23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="emerald" icon={Activity} top5={seasonRecords.avgHighTot23?.top5} />
                </RecordSection>

                <RecordSection title="Fewest Points per Week in a Season (RS)" group="Season Points">
                  <RecordCard label="All-Time" value={seasonRecords.avgLow?.avgVal?.toFixed(2)} sub={seasonRecords.avgLow?.teams} team={seasonRecords.avgLow?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="red" icon={TrendingDown} top5={seasonRecords.avgLow?.top5} />
                  <RecordCard label="Since 2021" value={seasonRecords.avgLow21?.avgVal?.toFixed(2)} sub={seasonRecords.avgLow21?.teams} team={seasonRecords.avgLow21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="orange" icon={TrendingDown} top5={seasonRecords.avgLow21?.top5} />
                  <RecordCard label="Since 2023" value={seasonRecords.avgLow23?.avgVal?.toFixed(2)} sub={seasonRecords.avgLow23?.teams} team={seasonRecords.avgLow23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="purple" icon={TrendingDown} top5={seasonRecords.avgLow23?.top5} />
                </RecordSection>

                <RecordSection title="Fewest Points per Week in a Season (Total)" group="Season Points">
                  <RecordCard label="All-Time" value={seasonRecords.avgLowTot?.avgVal?.toFixed(2)} sub={seasonRecords.avgLowTot?.teams} team={seasonRecords.avgLowTot?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="red" icon={TrendingDown} top5={seasonRecords.avgLowTot?.top5} />
                  <RecordCard label="Since 2021" value={seasonRecords.avgLowTot21?.avgVal?.toFixed(2)} sub={seasonRecords.avgLowTot21?.teams} team={seasonRecords.avgLowTot21?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="orange" icon={TrendingDown} top5={seasonRecords.avgLowTot21?.top5} />
                  <RecordCard label="Since 2023" value={seasonRecords.avgLowTot23?.avgVal?.toFixed(2)} sub={seasonRecords.avgLowTot23?.teams} team={seasonRecords.avgLowTot23?.teams?.map(t => String(t).replace(/\s*\(.*?\)\s*/g, '').trim())} accent="purple" icon={TrendingDown} top5={seasonRecords.avgLowTot23?.top5} />
                </RecordSection>
              </>
    ),
    rivalry: (
      <>
                <RecordSection title="Most Played">
                  <RecordCard label="Most H2H Games" value={rivalryRecords.mostGames?.value} sub={rivalryRecords.mostGames?.teams} accent="gold" icon={Swords} top5={rivalryRecords.mostGames?.top5} subHref={rivalryRecords.mostGames?.subHref} wide />
                </RecordSection>

                <RecordSection title="H2H Streaks">
                  <RecordCard label="Longest H2H Win Streak" value={rivalryRecords.bestH2HStreak?.value} sub={rivalryRecords.bestH2HStreak?.teams} accent="gold" icon={Flame} top5={rivalryRecords.bestH2HStreak?.top5} subHref={rivalryRecords.bestH2HStreak?.subHref} wide />
                </RecordSection>

                <RecordSection title="Dominance & Balance">
                  <RecordCard label="Most Balanced Rivalry" value={rivalryRecords.mostBalanced?.value} sub={rivalryRecords.mostBalanced?.teams} accent="emerald" icon={Target} top5={rivalryRecords.mostBalanced?.top5} subHref={rivalryRecords.mostBalanced?.subHref} />
                  <RecordCard label="Largest Avg Margin (H2H)" value={rivalryRecords.highestMargin?.value} sub={rivalryRecords.highestMargin?.teams} accent="red" icon={TrendingUp} top5={rivalryRecords.highestMargin?.top5} subHref={rivalryRecords.highestMargin?.subHref} />
                  <RecordCard label="Smallest Avg Margin (H2H)" value={rivalryRecords.lowestMargin?.value} sub={rivalryRecords.lowestMargin?.teams} accent="cyan" icon={Target} top5={rivalryRecords.lowestMargin?.top5} subHref={rivalryRecords.lowestMargin?.subHref} />
                </RecordSection>
              </>
    ),
    glory: (
      <>
                <RecordSection title="Championship Leaders">
                  <RecordCard label="Most Titles" value={gloryRecords.mostTitles?.value} sub={gloryRecords.mostTitles?.teams} team={gloryRecords.mostTitles?.teams} accent="gold" icon={Trophy} top5={gloryRecords.mostTitles?.top5} />
                  <RecordCard label="Most Finals Appearances" value={gloryRecords.mostFinals?.value} sub={gloryRecords.mostFinals?.teams} team={gloryRecords.mostFinals?.teams} accent="purple" icon={Star} top5={gloryRecords.mostFinals?.top5} />
                </RecordSection>
              </>
    ),
    shame: (
      <>
                <RecordSection title="Unicorn Leaders">
                  <RecordCard label="Most Unicorn Seasons 🦄" value={gloryRecords.mostUnicorn?.value} sub={gloryRecords.mostUnicorn?.teams} team={gloryRecords.mostUnicorn?.teams} accent="slate" icon={Skull} top5={gloryRecords.mostUnicorn?.top5} />
                </RecordSection>
              </>
    ),
  }

  return (
    <PageShell headerProps={{ onSummaryOpen: () => setDrawerOpen(true) }}>
      <PageBar title="Record Book">
        {TABS.map(t => (
          <BarTab key={t.key} active={tab === t.key} onClick={() => pickTab(t.key)}>
            <t.Icon className="h-3.5 w-3.5" />
            {t.label}
          </BarTab>
        ))}
      </PageBar>

        {loading ? (
          <LoadingState />
        ) : (
          <RecordBook key={tab} {...bookProps}>
            {tab === 'all' || tab === 'shame'
              // All: todas as abas. Shame: o unicórnio primeiro e depois as marcas ruins das outras abas
              ? (tab === 'shame' ? ['shame', ...TABS.map(t => t.key).filter(k => k !== 'all' && k !== 'shame')] : TABS.map(t => t.key).filter(k => k !== 'all'))
                .map(k => <RecordTab key={k} tab={k}>{tabSections[k]}</RecordTab>)
              : <RecordTab tab={tab}>{tabSections[tab]}</RecordTab>}
          </RecordBook>
        )}
      <SummaryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} allSeasons={allSeasons} />
      {profile && (
        <PlayerProfileModal
          key={`${profile.rawName}|${profile.team}|${profile.game?.Season || ''}|${profile.game?.Week || ''}`}
          rawName={profile.rawName}
          displayName={profile.name}
          position={profile.position}
          playerId={profile.playerId}
          games={games}
          initialTeams={[profile.team]}
          // Most Points: abre no jogo do recorde (aba da semana com as
          // estatísticas da NFL e o jogo em destaque no game log)
          initialSeasons={profile.game ? [String(profile.game.Season || '').trim()] : undefined}
          matchup={profile.game ? {
            season: String(profile.game.Season || '').trim(),
            week: String(profile.game.Week || '').trim(),
            team: String(profile.game.Team || '').trim(),
            opponent: String(profile.game.Opponent || '').trim(),
          } : undefined}
          onClose={() => setProfile(null)}
        />
      )}
    </PageShell>
  )
}