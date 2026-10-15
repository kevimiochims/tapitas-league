// Gera a versão enxuta da base de jogadores do Sleeper (players.json).
// Roda uma vez por dia no GitHub Actions (.github/workflows/players-cache.yml)
// e é publicada no branch "data". O site lê essa cópia (~20x menor) em vez de
// baixar os ~15 MB do Sleeper a cada servidor novo da Vercel.
// Uso: node scripts/players-cache.mjs saida/players.json
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const out = process.argv[2] || 'players.json'
const FANTASY = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF'])
const res = await fetch('https://api.sleeper.app/v1/players/nfl')
if (!res.ok) throw new Error(`Sleeper respondeu ${res.status}`)
const raw = await res.json()

// Mesmos campos de getSleeperPlayers (app/lib/sleeper.js); o time vai cru e o
// site normaliza a sigla
const fields = ['id', 'name', 'pos', 'team', 'injuryStatus', 'injuryBodyPart', 'injuryNotes', 'injuryDate', 'espnId', 'gsisId', 'yearsExp']
const rows = []
for (const [id, p] of Object.entries(raw || {})) {
  if (!p) continue
  const pos = String(p.position || (p.fantasy_positions || [])[0] || '').toUpperCase()
  if (!FANTASY.has(pos)) continue
  const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ')
  rows.push([
    String(id),
    name || String(id),
    pos,
    p.team || null,
    p.injury_status || null,
    p.injury_body_part || null,
    p.injury_notes || null,
    p.injury_status ? (Date.parse(p.injury_start_date || '') || Number(p.news_updated) || null) : null,
    p.espn_id ? String(p.espn_id) : null,
    p.gsis_id ? String(p.gsis_id).trim() : null,
    Number.isFinite(Number(p.years_exp)) ? Number(p.years_exp) : null,
  ])
}
if (rows.length < 1000) throw new Error(`Só ${rows.length} jogadores: resposta do Sleeper suspeita, não publico`)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({ v: 1, updated: new Date().toISOString(), fields, rows }))
console.log(`${rows.length} jogadores gravados em ${out}`)
