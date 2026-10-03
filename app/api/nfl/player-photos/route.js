import { getPlayerPhoto } from '@/app/lib/playerPhoto'
import { cdnHeaders } from '@/app/lib/cache'

export const maxDuration = 60

// ?ids=4034,9221 → { "4034": { url, credit } | null, ... } (até 12 por vez)
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const ids = String(searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(id => /^\d+$/.test(id)).slice(0, 12)
  const out = {}
  for (const id of ids) {
    out[id] = await getPlayerPhoto(id).catch(() => null)
  }
  return Response.json(out, { headers: cdnHeaders(6 * 3600) })
}
