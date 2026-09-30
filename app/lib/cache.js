// Cache em memória por instância do servidor, com três garantias:
// - dentro do TTL, devolve o valor guardado sem chamar a fonte;
// - várias requisições simultâneas compartilham uma única busca;
// - se a fonte falhar, devolve a última versão boa (quando existir).

// Alguns sites recusam requisições sem cara de navegador
export const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/rss+xml, application/xml, text/xml, application/json, text/html;q=0.9, */*;q=0.8',
}

const store = new Map()
const inflight = new Map()

export async function cached(key, ttlSeconds, load) {
  const hit = store.get(key)
  if (hit && Date.now() - hit.at < ttlSeconds * 1000) return hit.value

  if (!inflight.has(key)) {
    inflight.set(key, Promise.resolve()
      .then(load)
      .then(value => {
        store.set(key, { value, at: Date.now() })
        return value
      })
      .finally(() => inflight.delete(key)))
  }

  try {
    return await inflight.get(key)
  } catch (err) {
    if (hit) {
      console.error(`[cache] ${key}: ${err.message} — servindo versão anterior`)
      return hit.value
    }
    throw err
  }
}

export async function fetchJson(url, { timeoutMs = 15000, headers } = {}) {
  // APIs JSON (ESPN, Sleeper, Open-Meteo) vão sem user agent de navegador: a
  // ESPN passou a recusar o placar quando ele era enviado.
  const res = await fetch(url, { cache: 'no-store', headers, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`${res.status} from ${url.split('?')[0]}`)
  return res.json()
}


export async function fetchText(url, { timeoutMs = 30000, headers } = {}) {
  const res = await fetch(url, { cache: 'no-store', headers: { ...BROWSER_HEADERS, ...headers }, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`${res.status} from ${url.split('?')[0]}`)
  return res.text()
}

// Cabeçalho de cache para o CDN: guarda por `seconds` e pode servir a versão
// anterior enquanto atualiza ou se a fonte estiver fora do ar.
export function cdnHeaders(seconds) {
  return { 'Cache-Control': `public, s-maxage=${seconds}, stale-while-revalidate=86400, stale-if-error=86400` }
}
