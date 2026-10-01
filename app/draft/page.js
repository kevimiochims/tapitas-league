'use client'

import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { useEffect, useMemo, useState, useRef, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SummaryButton, PageShell, CardShell, StatRow, Tabs, FilterBar, FilterPill, SearchInput, Tag, PositionBadge, TeamLogo } from '../components/ui'
import SummaryDrawer from '../components/SummaryDrawer'
import { useDrawer } from '../context/DrawerContext'
import { DRAFT_PHOTOS } from '../config/draftPhotos'

const BASE_URL = '/api/sheet'

function normalizeString(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
}

function parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0
    const cleaned = String(value)
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^0-9.-]/g, '')
    const parsed = Number(cleaned)
    return Number.isNaN(parsed) ? 0 : parsed
}

function normalizePlayer(name) {
    const parts = String(name || '')
        .replace(/\./g, '')
        .trim()
        .split(' ')

    if (parts.length < 2) return ''

    return `${parts[0][0].toUpperCase()}_${parts[parts.length - 1].toUpperCase()}`
}

async function safeFetch(url) {
    try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return []
        const json = await res.json()
        return Array.isArray(json) ? json : []
    } catch {
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

            ;[
                fullName,
                `${firstName} ${lastName}`,
                row?.search_full_name,
            ].forEach((value) => {
                const key = normalizePlayerKey(value)
                if (!key || lookup.has(key)) return
                lookup.set(key, entry)
            })
    })

    return lookup
}

function getPlayerDataByFullName(name, playerLookup) {
    if (!playerLookup || !name) return null
    const key = normalizePlayerKey(name)
    if (!key) return null
    return playerLookup.get(key) || null
}

function getInitials(name) {
    return (
        String(name || '')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase() || '?'
    )
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

function getNFLTeamLogo(nameOrAbbr) {
    if (!nameOrAbbr || nameOrAbbr === '--') return null
    const raw = String(nameOrAbbr).toLowerCase().trim()
    const mapped = NFL_TEAM_NAME_MAP[raw]
    if (mapped) return `https://a.espncdn.com/i/teamlogos/nfl/500/${mapped}.png`
    const abbr = raw === 'was' ? 'wsh' : raw
    return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`
}

function PlayerAvatar({ player, pick, playerLookup, size = 'md', className = '' }) {
    const [photoFailed, setPhotoFailed] = useState(false)

    const rawName = player || pick?.player || ''
    const data =
        getPlayerDataByFullName(rawName, playerLookup) ||
        getPlayerDataByFullName(String(pick?.player || '').trim(), playerLookup)

    const playerId = data?.playerId
    const shortName = data?.shortName || rawName
    const isDefense = String(pick?.position || '').trim().toUpperCase() === 'DEF'

    const photoSrc =
        !photoFailed
            ? (
                isDefense
                    ? getNFLTeamLogo(rawName)
                    : (playerId
                        ? `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`
                        : null)
            )
            : null

    useEffect(() => {
        setPhotoFailed(false)
    }, [rawName, playerId, pick?.position])

    const sizeClass =
        size === 'sm'
            ? 'h-8 w-8'
            : size === 'lg'
                ? 'h-14 w-14'
                : 'h-10 w-10'

    return (
        <div className={`${sizeClass} flex-shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-[#E6E8EB] ${className}`}>
            {photoSrc ? (
                <img
                    src={photoSrc}
                    alt={shortName}
                    className="h-full w-full object-cover"
                    onError={() => setPhotoFailed(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#16274F] text-[11px] font-semibold text-white">
                    {String(shortName)
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase() || '?'}
                </div>
            )}
        </div>
    )
}

function TeamAvatar({ team, size = 'md' }) {
    const px = { xs: 20, sm: 32, md: 40, lg: 56 }[size] || 40
    return <TeamLogo name={team} size={px} />
}

export default function DraftPage() {
    const [draftData, setDraftData] = useState([])
    const [notesData, setNotesData] = useState([])
    const [gamesData, setGamesData] = useState([])
    const [playerCacheData, setPlayerCacheData] = useState([])
    const [loading, setLoading] = useState(true)
    const [season, setSeason] = useState('')
    const [photoIdx, setPhotoIdx] = useState(0)
    const [activeTab, setActiveTab] = useState('board')
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [allSeasons, setAllSeasons] = useState([])
    const [teamFilter, setTeamFilter] = useState('All Teams')
    const [positionFilter, setPositionFilter] = useState('All Positions')
    const [playerNameFilter, setPlayerNameFilter] = useState('')
    const { setLeftSlot } = useDrawer()
    const photos = DRAFT_PHOTOS?.[season] || []
    const photoTouchStartX = useRef(null)
    const boardScrollRef = useRef(null)
    const boardTrackRef = useRef(null)
    const [boardThumb, setBoardThumb] = useState({ left: 0, width: 100 })

    const updateBoardThumb = () => {
        const el = boardScrollRef.current
        if (!el) return
        const { scrollLeft, scrollWidth, clientWidth } = el
        if (scrollWidth <= clientWidth) {
            setBoardThumb({ left: 0, width: 100 })
            return
        }
        const width = Math.max((clientWidth / scrollWidth) * 100, 6)
        const maxScrollLeft = scrollWidth - clientWidth
        const left = (scrollLeft / maxScrollLeft) * (100 - width)
        setBoardThumb({ left, width })
    }

    const handleBoardThumbPointerDown = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const el = boardScrollRef.current
        if (!el) return
        const startX = e.clientX
        const startScrollLeft = el.scrollLeft

        const onMove = (ev) => {
            const trackEl = boardTrackRef.current
            if (!trackEl) return
            const deltaX = ev.clientX - startX
            const deltaScroll = (deltaX / trackEl.clientWidth) * el.scrollWidth
            const maxScrollLeft = el.scrollWidth - el.clientWidth
            el.scrollLeft = Math.min(Math.max(startScrollLeft + deltaScroll, 0), maxScrollLeft)
            updateBoardThumb()
        }
        const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    const handleBoardTrackClick = (e) => {
        if (e.target !== boardTrackRef.current) return
        const el = boardScrollRef.current
        const trackEl = boardTrackRef.current
        if (!el || !trackEl) return
        const rect = trackEl.getBoundingClientRect()
        const ratio = (e.clientX - rect.left) / rect.width
        const maxScrollLeft = el.scrollWidth - el.clientWidth
        el.scrollLeft = Math.min(Math.max(ratio * el.scrollWidth - el.clientWidth / 2, 0), maxScrollLeft)
        updateBoardThumb()
    }

    const [photoTimerKey, setPhotoTimerKey] = useState(0)

    const prevPhoto = () => {
        setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)
        setPhotoTimerKey((k) => k + 1)
    }

    const nextPhoto = () => {
        setPhotoIdx((i) => (i + 1) % photos.length)
        setPhotoTimerKey((k) => k + 1)
    }

    const handlePhotoTouchStart = (e) => {
        photoTouchStartX.current = e.touches[0].clientX
    }

    const handlePhotoTouchEnd = (e) => {
        if (!photoTouchStartX.current) return

        const touchEndX = e.changedTouches[0].clientX
        const diff = photoTouchStartX.current - touchEndX
        const threshold = 75

        if (diff > threshold) nextPhoto()
        if (diff < -threshold) prevPhoto()

        photoTouchStartX.current = null
    }

    useEffect(() => {
        setLeftSlot(
            <SummaryButton onClick={() => setDrawerOpen(true)} compact />
        )
        return () => setLeftSlot(null)
    }, [setLeftSlot])

    useEffect(() => {
        if (photos.length <= 1) return
        const timeout = setTimeout(() => {
            setPhotoIdx((prev) => (prev + 1) % photos.length)
        }, 10000)
        return () => clearTimeout(timeout)
    }, [photoIdx, photos.length, photoTimerKey])

    useEffect(() => {
        setPhotoIdx(0)
    }, [season])

    useEffect(() => {
        async function load() {
            const [draft, notes, games, playerCache] = await Promise.all([
                safeFetch(`${BASE_URL}/DRAFT_BOARD`),
                safeFetch(`${BASE_URL}/DRAFT_NOTES`),
                safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
                safeFetch(`${BASE_URL}/_PLAYER_CACHE`),
            ])

            setDraftData(draft)
            setNotesData(notes)
            setGamesData(games)
            setPlayerCacheData(playerCache)

            const allSeasons = [...new Set(draft.map((r) => String(r?.Season || '').trim()).filter(Boolean))]
                .sort((a, b) => Number(b) - Number(a))

            if (allSeasons.length > 0) setSeason(allSeasons[0])

            setLoading(false)
        }

        load()
    }, [])

    const playerLookup = useMemo(() => buildPlayerLookup(playerCacheData), [playerCacheData])

    const seasons = useMemo(() => {
        return [...new Set(draftData.map((r) => String(r?.Season || '').trim()).filter(Boolean))]
            .sort((a, b) => Number(b) - Number(a))
    }, [draftData])

    useEffect(() => {
        const numericSeasons = seasons
            .filter((s) => s !== 'All-Time')
            .map((s) => Number(s))
            .filter((s) => !Number.isNaN(s))
            .sort((a, b) => a - b)

        setAllSeasons(numericSeasons)
    }, [seasons])

    const seasonPicks = useMemo(() => {
        return draftData
            .filter((r) => String(r?.Season || '').trim() === season)
            .map((r) => ({
                season: String(r?.Season || '').trim(),
                round: parseNumber(r?.Round),
                pick: parseNumber(r?.Pick),
                team: String(r?.Team || '').trim(),
                player: String(r?.Player || '').trim(),
                position: String(r?.Position || '').trim().toUpperCase(),
                tagOk: ['true', 'yes', 'y', '1', 'sim', 'ok'].includes(
                    String(r?.Tag_Ok || '').trim().toLowerCase()
                ),
            }))
            .sort((a, b) => a.pick - b.pick)
    }, [draftData, season])

    const teams = useMemo(() => {
        return [...new Set(seasonPicks.map((p) => p.team))].filter(Boolean)
    }, [seasonPicks])

    const positions = useMemo(() => {
        return [...new Set(seasonPicks.map((p) => p.position))].filter(Boolean).sort()
    }, [seasonPicks])

    const rounds = useMemo(() => {
        return [...new Set(seasonPicks.map((p) => p.round))].filter((r) => r > 0).sort((a, b) => a - b)
    }, [seasonPicks])

    const boardMatrix = useMemo(() => {
        return rounds.map((round) => {
            return teams.map((team) => {
                return seasonPicks.filter((p) => p.round === round && p.team === team)
            })
        })
    }, [rounds, teams, seasonPicks])

    useEffect(() => {
        const el = boardScrollRef.current
        updateBoardThumb()
        if (!el || typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(() => {
            updateBoardThumb()
        })
        observer.observe(el)
        window.addEventListener('resize', updateBoardThumb)
        return () => {
            observer.disconnect()
            window.removeEventListener('resize', updateBoardThumb)
        }
    }, [teams, rounds, season, activeTab, boardMatrix])

    const filteredSeasonPicks = useMemo(() => {
        const query = playerNameFilter.trim().toLowerCase()
        return seasonPicks.filter((pick) => {
            const byTeam = teamFilter === 'All Teams' || pick.team === teamFilter
            const byPos = positionFilter === 'All Positions' || pick.position === positionFilter
            const byName = !query || String(pick.player || '').toLowerCase().includes(query)
            return byTeam && byPos && byName
        })
    }, [seasonPicks, teamFilter, positionFilter, playerNameFilter])

    useEffect(() => {
        setTeamFilter('All Teams')
        setPositionFilter('All Positions')
        setPlayerNameFilter('')
    }, [season])

    const highlights = useMemo(() => {
        const seasonGames = gamesData.filter((g) => String(g?.Season || '').trim() === season)

        if (seasonGames.length === 0 || seasonPicks.length === 0) {
            return null
        }

        const draftedPlayers = {}
        seasonPicks.forEach((pick) => {
            draftedPlayers[normalizePlayer(pick.player)] = pick.team
        })

        const draftTotals = {}
        const playerTotals = {}

        seasonPicks.forEach((pick) => {
            if (!draftTotals[pick.team]) draftTotals[pick.team] = 0
        })

        seasonGames.forEach((game) => {
            for (let i = 1; i <= 13; i++) {
                const player = game[`S${i}_Name`]
                const pts = parseNumber(game[`S${i}_Pts`])
                const draftedTeam = draftedPlayers[normalizePlayer(player)]

                if (draftedTeam) {
                    draftTotals[draftedTeam] += pts
                    const key = normalizePlayer(player)
                    if (!playerTotals[key]) playerTotals[key] = 0
                    playerTotals[key] += pts
                }
            }

            for (let i = 1; i <= 8; i++) {
                const player = game[`B${i}_Name`]
                const pts = parseNumber(game[`B${i}_Pts`])
                const draftedTeam = draftedPlayers[normalizePlayer(player)]

                if (draftedTeam) {
                    draftTotals[draftedTeam] += pts
                    const key = normalizePlayer(player)
                    if (!playerTotals[key]) playerTotals[key] = 0
                    playerTotals[key] += pts
                }
            }
        })

        const draftedPlayersStats = seasonPicks.map((pick) => {
            const key = normalizePlayer(pick.player)
            return {
                ...pick,
                fantasyPoints: playerTotals[key] || 0,
            }
        })

        const steal = [...draftedPlayersStats.filter((p) => p.pick >= 31)]
            .sort((a, b) => b.fantasyPoints - a.fantasyPoints)[0]

        const bust = [...draftedPlayersStats.filter((p) => p.pick <= 30)]
            .sort((a, b) => a.fantasyPoints - b.fantasyPoints)[0]

        const sortedDraftTotals = Object.entries(draftTotals).sort((a, b) => b[1] - a[1])
        const bestTeam = sortedDraftTotals[0]?.[0]
        const worstTeam = sortedDraftTotals[sortedDraftTotals.length - 1]?.[0]

        return {
            bestTeam,
            worstTeam,
            bestDrafter: bestTeam ? { team: bestTeam, points: draftTotals[bestTeam] } : null,
            worstDrafter: worstTeam ? { team: worstTeam, points: draftTotals[worstTeam] } : null,
            steal,
            bust,
        }
    }, [gamesData, season, seasonPicks])

    const notes = useMemo(() => {
        return notesData.filter((n) => String(n?.Season || '').trim() === season)
    }, [notesData, season])

    const highlightRows = highlights ? [
        { label: 'Best drafter', left: <TeamAvatar team={highlights.bestTeam} size="sm" />, title: highlights.bestTeam, subtitle: 'Most points from drafted players', value: highlights.bestDrafter ? `${highlights.bestDrafter.points.toFixed(1)} pts` : '—', valueClass: 'text-[#1E8E3E]' },
        { label: 'Worst drafter', left: <TeamAvatar team={highlights.worstTeam} size="sm" />, title: highlights.worstTeam, subtitle: 'Fewest points from drafted players', value: highlights.worstDrafter ? `${highlights.worstDrafter.points.toFixed(1)} pts` : '—', valueClass: 'text-[#D01F2D]' },
        highlights.steal && { label: 'Steal of the draft', left: <PlayerAvatar player={highlights.steal.player} pick={highlights.steal} playerLookup={playerLookup} size="sm" />, title: highlights.steal.player, subtitle: `Pick #${highlights.steal.pick} · ${highlights.steal.team}`, value: `${highlights.steal.fantasyPoints.toFixed(1)} pts`, valueClass: 'text-[#B8860B]' },
        highlights.bust && { label: 'Biggest bust', left: <PlayerAvatar player={highlights.bust.player} pick={highlights.bust} playerLookup={playerLookup} size="sm" />, title: highlights.bust.player, subtitle: `Pick #${highlights.bust.pick} · ${highlights.bust.team}`, value: `${highlights.bust.fantasyPoints.toFixed(1)} pts` },
    ].filter(Boolean) : []

    return (
        <PageShell headerProps={{ onSummaryOpen: () => setDrawerOpen(true) }} loading={loading}>
            {/* Ano do draft (mesmo padrão do seletor de temporada/semana da Matchups) */}
            <div className="mb-2 flex items-stretch overflow-hidden rounded-xl bg-white">
                <span className="flex flex-shrink-0 items-center border-r border-[#EEF0F2] px-3 text-[14px] font-bold text-[#111]">Draft</span>
                <div className="scroll-hide flex min-w-0 flex-1 overflow-x-auto">
                    {seasons.map((s) => (
                        <button
                            key={s}
                            onClick={() => setSeason(s)}
                            className={`flex-shrink-0 border-b-2 px-3 py-3 text-[13px] tabular-nums transition-colors ${season === s ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280] hover:text-[#111]'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Destaques do draft: 4 cards em linha, largura total */}
            {highlightRows.length > 0 && (
                <div className="mb-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {highlightRows.map(row => (
                        <div key={row.label} className="min-w-0 rounded-xl bg-white p-3 lg:p-4">
                            <div className="text-[11px] font-medium text-[#6B7280]">{row.label}</div>
                            <div className="mt-2 flex min-w-0 items-center gap-2.5">
                                {row.left}
                                <div className="min-w-0">
                                    <div className="truncate text-[13px] font-semibold leading-tight text-[#111]">{row.title}</div>
                                    <div className="truncate text-[11px] text-[#6B7280]">{row.subtitle}</div>
                                </div>
                            </div>
                            <div className={`mt-2 text-[20px] font-bold leading-none tabular-nums ${row.valueClass || 'text-[#111]'}`}>{row.value}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="min-w-0">
                    <Tabs
                        tabs={[['board', 'Draft Board'], ['scores', 'All Picks'], ['notes', 'Recap'], ...(photos.length > 0 ? [['photos', 'Draft Day']] : [])]}
                        value={activeTab}
                        onChange={setActiveTab}
                    />

                    {activeTab === 'board' && (
                        <div>
                        <CardShell
                            title={`Draft Board · ${season}`}
                            subtitle={`${rounds.length} rounds · ${teams.length} teams`}
                            action={
                                <span className="flex flex-shrink-0 items-center gap-1.5 text-[11px] text-[#6B7280]">
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#F5C518] text-[9px] font-bold text-[#111]">✓</span>
                                    Tag eligible 2026
                                </span>
                            }
                        >
                            {/* Barra de rolagem horizontal */}
                            <div className="px-3 pt-3 lg:px-4">
                                <div ref={boardTrackRef} onMouseDown={handleBoardTrackClick} className="relative h-1.5 w-full cursor-pointer rounded-full bg-[#EEF0F2]">
                                    <div
                                        onMouseDown={handleBoardThumbPointerDown}
                                        className="absolute top-0 h-1.5 cursor-grab rounded-full bg-[#02275F] active:cursor-grabbing"
                                        style={{ left: `${boardThumb.left}%`, width: `${boardThumb.width}%` }}
                                    />
                                </div>
                            </div>

                            <div ref={boardScrollRef} onScroll={updateBoardThumb} className="scroll-hide overflow-x-scroll px-2 pb-3 pt-2 lg:px-3">
                                <div
                                    className="grid gap-1.5"
                                    style={{ gridTemplateColumns: `repeat(${teams.length}, 156px)`, minWidth: `${teams.length * 156}px` }}
                                >
                                    {teams.map((team) => (
                                        <div key={team} className="flex items-center gap-1.5 px-1 py-1.5">
                                            <TeamAvatar team={team} size="xs" />
                                            <span className="truncate text-[12px] font-semibold text-[#111]">{team}</span>
                                        </div>
                                    ))}

                                    {boardMatrix.map((row, rIdx) => {
                                        const round = rounds[rIdx]
                                        return (
                                            <Fragment key={rIdx}>
                                                {row.map((picks, cIdx) => (
                                                    <div key={cIdx}>
                                                        {picks.length > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                {picks.map((pick) => {
                                                                    const pickInRound = teams.length ? ((pick.pick - 1) % teams.length) + 1 : pick.pick
                                                                    return (
                                                                        <div key={pick.pick} className={`relative rounded-lg p-2 ${pick.tagOk ? 'bg-[#FFF6D6]' : 'bg-[#F4F5F7]'}`}>
                                                                            {pick.tagOk && (
                                                                                <span title="Elegível para tag em 2026" className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F5C518] text-[9px] font-bold text-[#111]">✓</span>
                                                                            )}
                                                                            <div className="mb-1.5 flex items-center gap-1.5 pr-5 text-[11px] tabular-nums text-[#6B7280]">
                                                                                <span>{round}.{String(pickInRound).padStart(2, '0')}</span>
                                                                                <span className="text-[#9CA3AF]">#{pick.pick}</span>
                                                                            </div>
                                                                            <div className="flex min-w-0 items-center gap-2">
                                                                                <PlayerAvatar pick={pick} player={pick.player} playerLookup={playerLookup} size="sm" />
                                                                                <div className="min-w-0">
                                                                                    <div className="truncate text-[12px] font-semibold leading-tight text-[#111]">{pick.player}</div>
                                                                                    <div className="mt-0.5"><PositionBadge position={pick.position} /></div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="h-[62px] rounded-lg border border-dashed border-[#E6E8EB]" />
                                                        )}
                                                    </div>
                                                ))}
                                            </Fragment>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardShell>
                        </div>
                    )}

                    {activeTab === 'scores' && (
                        <CardShell title={`All Picks · ${season}`} subtitle={`${filteredSeasonPicks.length} of ${seasonPicks.length} picks`} withMenus>
                            <FilterBar>
                                <FilterPill value={teamFilter === 'All Teams' ? 'All' : teamFilter} onChange={v => setTeamFilter(v === 'All' ? 'All Teams' : v)} options={['All', ...teams]} label="Team" allLabel="All teams" />
                                <FilterPill value={positionFilter === 'All Positions' ? 'All' : positionFilter} onChange={v => setPositionFilter(v === 'All' ? 'All Positions' : v)} options={['All', ...positions]} label="Position" allLabel="All positions" />
                                <SearchInput value={playerNameFilter} onChange={setPlayerNameFilter} placeholder="Buscar jogador…" />
                            </FilterBar>
                            <div className="overflow-x-auto rounded-b-xl">
                                <table className="w-full min-w-[520px]">
                                    <thead>
                                        <tr className="border-b border-[#EEF0F2]">
                                            {['Pick', 'Round', 'Player', 'Pos', 'Team'].map(h => (
                                                <th key={h} className="px-3 py-2 text-left text-[11px] font-medium text-[#6B7280] lg:px-4">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSeasonPicks.map((pick, i) => (
                                            <tr key={`${pick.pick}-${i}`} className={`border-b border-[#F1F2F4] transition-colors hover:bg-[#F7F8FA] ${pick.tagOk ? 'bg-[#FFFBEA]' : ''}`}>
                                                <td className="px-3 py-2.5 text-[13px] font-semibold tabular-nums text-[#111] lg:px-4">#{pick.pick}</td>
                                                <td className="px-3 py-2.5 text-[13px] tabular-nums text-[#6B7280] lg:px-4">R{pick.round}</td>
                                                <td className="px-3 py-2.5 lg:px-4">
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <PlayerAvatar pick={pick} player={pick.player} playerLookup={playerLookup} size="sm" />
                                                        <span className="truncate text-[13px] font-medium text-[#111]">{pick.player}</span>
                                                        {pick.tagOk && <Tag tone="gold">Tag OK</Tag>}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 lg:px-4"><PositionBadge position={pick.position} /></td>
                                                <td className="px-3 py-2.5 lg:px-4">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <TeamAvatar team={pick.team} size="xs" />
                                                        <span className="truncate text-[13px] text-[#3F4757]">{pick.team}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredSeasonPicks.length === 0 && (
                                            <tr><td colSpan={5} className="py-10 text-center text-[13px] text-[#6B7280]">Nenhum jogador encontrado com os filtros atuais.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardShell>
                    )}

                    {activeTab === 'notes' && (
                        <CardShell title={`Draft Recap · ${season}`}>
                            {notes.length === 0 ? (
                                <div className="py-16 text-center text-[13px] text-[#6B7280]">Nenhuma nota para {season}</div>
                            ) : (
                                <article className="mx-auto max-w-[760px] px-4 py-5 text-[15px] sm:px-6">
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ children }) => <h1 className="mb-3 mt-5 text-[22px] font-bold leading-tight text-[#111]">{children}</h1>,
                                            h2: ({ children }) => <h2 className="mb-2 mt-5 text-[18px] font-bold leading-tight text-[#111]">{children}</h2>,
                                            h3: ({ children }) => <h3 className="mb-2 mt-4 text-[16px] font-bold text-[#111]">{children}</h3>,
                                            p: ({ children }) => <p className="mb-3 leading-[1.7] text-[#2F3542]">{children}</p>,
                                            strong: ({ children }) => <strong className="font-semibold text-[#111]">{children}</strong>,
                                            em: ({ children }) => <em className="font-semibold not-italic text-[#02275F]">{children}</em>,
                                            ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-[#2F3542]">{children}</ul>,
                                            ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-[#2F3542]">{children}</ol>,
                                            li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
                                            hr: () => <hr className="my-5 border-[#E6E8EB]" />,
                                            blockquote: ({ children }) => <blockquote className="my-3 border-l-4 border-[#02275F] bg-[#F6F7F9] py-2 pl-4 pr-3 text-[#3F4757]">{children}</blockquote>,
                                        }}
                                    >
                                        {String(notes[0]?.Note || '').trim()}
                                    </ReactMarkdown>
                                </article>
                            )}
                        </CardShell>
                    )}
                    {activeTab === 'photos' && photos.length > 0 && (
                        <CardShell title="Draft day" subtitle={`${season} · ${photos.length} photo${photos.length === 1 ? '' : 's'}`} >
                            <div
                                className="relative aspect-[4/3] max-h-[78vh] w-full overflow-hidden bg-[#111] sm:aspect-[3/2]"
                                onTouchStart={handlePhotoTouchStart}
                                onTouchEnd={handlePhotoTouchEnd}
                                style={{ touchAction: 'pan-y' }}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div key={photoIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0">
                                        {/* Foto inteira (contain) sobre uma cópia desfocada que preenche as sobras */}
                                        <Image src={`/images/draft/${season}/${photos[photoIdx].file}`} alt="" aria-hidden fill sizes="100vw" className="scale-110 object-cover opacity-60 blur-2xl" />
                                        <Image src={`/images/draft/${season}/${photos[photoIdx].file}`} alt={photos[photoIdx].caption || ''} fill sizes="(min-width: 1024px) 1100px, 100vw" className="object-contain" />
                                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                                        {photos[photoIdx].caption && (
                                            <div className="absolute bottom-3 left-3 right-16 text-[12px] font-medium text-white/90">{photos[photoIdx].caption}</div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>

                                {photos.length > 1 && (
                                    <>
                                        <button onClick={prevPhoto} aria-label="Previous photo" className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#111] hover:bg-white">
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <button onClick={nextPhoto} aria-label="Next photo" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#111] hover:bg-white">
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                        <div className="absolute bottom-3 right-3 flex gap-1">
                                            {photos.map((_, i) => (
                                                <button
                                                    key={i}
                                                    aria-label={`Photo ${i + 1}`}
                                                    onClick={() => { setPhotoIdx(i); setPhotoTimerKey((k) => k + 1) }}
                                                    className={`h-1.5 rounded-full transition-all ${i === photoIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardShell>
                    )}

            </div>

            <SummaryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} allSeasons={allSeasons} />
        </PageShell>
    )
}
