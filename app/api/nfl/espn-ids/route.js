import { cdnHeaders } from '@/app/lib/cache'
import { getEspnIdMap } from '@/app/lib/espn'

// Mapa ID do Sleeper → ID da ESPN (para as fotos recortadas da ESPN)
export async function GET() {
  try {
    return Response.json(await getEspnIdMap(), { headers: cdnHeaders(86400) })
  } catch (err) {
    console.error('[api/nfl/espn-ids]', err)
    return Response.json({}, { status: 502 })
  }
}
