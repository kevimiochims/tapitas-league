import { SHEET_TABS, SHEET_TTL, getSheetRows } from '@/app/lib/sheets'

export async function GET(_request, { params }) {
  const { tab } = await params

  if (!SHEET_TABS.has(tab)) {
    return Response.json({ error: `Unknown tab: ${tab}` }, { status: 404 })
  }

  try {
    const rows = await getSheetRows(tab)
    return Response.json(rows, {
      headers: {
        // CDN guarda por SHEET_TTL e pode servir a versão anterior por até
        // 1 dia enquanto atualiza ou se o Google estiver fora do ar
        'Cache-Control': `public, s-maxage=${SHEET_TTL}, stale-while-revalidate=86400, stale-if-error=86400`,
      },
    })
  } catch (err) {
    console.error(`[api/sheet] ${tab}:`, err)
    return Response.json({ error: 'Failed to load sheet' }, { status: 502 })
  }
}
