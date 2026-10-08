import { getPlayerNews, findEspnIdByName } from '@/app/lib/espn'
import { getSleeperPlayers } from '@/app/lib/sleeper'
import { cdnHeaders } from '@/app/lib/cache'
import { getRssNews, matchNewsToPlayers } from '@/app/lib/rssNews'

// Últimas manchetes de um jogador: ESPN (pelo ID) + RSS de outros sites (pelo nome)
export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[A-Za-z0-9]+$/.test(id)) return Response.json({ error: 'Missing player id' }, { status: 400 })
  try {
    const players = await getSleeperPlayers()
    const info = players.get(id)
    // ESPN pelo ID do Sleeper; se não houver ID ou nada vier, procura o jogador pelo nome
    const espnNews = async () => {
      const byId = info?.espnId ? await getPlayerNews(info.espnId).catch(() => []) : []
      if (byId.length || !info?.name) return byId
      const found = await findEspnIdByName(info.name).catch(() => null)
      return found && found !== info.espnId ? getPlayerNews(found).catch(() => []) : []
    }
    const [espn, rss] = await Promise.all([
      espnNews(),
      info ? getRssNews().then(items => matchNewsToPlayers(items, [info], { loose: true })).catch(() => []) : [],
    ])
    // Só notícias em que ele é o assunto: o sobrenome no título (ex.: "Hall
    // (quadriceps) didn't practice") ou o nome completo logo no começo do texto.
    // Fora ficam listas da rodada ("Week 4 inactives: Coker ruled out…") que só
    // o citam no meio
    const norm = v => ` ${String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
    const fullName = norm(String(info?.name || '').replace(/\s+(Jr|Sr|II|III|IV|V)\.?$/i, ''))
    const surname = fullName.trim().split(' ').pop() || ''
    const isAbout = n => !info?.name || norm(n.headline).includes(` ${surname} `) || norm(String(n.description || '').slice(0, 80)).includes(fullName)
    const seen = new Set()
    // Data inválida conta como antiga (sem isso a ordenação ficava embaralhada)
    const time = n => { const t = new Date(n.published || 0).getTime(); return Number.isNaN(t) ? 0 : t }
    const news = [...espn, ...rss]
      .filter(isAbout)
      .filter(n => {
        const key = String(n.headline).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(({ athleteIds, player, ...n }) => n)
      .sort((a, b) => time(b) - time(a))
      .slice(0, 12)
    // 10 min: a lista do jogador não pode ficar atrás da Home (que renova a cada 15)
    return Response.json({ news }, { headers: cdnHeaders(600) })
  } catch (err) {
    console.error('[api/nfl/player-news]', err)
    return Response.json({ error: 'Failed to load player news' }, { status: 502 })
  }
}
