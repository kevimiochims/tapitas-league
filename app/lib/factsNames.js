// Identidade dos jogadores no GAME_FACTS_ALL. A planilha grava o nome completo
// do Sleeper ("Alvin Kamara"; defesas pelo apelido, "Broncos"). Planilhas antigas
// ainda abreviadas ("A. Kamara") continuam funcionando: nelas a busca tenta o
// nome completo e depois a abreviatura.

const ABBREVIATED = /^[A-Za-z]{1,2}\.\s/

// A planilha já está com nomes completos? (menos da metade abreviada)
export function isFullNameFacts(names) {
  let abbreviated = 0
  let total = 0
  for (const n of names) {
    if (!n || !String(n).includes(' ')) continue // defesas e vazios
    total++
    if (ABBREVIATED.test(String(n).trim())) abbreviated++
  }
  return total > 0 && abbreviated * 2 < total
}

// Nome para exibir onde o espaço é curto: "Roman Wilson" → "R. Wilson".
// Siglas ("A.J. Brown") e defesas ("Broncos") ficam como estão.
export function abbreviatePlayerName(name) {
  const raw = String(name || '').trim()
  const parts = raw.split(/\s+/)
  if (parts.length < 2 || ABBREVIATED.test(raw) || /^[A-Z](\.[A-Z])+\.?$/.test(parts[0])) return raw
  return `${parts[0][0].toUpperCase()}. ${parts.slice(1).join(' ')}`
}

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
  index.fullNames = isFullNameFacts(index.values())
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
// Com a planilha em nomes completos, só o nome completo identifica o jogador:
// um homônimo que nunca jogou na liga (Roman Wilson) fica sem histórico em vez
// de herdar o de outro (Russell Wilson). Em planilha antiga, abreviada,
// `owners` (de buildNameOwners) evita a abreviação que pertence a outro ID.
export function resolveFactsName(index, { id, name, sheetName, pos } = {}, owners = null) {
  const full = String(name || '').trim()
  const parts = full.split(/\s+/).filter(Boolean)
  const candidates = [full, sheetName]
  if (pos === 'DEF') {
    // Defesas: o Sleeper dá "Denver Broncos"; a planilha usa só o apelido ("Broncos")
    if (parts.length >= 2) candidates.push(parts.slice(1).join(' '), parts[parts.length - 1])
  } else if (parts.length >= 2 && !index?.fullNames) {
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
  if (index?.fullNames) return full
  const abbreviated = `${parts[0][0]}. ${parts.slice(1).join(' ')}`
  return belongsToOther(abbreviated) || belongsToOther(`${parts[0][0]}. ${parts[parts.length - 1]}`) ? full : abbreviated
}
