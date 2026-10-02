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

// Dono de cada nome na liga, pela aba _PLAYER_CACHE: nome normalizado → IDs do
// Sleeper de quem já usou aquele nome na planilha. Serve para não confundir
// homônimos abreviados ("R. Wilson" é o Russell, não o Roman).
export function buildNameOwners(cacheRows) {
  const owners = new Map()
  ;(cacheRows || []).forEach(r => {
    const id = String(r?.player_id || '').trim()
    if (!id) return
    ;[r?.name, r?.full_name].forEach(v => {
      const key = normalizeKey(v)
      if (!key) return
      if (!owners.has(key)) owners.set(key, new Set())
      owners.get(key).add(id)
    })
  })
  return owners
}

// Nome exato na planilha para um jogador vindo do Sleeper/ESPN.
// `owners` (opcional, de buildNameOwners): se o nome abreviado já pertence a
// outro jogador da liga, não usa a abreviação. Um jogador que nunca jogou na
// liga fica sem histórico, em vez de herdar o de um homônimo.
export function resolveFactsName(index, { id, name, sheetName, pos } = {}, owners = null) {
  const full = String(name || '').trim()
  const parts = full.split(/\s+/).filter(Boolean)
  const candidates = [full, sheetName]
  if (pos === 'DEF') {
    // Defesas: o Sleeper dá "Denver Broncos"; a planilha usa só o apelido ("Broncos")
    if (parts.length >= 2) candidates.push(parts.slice(1).join(' '), parts[parts.length - 1])
  } else if (parts.length >= 2) {
    candidates.push(`${parts[0][0]}. ${parts.slice(1).join(' ')}`, `${parts[0][0]}. ${parts[parts.length - 1]}`)
  }
  const playerId = String(id || '').trim()
  const isAbbrev = c => pos !== 'DEF' && c !== full && c !== sheetName
  const belongsToOther = c => {
    if (!playerId || !owners) return false
    const ids = owners.get(normalizeKey(c))
    return Boolean(ids && ids.size && !ids.has(playerId))
  }
  for (const c of candidates) {
    const hit = c && index?.get(normalizeKey(c))
    if (!hit) continue
    if (isAbbrev(c) && belongsToOther(c)) continue // homônimo: o nome abreviado é de outro jogador
    return hit
  }
  if (sheetName) return sheetName
  if (parts.length < 2) return full
  if (pos === 'DEF') return parts[parts.length - 1]
  const abbreviated = `${parts[0][0]}. ${parts.slice(1).join(' ')}`
  return belongsToOther(abbreviated) || belongsToOther(`${parts[0][0]}. ${parts[parts.length - 1]}`) ? full : abbreviated
}
