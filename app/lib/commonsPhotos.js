import { cached, fetchJson } from './cache'

// Fotos livres (Wikimedia Commons) de um jogador, pela galeria dele: o
// Wikidata liga o ID do jogador na ESPN (P3686) à categoria do Commons (P373),
// então não há risco de homônimo. Usadas nas semanas antigas do Power
// Rankings, quando a ESPN não guarda mais as fotos. Licenças livres exigem
// crédito: cada foto vem com autor e licença.

const UA = { 'User-Agent': 'TapitasLeague/1.0 (fantasy football league site)' }
// A Wikimedia limita pedidos seguidos (429): espera um pouco e tenta de novo
async function fetchPolite(url, opts) {
  for (let i = 0; i < 3; i++) {
    try {
      return await fetchJson(url, opts)
    } catch (err) {
      if (i === 2) throw err
      await new Promise(r => setTimeout(r, 1500 * (i + 1)))
    }
  }
}

const strip = v => String(v || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

// ID da ESPN → categoria do Commons (consulta em lote, guardada por 7 dias)
export async function getCommonsCategories(espnIds) {
  const ids = Array.from(new Set(espnIds.map(String))).filter(id => /^\d+$/.test(id)).sort()
  if (!ids.length) return {}
  return cached(`commons:cats:${ids.join(',')}`, 7 * 24 * 3600, async () => {
    const out = {}
    for (let i = 0; i < ids.length; i += 80) {
      const chunk = ids.slice(i, i + 80)
      const query = `SELECT ?espn ?cat WHERE { VALUES ?espn { ${chunk.map(id => `"${id}"`).join(' ')} } ?item wdt:P3686 ?espn . ?item wdt:P373 ?cat }`
      const data = await fetchPolite(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
        headers: { ...UA, Accept: 'application/sparql-results+json' },
        timeoutMs: 30000,
      })
      // Falha (ex.: limite de pedidos) sobe como erro para não ficar em cache
      ;(data?.results?.bindings || []).forEach(b => { out[b.espn.value] = b.cat.value })
    }
    return out
  })
}

// Fotos do jogador pela busca do Commons dentro da categoria dele e das
// subcategorias ("Aaron Rodgers in 2014"...). `year` restringe à temporada.
// Só paisagem e de boa resolução, com data, autor e licença.
export function getCommonsPhotos(category, year = '') {
  return cached(`commons:photos:${category}:${year}`, 7 * 24 * 3600, async () => {
    const params = new URLSearchParams({
      action: 'query', format: 'json', generator: 'search',
      gsrsearch: `deepcat:"${category}" filetype:bitmap${year ? ` ${year}` : ''}`,
      gsrnamespace: '6', gsrlimit: '50', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '1280',
      iiextmetadatafilter: 'DateTimeOriginal|Artist|LicenseShortName',
    })
    // Sem .catch: uma falha (limite de pedidos) não pode virar "sem fotos" no cache
    const data = await fetchPolite(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: UA, timeoutMs: 30000 })
    return Object.values(data?.query?.pages || {}).map(p => {
      const ii = p?.imageinfo?.[0] || {}
      const meta = ii.extmetadata || {}
      const date = Date.parse(String(meta.DateTimeOriginal?.value || '').slice(0, 10)) || null
      return {
        url: ii.thumburl || ii.url,
        width: Number(ii.width) || 0,
        height: Number(ii.height) || 0,
        date,
        credit: [strip(meta.Artist?.value), 'Wikimedia Commons', strip(meta.LicenseShortName?.value)].filter(Boolean).join(' · '),
        title: String(p?.title || ''),
      }
    }).filter(ph => ph.url && /\.(jpe?g)$/i.test(ph.title) && ph.width >= 1000 && ph.width > ph.height)
  })
}
