// Identidade dos jogadores no GAME_FACTS_ALL. A maioria está abreviada
// ("A. Kamara"), mas quem tem homônimo está com o nome completo ("Jayden Reed").
// Por isso a busca tenta primeiro o nome completo e só depois a abreviatura.

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Índice nome normalizado → nome exato como está na planilha
export function buildFactsNameIndex(games) {
  const index = new Map()
  ;(games || []).forEach(g => {
    for (let i = 1; i <= 25; i++) {
      ;['S', 'B'].forEach(prefix => {
        const name = String(g?.[`${prefix}${i}_Name`] || '').trim()
        if (!name || name === '--empty--') return
        const key = normalizeKey(name)
        if (key && !index.has(key)) index.set(key, name)
      })
    }
  })
  return index
}

// Nome exato na planilha para um jogador vindo do Sleeper/ESPN
export function resolveFactsName(index, { name, sheetName, pos } = {}) {
  const full = String(name || '').trim()
  const parts = full.split(/\s+/).filter(Boolean)
  const candidates = [full, sheetName]
  if (pos !== 'DEF' && parts.length >= 2) {
    candidates.push(`${parts[0][0]}. ${parts.slice(1).join(' ')}`, `${parts[0][0]}. ${parts[parts.length - 1]}`)
  }
  for (const c of candidates) {
    const hit = c && index?.get(normalizeKey(c))
    if (hit) return hit
  }
  return sheetName || (pos !== 'DEF' && parts.length >= 2 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : full)
}
