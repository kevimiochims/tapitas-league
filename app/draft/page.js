'use client'

import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import Header from '../components/Header'
import SummaryDrawer from '../components/SummaryDrawer'
import { useDrawer } from '../context/DrawerContext'
import { DRAFT_PHOTOS } from '../config/draftPhotos'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

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

function TeamSelect({ value, onChange, options, placeholder, disabled }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const selected = options.find((o) => o === value)

    return (
        <div ref={ref} className="relative flex-1 min-w-[220px]">
            <button
                onClick={() => !disabled && setOpen((p) => !p)}
                disabled={disabled}
                className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-[12px] font-bold transition-all duration-300 ${disabled
                    ? 'cursor-not-allowed border-white/5 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] text-slate-600'
                    : open
                        ? 'border-cyan-400 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] text-white shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                        : 'border-white/10 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] text-white hover:border-white/20 hover:bg-[linear-gradient(160deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]'
                    }`}
            >
                <span className="block min-w-0 flex-1 truncate whitespace-nowrap text-left">
                    {selected || placeholder}
                </span>
                <ChevronRight
                    className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-300 ${open ? 'rotate-90 text-cyan-400' : ''
                        }`}
                />
            </button>

            {open && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                    <div className="max-h-56 overflow-y-auto">
                        {options.map((opt) => (
                            <button
                                key={opt}
                                onClick={() => {
                                    onChange(opt)
                                    setOpen(false)
                                }}
                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[12px] font-bold transition-all duration-200 hover:bg-white/[0.06] ${opt === value ? 'bg-cyan-500/[0.03] text-cyan-300' : 'text-slate-300'
                                    }`}
                            >
                                {opt === value && (
                                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]" />
                                )}
                                <span className={opt === value ? 'ml-0' : 'ml-[14px]'}>
                                    {opt}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

const POS_COLORS = {
    QB: { bg: 'bg-red-400/15', border: 'border-red-400/30', text: 'text-red-300' },
    RB: { bg: 'bg-emerald-400/15', border: 'border-emerald-400/30', text: 'text-emerald-300' },
    WR: { bg: 'bg-cyan-400/15', border: 'border-cyan-400/30', text: 'text-cyan-300' },
    TE: { bg: 'bg-orange-400/15', border: 'border-orange-400/30', text: 'text-orange-300' },
    K: { bg: 'bg-slate-400/15', border: 'border-slate-400/30', text: 'text-slate-300' },
    DEF: { bg: 'bg-purple-400/15', border: 'border-purple-400/30', text: 'text-purple-300' },
}

function PosBadge({ pos }) {
    const c =
        POS_COLORS[pos] || {
            bg: 'bg-slate-400/15',
            border: 'border-slate-400/30',
            text: 'text-slate-300',
        }

    return (
        <span
            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${c.bg} ${c.border} ${c.text}`}
        >
            {pos}
        </span>
    )
}

function PlayerAvatar({ player, playerLookup, size = 'md', className = '' }) {
    const [photoFailed, setPhotoFailed] = useState(false)

    const data = getPlayerDataByFullName(player, playerLookup)
    const playerId = data?.playerId
    const shortName = data?.shortName || player

    const photoSrc =
        !photoFailed && playerId
            ? `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`
            : null

    useEffect(() => {
        setPhotoFailed(false)
    }, [player, playerId])

    const sizeClass =
        size === 'sm'
            ? 'h-8 w-8'
            : size === 'lg'
                ? 'h-14 w-14'
                : 'h-10 w-10'

    return (
        <div className={`${sizeClass} overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10 ${className}`}>
            {photoSrc ? (
                <img
                    src={photoSrc}
                    alt={shortName}
                    className="h-full w-full object-cover"
                    onError={() => setPhotoFailed(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/10 text-[11px] font-black text-white">
                    {String(shortName)
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(part => part[0])
                        .join('')
                        .toUpperCase()}
                </div>
            )}
        </div>
    )
}

function TeamAvatar({ team, size = 'md', className = '' }) {
    const avatar = getTeamAvatar(team)

    const sizeClass =
        size === 'sm'
            ? 'h-8 w-8 rounded-xl'
            : size === 'lg'
                ? 'h-14 w-14 rounded-2xl'
                : 'h-10 w-10 rounded-xl'

    if (avatar) {
        return <img src={avatar} alt={team} className={`${sizeClass} object-cover ${className}`} />
    }

    return (
        <div className={`${sizeClass} flex items-center justify-center border border-white/10 bg-white/8 text-[11px] font-black text-white ${className}`}>
            {String(team || '').slice(0, 2).toUpperCase()}
        </div>
    )
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
    const { setLeftSlot } = useDrawer()
    const photos = DRAFT_PHOTOS?.[season] || []
    const photoTouchStartX = useRef(null)
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
            <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-5 text-sm font-black text-cyan-200 transition-all hover:bg-cyan-400/20"
            >
                Summary
                <ChevronRight className="h-4 w-4" />
            </button>
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
                safeFetch(`${BASE_URL}/PLAYER_CACHE`),
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

    const filteredSeasonPicks = useMemo(() => {
        return seasonPicks.filter((pick) => {
            const byTeam = teamFilter === 'All Teams' || pick.team === teamFilter
            const byPos = positionFilter === 'All Positions' || pick.position === positionFilter
            return byTeam && byPos
        })
    }, [seasonPicks, teamFilter, positionFilter])

    useEffect(() => {
        setTeamFilter('All Teams')
        setPositionFilter('All Positions')
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

    return (
        <main className="min-h-screen bg-[#020617] text-white">
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

            <Header onSummaryOpen={() => setDrawerOpen(true)} />

            <section className="px-3 md:px-6 pb-20">
                <div className="relative mb-10 overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f,#0b1422,#0d1028)]">
                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl md:rounded-[38px]">
                        <svg
                            className="absolute inset-y-0 left-1/2 -translate-x-[60%] h-full w-[140%] max-w-none"
                            preserveAspectRatio="xMidYMid slice"
                            viewBox="0 0 900 340"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <g opacity="0.09">
                                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                                    <rect
                                        key={i}
                                        x={x}
                                        y="-80"
                                        width={i % 2 === 0 ? 55 : 22}
                                        height="520"
                                        fill="#22d3ee"
                                        transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 170)`}
                                    />
                                ))}
                            </g>
                            <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                                {[
                                    'M380 -30 L460 85 L380 200 L300 85 Z',
                                    'M460 85 L540 200 L460 315 L380 200 Z',
                                    'M540 -30 L620 85 L540 200 L460 85 Z',
                                    'M620 85 L700 200 L620 315 L540 200 Z',
                                    'M700 -30 L780 85 L700 200 L620 85 Z',
                                    'M780 85 L860 200 L780 315 L700 200 Z',
                                ].map((d, i) => (
                                    <path key={i} d={d} />
                                ))}
                            </g>
                            <g opacity="0.08" fill="#22d3ee">
                                {[
                                    'M420 30 L440 58 L420 86 L400 58 Z',
                                    'M500 120 L520 148 L500 176 L480 148 Z',
                                    'M580 30 L600 58 L580 86 L560 58 Z',
                                    'M660 120 L680 148 L660 176 L640 148 Z',
                                    'M740 30 L760 58 L740 86 L720 58 Z',
                                ].map((d, i) => (
                                    <path key={i} d={d} />
                                ))}
                            </g>
                            <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round">
                                {[520, 600, 680].map((x, i) => (
                                    <polyline key={i} points={`${x},0 ${x + 160},170 ${x},340`} />
                                ))}
                            </g>
                            <g opacity="0.07" fill="#22d3ee">
                                <polygon points="900,0 900,140 760,0" />
                                <polygon points="900,340 900,200 760,340" />
                            </g>
                            <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                                {[30, 50, 70].map((r) => (
                                    <circle key={r} cx="870" cy="60" r={r} />
                                ))}
                            </g>
                            <g opacity="0.09" fill="#22d3ee">
                                {[40, 60, 80, 100].map((y) =>
                                    [310, 330, 350].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />)
                                )}
                            </g>
                            <g opacity="0.06" stroke="#22d3ee" strokeWidth="0.5">
                                {[56, 113, 226, 284].map((y) => (
                                    <line key={y} x1="0" y1={y} x2="900" y2={y} />
                                ))}
                            </g>
                            <text
                                x="790"
                                y="310"
                                fontFamily="'Bebas Neue', sans-serif"
                                fontSize="340"
                                fill="#22d3ee"
                                opacity="0.02"
                                textAnchor="middle"
                            >
                                D
                            </text>
                        </svg>
                        <div
                            className="absolute inset-0"
                            style={{
                                background:
                                    'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.88) 48%, rgba(2,6,23,0.18) 100%)',
                            }}
                        />
                    </div>

                    <div className="relative z-10 p-6 sm:p-8 md:p-10">
                        <div className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 sm:px-4 sm:py-2">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-300 shrink-0" />
                            <span
                                className="font-black uppercase tracking-[0.25em] text-cyan-300 whitespace-nowrap"
                                style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                            >
                                GM War Room
                            </span>
                        </div>

                        <h1
                            className="leading-[0.9] tracking-[-0.02em]"
                            style={{
                                fontFamily: '"Bebas Neue", sans-serif',
                                fontSize: 'clamp(48px, 7vw, 96px)',
                                background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 40%, #67e8f9 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            Draft
                            <span
                                style={{
                                    background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                {' '}
                                Central
                            </span>
                        </h1>

                        <p
                            className="mt-3 sm:mt-4 max-w-xs sm:max-w-2xl text-slate-400 leading-relaxed"
                            style={{ fontSize: 'clamp(14px, 1.5vw, 17px)' }}
                        >
                            Every pick. Every gamble. The complete draft history of the Tapitas League.
                        </p>
                    </div>
                </div>

                <div className="mb-6 overflow-hidden rounded-2xl md:rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
                    <div className="border-b border-white/5 px-6 py-4">
                        <div
                            className="font-black uppercase tracking-[0.3em] text-cyan-300"
                            style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                        >
                            Draft Year
                        </div>
                    </div>

                    <div className="scroll-hide flex justify-start md:justify-center gap-2 overflow-x-auto px-6 py-4">
                        {seasons.map((s) => (
                            <button
                                key={s}
                                onClick={() => setSeason(s)}
                                className={`flex-shrink-0 rounded-2xl px-5 py-2.5 text-sm font-black transition-all ${season === s
                                    ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-300'
                                    : 'border border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500 font-bold">
                        Loading...
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {photos.length > 0 && (
                            <div className="relative overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[#071120]">
                                <div className="border-b border-white/5 px-6 py-4">
                                    <div
                                        className="font-black uppercase tracking-[0.3em] text-cyan-300"
                                        style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                                    >
                                        Draft Day — {season}
                                    </div>
                                </div>

                                <div className="relative">
                                    <div
                                        className="relative aspect-video w-full overflow-hidden"
                                        onTouchStart={handlePhotoTouchStart}
                                        onTouchEnd={handlePhotoTouchEnd}
                                        style={{ touchAction: 'pan-y' }}
                                    >
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={photoIdx}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.4 }}
                                                className="absolute inset-0"
                                            >
                                                <Image
                                                    src={`/images/draft/${season}/${photos[photoIdx].file}`}
                                                    alt={photos[photoIdx].caption || ''}
                                                    fill
                                                    className="object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                {photos[photoIdx].caption && (
                                                    <div className="absolute bottom-4 left-6 right-6 text-sm font-bold text-white/80">
                                                        {photos[photoIdx].caption}
                                                    </div>
                                                )}
                                            </motion.div>
                                        </AnimatePresence>

                                        {photos.length > 1 && (
                                            <>
                                                <button
                                                    onClick={prevPhoto}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm text-white transition-all hover:bg-black/70"
                                                >
                                                    <ChevronLeft className="h-5 w-5" />
                                                </button>

                                                <button
                                                    onClick={nextPhoto}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm text-white transition-all hover:bg-black/70"
                                                >
                                                    <ChevronRight className="h-5 w-5" />
                                                </button>

                                                <div className="absolute bottom-4 right-6 flex gap-1.5">
                                                    {photos.map((_, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => {
                                                                setPhotoIdx(i)
                                                                setPhotoTimerKey((k) => k + 1)
                                                            }}
                                                            className={`h-1.5 rounded-full transition-all ${i === photoIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {highlights && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
                            >
                                <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-400/5 p-5">
                                    <div className="mb-3 flex items-center gap-3">
                                        <TeamAvatar team={highlights.bestTeam} />
                                        <div className="min-w-0">
                                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">
                                                Best Drafter
                                            </div>
                                            <div className="truncate text-lg font-black text-white leading-tight">
                                                {highlights.bestTeam}
                                            </div>
                                        </div>
                                    </div>
                                    {highlights.bestDrafter && (
                                        <div className="text-xs text-slate-400">
                                            {highlights.bestDrafter.points.toFixed(1)} pts
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                                    <div className="mb-3 flex items-center gap-3">
                                        <TeamAvatar team={highlights.worstTeam} />
                                        <div className="min-w-0">
                                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                Worst Drafter
                                            </div>
                                            <div className="truncate text-lg font-black text-white leading-tight">
                                                {highlights.worstTeam}
                                            </div>
                                        </div>
                                    </div>
                                    {highlights.worstDrafter && (
                                        <div className="text-xs text-slate-400">
                                            {highlights.worstDrafter.points.toFixed(1)} pts
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[24px] border border-yellow-400/20 bg-yellow-400/5 p-5">
                                    <div className="mb-3 flex items-center gap-3">
                                        <PlayerAvatar player={highlights.steal?.player} playerLookup={playerLookup} />
                                        <div className="min-w-0">
                                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400">
                                                Steal of the Draft
                                            </div>
                                            <div className="truncate text-lg font-black text-white leading-tight">
                                                {highlights.steal?.player}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400">{highlights.steal?.team}</div>
                                </div>

                                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                                    <div className="mb-3 flex items-center gap-3">
                                        <PlayerAvatar player={highlights.bust?.player} playerLookup={playerLookup} />
                                        <div className="min-w-0">
                                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                Biggest Bust
                                            </div>
                                            <div className="truncate text-lg font-black text-white leading-tight">
                                                {highlights.bust?.player}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400">{highlights.bust?.team}</div>
                                </div>
                            </motion.div>
                        )}

                        <div className="flex gap-2">
                            {[
                                { key: 'board', label: 'Draft Board' },
                                { key: 'scores', label: 'All Picks' },
                                { key: 'notes', label: 'Draft Recap' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`rounded-2xl px-5 py-2.5 text-sm font-black transition-all ${activeTab === tab.key
                                        ? 'bg-cyan-400/10 border border-cyan-400/25 text-cyan-300'
                                        : 'border border-white/5 bg-white/[0.03] text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'board' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[#071120]"
                            >
                                <div className="border-b border-white/5 px-6 py-4">
                                    <div
                                        className="font-black uppercase tracking-[0.3em] text-cyan-300"
                                        style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                                    >
                                        Draft Board — {season}
                                    </div>
                                </div>

                                <div className="overflow-x-auto scroll-hide p-4">
                                    <table className="w-full border-separate border-spacing-1" style={{ minWidth: `${teams.length * 160}px` }}>
                                        <thead>
                                            <tr>
                                                <th className="w-16 text-left px-2 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                                    Round
                                                </th>
                                                {teams.map((team) => (
                                                    <th
                                                        key={team}
                                                        className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap"
                                                    >
                                                        {team}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {boardMatrix.map((row, rIdx) => (
                                                <tr key={rIdx}>
                                                    <td className="px-2 py-1 text-center text-xs font-black text-slate-600">
                                                        R{rounds[rIdx]}
                                                    </td>

                                                    {row.map((picks, cIdx) => (
                                                        <td key={cIdx} className="px-1 py-1 align-top">
                                                            {picks.length > 0 ? (
                                                                <div className="flex flex-col gap-1">
                                                                    {picks.map((pick) => (
                                                                        <div
                                                                            key={pick.pick}
                                                                            className="rounded-xl border border-white/5 bg-white/[0.03] p-2 hover:bg-white/[0.06] transition-all"
                                                                        >
                                                                            <div className="mb-1 flex items-center justify-between gap-1">
                                                                                <span className="text-[9px] font-black text-slate-600">
                                                                                    #{pick.pick}
                                                                                </span>
                                                                                <PosBadge pos={pick.position} />
                                                                            </div>

                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <PlayerAvatar
                                                                                    player={pick.player}
                                                                                    playerLookup={playerLookup}
                                                                                    size="sm"
                                                                                    className="flex-shrink-0"
                                                                                />
                                                                                <div className="min-w-0">
                                                                                    <div className="truncate text-xs font-black text-white leading-tight">
                                                                                        {pick.player}
                                                                                    </div>
                                                                                    <div className="truncate text-[10px] font-bold text-slate-500">
                                                                                        {pick.team}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="rounded-xl border border-white/[0.03] bg-white/[0.01] p-2 h-[52px]" />
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'scores' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[#071120]"
                            >
                                <div className="border-b border-white/5 px-6 py-4">
                                    <div
                                        className="font-black uppercase tracking-[0.3em] text-cyan-300"
                                        style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                                    >
                                        All Picks — {season}
                                    </div>
                                </div>

                                <div className="border-b border-white/5 px-6 py-4">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <TeamSelect
                                            value={teamFilter}
                                            onChange={setTeamFilter}
                                            options={['All Teams', ...teams]}
                                            placeholder="Filtrar por time"
                                        />

                                        <TeamSelect
                                            value={positionFilter}
                                            onChange={setPositionFilter}
                                            options={['All Positions', ...positions]}
                                            placeholder="Filtrar por posição"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/5">
                                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                    Pick
                                                </th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                    Round
                                                </th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                    Team
                                                </th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                    Player
                                                </th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                    Pos
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {filteredSeasonPicks.map((pick, i) => (
                                                <tr
                                                    key={`${pick.pick}-${i}`}
                                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all"
                                                >
                                                    <td className="px-6 py-3 text-sm font-black text-cyan-300">#{pick.pick}</td>
                                                    <td className="px-6 py-3 text-sm font-bold text-slate-500">R{pick.round}</td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <TeamAvatar team={pick.team} size="sm" className="flex-shrink-0" />
                                                            <span className="truncate text-sm font-black text-white">{pick.team}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <PlayerAvatar
                                                                player={pick.player}
                                                                playerLookup={playerLookup}
                                                                className="flex-shrink-0"
                                                            />
                                                            <div className="truncate text-sm font-bold text-slate-300">{pick.player}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <PosBadge pos={pick.position} />
                                                    </td>
                                                </tr>
                                            ))}

                                            {filteredSeasonPicks.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-10 text-center text-sm font-bold text-slate-500">
                                                        Nenhum jogador encontrado com os filtros atuais.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'notes' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                {notes.length === 0 ? (
                                    <div className="flex items-center justify-center rounded-[38px] border border-white/10 bg-[#071120] py-20">
                                        <div className="text-center font-bold text-slate-500">
                                            Nenhuma nota para {season}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-[28px] border border-white/10 bg-[#071120] p-6 md:p-8">
                                        <div className="mb-5 flex items-center gap-3">
                                            <Sparkles className="h-5 w-5 text-cyan-300" />
                                            <div className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">
                                                Draft Recap
                                            </div>
                                        </div>

                                        <article className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white prose-li:text-slate-300">
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ children }) => (
                                                        <h1 className="text-2xl font-black text-white mb-4 mt-6 leading-tight">
                                                            {children}
                                                        </h1>
                                                    ),
                                                    h2: ({ children }) => (
                                                        <h2 className="text-xl font-black text-white mb-3 mt-5 leading-tight">
                                                            {children}
                                                        </h2>
                                                    ),
                                                    h3: ({ children }) => (
                                                        <h3 className="text-lg font-black text-white mb-2 mt-4">
                                                            {children}
                                                        </h3>
                                                    ),
                                                    p: ({ children }) => (
                                                        <p className="text-slate-300 mb-3 leading-relaxed text-justify">
                                                            {children}
                                                        </p>
                                                    ),
                                                    strong: ({ children }) => (
                                                        <strong className="text-white font-black">{children}</strong>
                                                    ),
                                                    em: ({ children }) => (
                                                        <em className="text-cyan-300 not-italic font-bold">{children}</em>
                                                    ),
                                                    ul: ({ children }) => (
                                                        <ul className="list-disc list-inside mb-3 text-slate-300 space-y-1">
                                                            {children}
                                                        </ul>
                                                    ),
                                                    ol: ({ children }) => (
                                                        <ol className="list-decimal list-inside mb-3 text-slate-300 space-y-1">
                                                            {children}
                                                        </ol>
                                                    ),
                                                    li: ({ children }) => <li className="text-slate-300">{children}</li>,
                                                    hr: () => <hr className="border-white/10 my-4" />,
                                                    blockquote: ({ children }) => (
                                                        <blockquote className="border-l-2 border-cyan-400 pl-4 my-3 text-slate-400 italic">
                                                            {children}
                                                        </blockquote>
                                                    ),
                                                }}
                                            >
                                                {String(notes[0]?.Note || '').trim()}
                                            </ReactMarkdown>
                                        </article>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                )}
            </section>

            <footer className="px-2 py-6 md:px-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-center gap-3 rounded-[28px] border border-white/5 py-6">
                    <Image
                        src="/images/LogoFinalBlack.png"
                        alt="Tapitas League"
                        width={24}
                        height={24}
                        style={{ filter: 'invert(1)' }}
                        className="opacity-30"
                    />
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">
                        Tapitas League · Est. 2014
                    </span>
                </div>
            </footer>

            <SummaryDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                allSeasons={allSeasons}
            />
        </main>
    )
}