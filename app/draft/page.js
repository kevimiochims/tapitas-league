'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronLeft, ChevronRight, Trophy, Users, Hash } from 'lucide-react'
import Header from '../components/Header'
import { DRAFT_PHOTOS } from '../config/draftPhotos'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

function parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0
    const text = String(value).replace(',', '.').trim()
    const parsed = parseFloat(text)
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
        const res = await fetch(url)
        if (!res.ok) return []
        const json = await res.json()
        return Array.isArray(json) ? json : []
    } catch {
        return []
    }
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
    const c = POS_COLORS[pos] || { bg: 'bg-slate-400/15', border: 'border-slate-400/30', text: 'text-slate-300' }
    return (
        <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${c.bg} ${c.border} ${c.text}`}>
            {pos}
        </span>
    )
}

export default function DraftPage() {

    const [draftData, setDraftData] = useState([])
    const [notesData, setNotesData] = useState([])
    const [gamesData, setGamesData] = useState([])
    const [loading, setLoading] = useState(true)
    const [season, setSeason] = useState('')
    const [photoIdx, setPhotoIdx] = useState(0)
    const [activeTab, setActiveTab] = useState('board') // 'board' | 'scores' | 'notes'

    useEffect(() => {
        async function load() {
            const [draft, notes, games] = await Promise.all([
                safeFetch(`${BASE_URL}/DRAFT_BOARD`),
                safeFetch(`${BASE_URL}/DRAFT_NOTES`),
                safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
            ])
            setDraftData(draft)
            setNotesData(notes)
            setGamesData(games)
            const allSeasons = [...new Set(draft.map(r => String(r?.Season || '').trim()).filter(Boolean))]
                .sort((a, b) => Number(b) - Number(a))
            if (allSeasons.length > 0) setSeason(allSeasons[0])
            setLoading(false)
        }
        load()
    }, [])

    const seasons = useMemo(() => {
        return [...new Set(draftData.map(r => String(r?.Season || '').trim()).filter(Boolean))]
            .sort((a, b) => Number(b) - Number(a))
    }, [draftData])

    const seasonPicks = useMemo(() => {
        return draftData
            .filter(r => String(r?.Season || '').trim() === season)
            .map(r => ({
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
        return [...new Set(seasonPicks.map(p => p.team))].filter(Boolean)
    }, [seasonPicks])

    const rounds = useMemo(() => {
        return [...new Set(seasonPicks.map(p => p.round))].filter(Boolean).sort((a, b) => a - b)
    }, [seasonPicks])

    const boardMatrix = useMemo(() => {
        return rounds.map(round => {
            return teams.map(team => {
                return seasonPicks.filter(
                    p =>
                        p.round === round &&
                        p.team === team
                )
            })
        })
    }, [rounds, teams, seasonPicks])

    // Destaques automáticos — só se tiver dados de pontuação
    const highlights = useMemo(() => {

        const seasonGames = gamesData.filter(
            g => String(g?.Season || '').trim() === season
        )

        if (
            seasonGames.length === 0 ||
            seasonPicks.length === 0
        ) {
            return null
        }

        // =====================
        // MAPA DE DRAFTADOS
        // =====================

        const draftedPlayers = {}

        seasonPicks.forEach(pick => {
            draftedPlayers[
                normalizePlayer(pick.player)
            ] = pick.team
        })

        // =====================
        // TOTAL DE PONTOS
        // DOS JOGADORES DRAFTADOS
        // =====================

        const draftTotals = {}

        seasonPicks.forEach(pick => {
            if (!draftTotals[pick.team]) {
                draftTotals[pick.team] = 0
            }
        })

        seasonGames.forEach(game => {

            // STARTERS

            for (let i = 1; i <= 13; i++) {

                const player =
                    game[`S${i}_Name`]

                const pts =
                    parseNumber(game[`S${i}_Pts`])

                const draftedTeam =
                    draftedPlayers[
                    normalizePlayer(player)
                    ]

                if (draftedTeam) {
                    draftTotals[draftedTeam] += pts
                }
            }

            // BENCH

            for (let i = 1; i <= 8; i++) {

                const player =
                    game[`B${i}_Name`]

                const pts =
                    parseNumber(game[`B${i}_Pts`])

                const draftedTeam =
                    draftedPlayers[
                    normalizePlayer(player)
                    ]

                if (draftedTeam) {
                    draftTotals[draftedTeam] += pts
                }
            }
        })

        const sortedDraftTotals =
            Object.entries(draftTotals)
                .sort((a, b) => b[1] - a[1])

        const bestTeam =
            sortedDraftTotals[0]?.[0]

        const worstTeam =
            sortedDraftTotals[
            sortedDraftTotals.length - 1
            ]?.[0]

        const firstPick =
            seasonPicks.find(
                p => p.pick === 1
            )

        const lastPick =
            seasonPicks[
            seasonPicks.length - 1
            ]

        const bestDrafter =
            bestTeam
                ? {
                    team: bestTeam,
                    points:
                        draftTotals[bestTeam]
                }
                : null

        const worstDrafter =
            worstTeam
                ? {
                    team: worstTeam,
                    points:
                        draftTotals[worstTeam]
                }
                : null
        console.log('Draft Totals', draftTotals)
        return {
            bestTeam,
            worstTeam,
            firstPick,
            lastPick,
            bestDrafter,
            worstDrafter
        }

    }, [gamesData, season, seasonPicks])

    const notes = useMemo(() => {
        return notesData.filter(n => String(n?.Season || '').trim() === season)
    }, [notesData, season])

    const photos = DRAFT_PHOTOS?.[season] || []

    const prevPhoto = () => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)
    const nextPhoto = () => setPhotoIdx(i => (i + 1) % photos.length)

    useEffect(() => { setPhotoIdx(0) }, [season])

    return (
        <main className="min-h-screen bg-[#020617] text-white">

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

            <Header />

            <section className="mx-auto max-w-[1680px] px-3 pb-20 pt-2 md:px-5">

                {/* HERO */}
                <div className="relative mb-10 overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f,#0b1422,#0d1028)]">
                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl md:rounded-[38px]">
                        <svg className="absolute inset-y-0 left-1/2 -translate-x-[60%] h-full w-[140%] max-w-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 900 340" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <g opacity="0.09">
                                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                                    <rect key={i} x={x} y="-80" width={i % 2 === 0 ? 55 : 22} height="520" fill="#22d3ee" transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 170)`} />
                                ))}
                            </g>
                            <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                                {["M380 -30 L460 85 L380 200 L300 85 Z", "M460 85 L540 200 L460 315 L380 200 Z", "M540 -30 L620 85 L540 200 L460 85 Z", "M620 85 L700 200 L620 315 L540 200 Z", "M700 -30 L780 85 L700 200 L620 85 Z", "M780 85 L860 200 L780 315 L700 200 Z"].map((d, i) => <path key={i} d={d} />)}
                            </g>
                            <g opacity="0.08" fill="#22d3ee">
                                {["M420 30 L440 58 L420 86 L400 58 Z", "M500 120 L520 148 L500 176 L480 148 Z", "M580 30 L600 58 L580 86 L560 58 Z", "M660 120 L680 148 L660 176 L640 148 Z", "M740 30 L760 58 L740 86 L720 58 Z"].map((d, i) => <path key={i} d={d} />)}
                            </g>
                            <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round">
                                {[520, 600, 680].map((x, i) => <polyline key={i} points={`${x},0 ${x + 160},170 ${x},340`} />)}
                            </g>
                            <g opacity="0.07" fill="#22d3ee">
                                <polygon points="900,0 900,140 760,0" />
                                <polygon points="900,340 900,200 760,340" />
                            </g>
                            <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                                {[30, 50, 70].map(r => <circle key={r} cx="870" cy="60" r={r} />)}
                            </g>
                            <g opacity="0.09" fill="#22d3ee">
                                {[40, 60, 80, 100].map(y => [310, 330, 350].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />))}
                            </g>
                            <g opacity="0.06" stroke="#22d3ee" strokeWidth="0.5">
                                {[56, 113, 226, 284].map(y => <line key={y} x1="0" y1={y} x2="900" y2={y} />)}
                            </g>
                            <text x="790" y="310" fontFamily="'Bebas Neue', sans-serif" fontSize="340" fill="#22d3ee" opacity="0.02" textAnchor="middle">D</text>
                        </svg>
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.88) 48%, rgba(2,6,23,0.18) 100%)' }} />
                    </div>
                    <div className="relative z-10 p-6 sm:p-8 md:p-10">
                        <div className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 sm:px-4 sm:py-2">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-300 shrink-0" />
                            <span className="font-black uppercase tracking-[0.25em] text-cyan-300 whitespace-nowrap" style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>
                                GM War Room
                            </span>
                        </div>
                        <h1 className="leading-[0.9] tracking-[-0.02em]" style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(54px, 8vw, 110px)', background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 40%, #67e8f9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            Draft
                            <span style={{ background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                {' '}Central
                            </span>
                        </h1>
                        <p className="mt-3 sm:mt-4 max-w-xs sm:max-w-2xl text-slate-400 leading-relaxed" style={{ fontSize: 'clamp(14px, 1.5vw, 17px)' }}>
                            Every pick. Every gamble. Every franchise cornerstone.
                            The complete draft history of the Tapitas League.
                        </p>
                    </div>
                </div>

                {/* SEASON SELECTOR */}
                <div className="mb-6 overflow-hidden rounded-2xl md:rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
                    <div className="border-b border-white/5 px-6 py-4">
                        <div className="font-black uppercase tracking-[0.3em] text-cyan-300" style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>
                            Draft Year
                        </div>
                    </div>
                    <div className="scroll-hide flex justify-start md:justify-center gap-2 overflow-x-auto px-6 py-4">
                        {seasons.map(s => (
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
                    <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Loading...</div>
                ) : (
                    <div className="flex flex-col gap-6">

                        {/* FOTOS */}
                        {photos.length > 0 && (
                            <div className="overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[#071120]">
                                <div className="border-b border-white/5 px-6 py-4">
                                    <div className="font-black uppercase tracking-[0.3em] text-cyan-300" style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>
                                        Draft Day — {season}
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="relative aspect-video w-full overflow-hidden">
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
                                    </div>

                                    {photos.length > 1 && (
                                        <>
                                            <button onClick={prevPhoto} className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm text-white transition-all hover:bg-black/70">
                                                <ChevronLeft className="h-5 w-5" />
                                            </button>
                                            <button onClick={nextPhoto} className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm text-white transition-all hover:bg-black/70">
                                                <ChevronRight className="h-5 w-5" />
                                            </button>
                                            <div className="absolute bottom-4 right-6 flex gap-1.5">
                                                {photos.map((_, i) => (
                                                    <button key={i} onClick={() => setPhotoIdx(i)} className={`h-1.5 rounded-full transition-all ${i === photoIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`} />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* DESTAQUES AUTOMÁTICOS */}
                        {highlights && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="grid grid-cols-2 gap-3 md:grid-cols-4"
                            >
                                <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-400/5 p-5">
                                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">🏆 Best Drafter</div>
                                    <div className="text-lg font-black text-white leading-tight">
                                        {highlights.bestTeam}
                                    </div>

                                    {highlights.bestDrafter && (
                                        <div className="mt-1 text-xs text-slate-400">
                                            {highlights.bestDrafter.points.toFixed(1)} pts
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">😬 Worst Drafter</div>
                                    <div className="text-lg font-black text-white leading-tight">
                                        {highlights.worstTeam}
                                    </div>

                                    {highlights.worstDrafter && (
                                        <div className="mt-1 text-xs text-slate-400">
                                            {highlights.worstDrafter.points.toFixed(1)} pts
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-[24px] border border-yellow-400/20 bg-yellow-400/5 p-5">
                                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400">⭐ 1st Overall</div>
                                    <div className="text-lg font-black text-white leading-tight">{highlights.firstPick?.player}</div>
                                    <div className="mt-1 text-xs text-slate-400">{highlights.firstPick?.team}</div>
                                </div>
                                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">🎯 Last Pick</div>
                                    <div className="text-lg font-black text-white leading-tight">{highlights.lastPick?.player}</div>
                                    <div className="mt-1 text-xs text-slate-400">{highlights.lastPick?.team}</div>
                                </div>
                            </motion.div>
                        )}

                        {/* TABS */}
                        <div className="flex gap-2">
                            {[
                                { key: 'board', label: 'Draft Board' },
                                { key: 'scores', label: 'All Picks' },
                                { key: 'notes', label: 'GM Notes' },
                            ].map(tab => (
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

                        {/* DRAFT BOARD */}
                        {activeTab === 'board' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[#071120]"
                            >
                                <div className="border-b border-white/5 px-6 py-4">
                                    <div className="font-black uppercase tracking-[0.3em] text-cyan-300" style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>
                                        Draft Board — {season}
                                    </div>
                                </div>
                                <div className="overflow-x-auto scroll-hide p-4">
                                    <table className="w-full border-separate border-spacing-1" style={{ minWidth: `${teams.length * 140}px` }}>
                                        <thead>
                                            <tr>
                                                <th className="w-16 text-left px-2 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Round</th>
                                                {teams.map(team => (
                                                    <th key={team} className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">
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
                                                                    {picks.map(pick => (
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

                                                                            <div className="text-xs font-black text-white leading-tight">
                                                                                {pick.player}
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

                        {/* ALL PICKS */}
                        {activeTab === 'scores' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[#071120]"
                            >
                                <div className="border-b border-white/5 px-6 py-4">
                                    <div className="font-black uppercase tracking-[0.3em] text-cyan-300" style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>
                                        All Picks — {season}
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/5">
                                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pick</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Round</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Team</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Player</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pos</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {seasonPicks.map((pick, i) => (
                                                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all">
                                                    <td className="px-6 py-3 text-sm font-black text-cyan-300">#{pick.pick}</td>
                                                    <td className="px-6 py-3 text-sm font-bold text-slate-500">R{pick.round}</td>
                                                    <td className="px-6 py-3 text-sm font-black text-white">{pick.team}</td>
                                                    <td className="px-6 py-3 text-sm font-bold text-slate-300">{pick.player}</td>
                                                    <td className="px-6 py-3"><PosBadge pos={pick.position} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* GM NOTES */}
                        {activeTab === 'notes' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="flex flex-col gap-4"
                            >
                                {notes.length === 0 ? (
                                    <div className="flex items-center justify-center rounded-[38px] border border-white/10 bg-[#071120] py-20">
                                        <div className="text-center text-slate-500 font-bold">Nenhuma nota para {season}</div>
                                    </div>
                                ) : (
                                    notes.map((note, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.35, delay: i * 0.05 }}
                                            className="rounded-[28px] border border-white/10 bg-[#071120] p-6"
                                        >
                                            <div className="mb-3 flex items-center gap-3">
                                                <Sparkles className="h-4 w-4 text-cyan-300 flex-shrink-0" />
                                                <div className="text-sm font-black uppercase tracking-[0.2em] text-cyan-300">
                                                    {String(note?.Team || '').trim()}
                                                </div>
                                            </div>
                                            <p className="text-sm leading-relaxed text-slate-300">
                                                {String(note?.Note || '').trim()}
                                            </p>
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        )}

                    </div>
                )}
            </section>
        </main>
    )
}