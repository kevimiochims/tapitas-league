'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Newspaper, Laugh, FileText, ChevronRight, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQ0H5cbeMhSM8OXKTkoNoqEwZkMG93EiUcJNyNOsK6e-JoRRhQ13OuqhUDpJMq8zB0/exec'

const CATEGORIES = ['Todos', 'Meme', 'Recap', 'Notícia']

const CATEGORY_STYLE = {
  'Meme': { color: 'text-yellow-400', border: 'border-yellow-400/20', bg: 'bg-yellow-400/10', icon: Laugh },
  'Recap': { color: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/10', icon: FileText },
  'Notícia': { color: 'text-emerald-400', border: 'border-emerald-400/20', bg: 'bg-emerald-400/10', icon: Newspaper },
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

export default function NewsPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todos')
  const [page, setPage] = useState(1)
  const router = useRouter()
  const PER_PAGE = 9

  useEffect(() => {
    fetch(SCRIPT_URL)
      .then(r => r.json())
      .then(data => {
        const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date))
        setPosts(sorted)
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'Todos' ? posts : posts.filter(p => p.category === filter)
  const paginated = filtered.slice(0, page * PER_PAGE)
  const hasMore = paginated.length < filtered.length
  const featured = filtered[0]
  const rest = paginated.slice(1)

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      {/* Header */}
      <Header />

      <section className="mx-auto max-w-[1680px] px-3 md:px-6 pb-20">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f,#0b1422,#0d1028)]">
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl md:rounded-[38px]">
            <svg
              className="absolute inset-y-0 left-12 -translate-x-60 h-full w-[140%] max-w-none"
              viewBox="0 0 900 340"
              preserveAspectRatio="xMidYMid slice"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <g opacity="0.09">
                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                  <rect
                    key={i}
                    x={x}
                    y="-80"
                    width={i % 2 === 0 ? 55 : 22}
                    height="520"
                    fill="#22d3ee"
                    transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 170)`}
                  />
                ))}
              </g>

              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                {[
                  'M380 -30 L460 85 L380 200 L300 85 Z',
                  'M460 85 L540 200 L460 315 L380 200 Z',
                  'M540 -30 L620 85 L540 200 L460 85 Z',
                  'M620 85 L700 200 L620 315 L540 200 Z',
                  'M700 -30 L780 85 L700 200 L620 85 Z',
                  'M780 85 L860 200 L780 315 L700 200 Z',
                ].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              <g opacity="0.08" fill="#22d3ee">
                {[
                  'M420 30 L440 58 L420 86 L400 58 Z',
                  'M500 120 L520 148 L500 176 L480 148 Z',
                  'M580 30 L600 58 L580 86 L560 58 Z',
                  'M660 120 L680 148 L660 176 L640 148 Z',
                  'M740 30 L760 58 L740 86 L720 58 Z',
                ].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round">
                {[520, 600, 680].map((x, i) => (
                  <polyline key={i} points={`${x},0 ${x + 160},170 ${x},340`} />
                ))}
              </g>

              <g opacity="0.07" fill="#22d3ee">
                <polygon points="900,0 900,140 760,0" />
                <polygon points="900,340 900,200 760,340" />
              </g>

              <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                {[30, 50, 70].map((r) => (
                  <circle key={r} cx="870" cy="60" r={r} />
                ))}
              </g>

              <g opacity="0.09" fill="#22d3ee">
                {[40, 60, 80, 100].map((y) =>
                  [310, 330, 350].map((x) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />
                  ))
                )}
              </g>

              <g opacity="0.06" stroke="#22d3ee" strokeWidth="0.5">
                {[56, 113, 226, 284].map((y) => (
                  <line key={y} x1="0" y1={y} x2="900" y2={y} />
                ))}
              </g>

              <text
                x="820"
                y="310"
                fontFamily="'Bebas Neue', sans-serif"
                fontSize="340"
                fill="#22d3ee"
                opacity="0.02"
                textAnchor="middle"
              >
                12
              </text>
            </svg>

            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.88) 48%, rgba(2,6,23,0.18) 100%)',
              }}
            />
          </div>

          <div className="relative z-10 p-6 sm:p-8 md:p-10">
            <div className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 sm:px-4 sm:py-2">
              <Newspaper className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-300 shrink-0" />
              <span
                className="font-black uppercase tracking-[0.25em] text-cyan-300 whitespace-nowrap"
                style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
              >
                League Newsroom
              </span>
            </div>

            <h1
              className="leading-[0.9] tracking-[-0.02em]"
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 'clamp(48px, 7vw, 96px)',
              }}
            >
              <span
                style={{
                  display: 'block',
                  background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 40%, #67e8f9 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                News &
              </span>
              <span
                style={{
                  display: 'block',
                  background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Memes
              </span>
            </h1>

            <p
              className="mt-3 sm:mt-4 max-w-xs sm:max-w-lg text-slate-400"
              style={{ fontSize: 'clamp(14px, 1.5vw, 16px)' }}
            >
              Every headline. Every recap. Every joke from around the league.
            </p>
          </div>
        </div>

        {/* Filtros de categoria */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setFilter(cat); setPage(1) }}
              className={`flex-shrink-0 rounded-2xl border px-5 py-2.5 text-sm font-black transition-all ${filter === cat
                ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300'
                : 'border-white/5 bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
            >{cat}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Laugh className="h-10 w-10 text-slate-700" />
            <p className="text-slate-600 font-bold">Nenhum post ainda. Seja o primeiro a publicar!</p>
          </div>
        ) : (
          <>
            {/* Post em destaque */}
            {featured && (
              <button onClick={() => router.push(`/news/${featured.slug}`)}
                className="mb-6 w-full overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))] text-left transition-all hover:border-white/20"
              >
                <div className="flex flex-col md:flex-row">
                  {featured.imageUrl && (
                    <div className="relative h-56 w-full flex-shrink-0 overflow-hidden md:h-auto md:w-80">
                      <img src={featured.imageUrl.split('|')[0]} alt={featured.title} className="h-full w-full object-cover object-top" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col justify-center p-8">
                    {featured.category && (() => {
                      const s = CATEGORY_STYLE[featured.category]
                      const Icon = s?.icon || Newspaper
                      return (
                        <div className={`mb-3 inline-flex w-fit items-center gap-1.5 rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${s?.color} ${s?.border} ${s?.bg}`}>
                          <Icon className="h-3 w-3" />{featured.category}
                        </div>
                      )
                    })()}
                    <h2 className="mb-3 font-black text-white leading-tight" style={{ fontSize: 'clamp(20px, 3vw, 32px)' }}>
                      {featured.title}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 mb-4">
                      {featured.content?.replace(/<[^>]*>/g, '')}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
                      <span>{formatDate(featured.date)}</span>
                      {featured.author && <><span>·</span><span>{featured.author}</span></>}
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Grid de posts */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                {rest.map((post, i) => {
                  const s = CATEGORY_STYLE[post.category]
                  const Icon = s?.icon || Newspaper
                  return (
                    <button key={post.id || i} onClick={() => router.push(`/news/${post.slug}`)}
                      className="overflow-hidden rounded-[24px] border border-white/5 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))] text-left transition-all hover:border-white/15 hover:bg-white/[0.02]"
                    >
                      {post.imageUrl && (
                        <div className="h-44 w-full overflow-hidden">
                          <img src={post.imageUrl.split('|')[0]} alt={post.title} className="h-full w-full object-cover object-top transition-transform hover:scale-105" />
                        </div>
                      )}
                      <div className="p-5">
                        {post.category && s && (
                          <div className={`mb-2 inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${s.color} ${s.border} ${s.bg}`}>
                            <Icon className="h-2.5 w-2.5" />{post.category}
                          </div>
                        )}
                        <h3 className="mb-2 font-black text-white leading-tight line-clamp-2" style={{ fontSize: 'clamp(14px, 1.8vw, 18px)' }}>
                          {post.title}
                        </h3>
                        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3">
                          {post.content?.replace(/<[^>]*>/g, '')}
                        </p>
                        <div className="text-[10px] text-slate-600 font-bold">{formatDate(post.date)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Carregar mais */}
            {hasMore && (
              <div className="flex justify-center">
                <button onClick={() => setPage(p => p + 1)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-black text-slate-400 transition-all hover:bg-white/[0.08] hover:text-white"
                >
                  Carregar mais <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-[1680px] px-6 pb-12">
        <div className="flex items-center justify-center gap-3 rounded-[28px] border border-white/5 py-6">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={24} height={24} style={{ filter: 'invert(1)' }} className="opacity-30" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Tapitas League · Est. 2014</span>
        </div>
      </footer>
    </main>
  )
}
