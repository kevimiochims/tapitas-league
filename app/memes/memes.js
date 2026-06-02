'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Newspaper, Laugh, FileText, ChevronRight, X } from 'lucide-react'

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQ0H5cbeMhSM8OXKTkoNoqEwZkMG93EiUcJNyNOsK6e-JoRRhQ13OuqhUDpJMq8zB0/exec'

const CATEGORIES = ['Todos', 'Meme', 'Recap', 'Notícia']

const CATEGORY_STYLE = {
  'Meme':    { color: 'text-yellow-400',  border: 'border-yellow-400/20', bg: 'bg-yellow-400/10',  icon: Laugh },
  'Recap':   { color: 'text-cyan-400',    border: 'border-cyan-400/20',   bg: 'bg-cyan-400/10',    icon: FileText },
  'Notícia': { color: 'text-emerald-400', border: 'border-emerald-400/20',bg: 'bg-emerald-400/10', icon: Newspaper },
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

export default function MemesPage() {
  const [posts,    setPosts]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('Todos')
  const [selected, setSelected] = useState(null)
  const [page,     setPage]     = useState(1)
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
      <header className="mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-3">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={36} height={36} style={{ filter: 'invert(1)' }} className="opacity-80" />
          <span className="text-base font-black tracking-[-0.04em]">Tapitas<span className="text-cyan-400">League</span></span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {['Home', 'Standings', 'Matchups', 'Records', 'Memes'].map(item => {
            const href = item === 'Home' ? '/' : `/${item.toLowerCase()}`
            return (
              <a key={item} href={href}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all hover:bg-white/[0.06] hover:text-white ${item === 'Memes' ? 'bg-white/[0.06] text-white' : 'text-slate-400'}`}
              >{item}</a>
            )
          })}
        </nav>
      </header>

      <section className="mx-auto max-w-[1680px] px-6 pb-24 pt-4">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10" style={{ background: '#020617', minHeight: '220px' }}>
          <div className="absolute inset-0 overflow-hidden rounded-[38px]">
            <svg width="100%" height="100%" viewBox="0 0 900 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g opacity="0.09">
                {[280,355,400,475,520,595,640,715,760,835].map((x,i)=>(
                  <rect key={i} x={x} y="-80" width={i%2===0?55:22} height="380" fill="#22d3ee" transform={`rotate(-18 ${x+(i%2===0?27:11)} 110)`}/>
                ))}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                {["M380 -30 L460 70 L380 170 L300 70 Z","M540 -30 L620 70 L540 170 L460 70 Z","M700 -30 L780 70 L700 170 L620 70 Z","M860 -30 L940 70 L860 170 L780 70 Z"].map((d,i)=><path key={i} d={d}/>)}
              </g>
              <g opacity="0.07" fill="#22d3ee">
                <polygon points="900,0 900,100 800,0"/>
                <polygon points="900,220 900,120 800,220"/>
              </g>
              <text x="820" y="210" fontFamily="'Bebas Neue',sans-serif" fontSize="220" fill="#22d3ee" opacity="0.025" textAnchor="middle">LOL</text>
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.9) 48%, rgba(2,6,23,0.15) 100%)' }} />
          </div>
          <div className="relative z-10 p-10 md:p-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2">
              <Laugh className="h-4 w-4 text-yellow-300" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-yellow-300">Portal da Liga</span>
            </div>
            <h1 className="leading-[0.88]"
              style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(48px, 7vw, 88px)', letterSpacing: '0.02em' }}>
              <span style={{ display: 'block', background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>MEMES &</span>
              <span style={{ display: 'block', background: 'linear-gradient(160deg, #fbbf24 0%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>NOTÍCIAS</span>
            </h1>
          </div>
        </div>

        {/* Filtros de categoria */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setFilter(cat); setPage(1) }}
              className={`flex-shrink-0 rounded-2xl border px-5 py-2.5 text-sm font-black transition-all ${
                filter === cat
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
              <button onClick={() => setSelected(featured)}
                className="mb-6 w-full overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))] text-left transition-all hover:border-white/20"
              >
                <div className="flex flex-col md:flex-row">
                  {featured.imageUrl && (
                    <div className="relative h-56 w-full flex-shrink-0 overflow-hidden md:h-auto md:w-80">
                      <img src={featured.imageUrl} alt={featured.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#080f1e] hidden md:block" />
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
                    <button key={post.id || i} onClick={() => setSelected(post)}
                      className="overflow-hidden rounded-[24px] border border-white/5 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))] text-left transition-all hover:border-white/15 hover:bg-white/[0.02]"
                    >
                      {post.imageUrl && (
                        <div className="h-44 w-full overflow-hidden">
                          <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover transition-transform hover:scale-105" />
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

      {/* Modal de post */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 md:p-8">
          <div className="relative w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#080f1e] shadow-2xl my-8">
            <button onClick={() => setSelected(null)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            {selected.imageUrl && (
              <div className="h-64 w-full overflow-hidden rounded-t-[32px]">
                <img src={selected.imageUrl} alt={selected.title} className="h-full w-full object-cover" />
              </div>
            )}

            <div className="p-8">
              {selected.category && (() => {
                const s = CATEGORY_STYLE[selected.category]
                const Icon = s?.icon || Newspaper
                return (
                  <div className={`mb-4 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${s?.color} ${s?.border} ${s?.bg}`}>
                    <Icon className="h-3 w-3" />{selected.category}
                  </div>
                )
              })()}

              <h2 className="mb-3 text-2xl font-black text-white leading-tight">{selected.title}</h2>

              <div className="mb-6 flex items-center gap-3 text-xs text-slate-500 font-bold">
                <span>{formatDate(selected.date)}</span>
                {selected.author && <><span>·</span><span>{selected.author}</span></>}
              </div>

              <div
                className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selected.content || '' }}
              />
            </div>
          </div>
        </div>
      )}

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
