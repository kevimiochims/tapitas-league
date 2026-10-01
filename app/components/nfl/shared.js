'use client'

import { useState } from 'react'

export const INJURY_ORDER = ['IR', 'Out', 'PUP', 'Sus', 'NA', 'DNR', 'Doubtful', 'Questionable']

export function injuryRank(status) {
  const i = INJURY_ORDER.indexOf(status)
  return i < 0 ? INJURY_ORDER.length : i
}

// Tom da tag de acordo com a gravidade
export function injuryTone(status) {
  if (status === 'Questionable') return 'gold'
  return 'red'
}

export function nflLogo(team) {
  if (!team) return null
  const abbr = String(team).toLowerCase() === 'was' ? 'wsh' : String(team).toLowerCase()
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`
}

// Foto do jogador (Sleeper) com fallback para logo do time (defesas) ou iniciais
export function PlayerThumb({ id, name, pos, nflTeam, size = 32 }) {
  const [failed, setFailed] = useState(false)
  const isDef = pos === 'DEF'
  const src = isDef ? nflLogo(nflTeam || id) : id && !failed ? `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg` : null
  const initials = String(name || '?').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex-shrink-0 overflow-hidden rounded-full bg-[#F4F5F7] ring-1 ring-[#E6E8EB]" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" className={`h-full w-full ${isDef ? 'object-contain p-0.5' : 'object-cover'}`} onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#16274F] font-semibold text-white" style={{ fontSize: size * 0.34 }}>{initials}</div>
      )}
    </div>
  )
}

export function NflTeamMark({ team, size = 14 }) {
  if (!team) return null
  return (
    <span className="inline-flex items-center gap-1">
      <img src={nflLogo(team)} alt="" className="object-contain" style={{ width: size, height: size }} />
      <span>{team}</span>
    </span>
  )
}

export function EmptyNote({ children }) {
  return <div className="px-3 py-6 text-center text-[13px] text-[#6B7280] lg:px-4">{children}</div>
}
