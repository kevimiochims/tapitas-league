'use client'

import { ChevronDown, Users } from 'lucide-react'
import { useTeamFocus } from '../context/TeamFocus'
import { useLeagueStatus } from './nfl/useNflData'
import { TeamLogo } from './ui'

// Seletor do time em foco ("My team"). O <select> invisível cobre a área
// toda. `showName`: classes de quando mostrar o nome (no header, só em telas
// largas, para sobrar espaço para o menu).
export default function TeamFocusPicker({ showName = '', className = '' }) {
  const [team, setTeam] = useTeamFocus()
  const { data } = useLeagueStatus()
  const teams = (data?.teams || []).map(t => t.team).filter(Boolean).sort((a, b) => a.localeCompare(b))
  const options = team && !teams.includes(team) ? [team, ...teams] : teams

  return (
    <label
      title={team ? `My team: ${team}` : 'Pick your team'}
      className={`relative inline-flex h-8 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2 text-[13px] font-semibold transition-colors ${team ? 'border-[#02275F] bg-[#EEF3FF] text-[#02275F]' : 'border-[#D6DCE8] bg-white text-[#3F4757] hover:border-[#02275F]'} ${className}`}
    >
      {team ? <TeamLogo name={team} size={18} /> : <Users className="h-4 w-4" />}
      <span className={`max-w-[140px] truncate ${showName}`}>{team || 'My team'}</span>
      <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
      <select
        aria-label="My team"
        value={team}
        onChange={e => setTeam(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        <option value="">All teams</option>
        {options.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </label>
  )
}
