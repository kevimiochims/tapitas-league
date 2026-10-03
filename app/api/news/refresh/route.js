import { revalidateTag } from 'next/cache'
import { NEWS_TAG } from '@/app/lib/newsTag'

// Chamado pelo Apps Script quando entra uma notícia nova na aba MEMES: expira
// o cache das notícias na hora, e a próxima visita já busca a lista nova.
export async function GET() {
  revalidateTag(NEWS_TAG, { expire: 0 })
  return Response.json({ ok: true, refreshedAt: new Date().toISOString() })
}

export const POST = GET
