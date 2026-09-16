'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Newspaper, Laugh, FileText, ChevronRight, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import ReactMarkdown from 'react-markdown'

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQ0H5cbeMhSM8OXKTkoNoqEwZkMG93EiUcJNyNOsK6e-JoRRhQ13OuqhUDpJMq8zB0/exec'

const CATEGORIES = ['Todos', 'Meme', 'Recap', 'Notícia']

function MarkdownPreview({ content }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="m-0">{children}</p>,
        hr: () => <hr className="my-2 border-[#D1D5DB]" />,
        h1: ({ children }) => <span className="font-black">{children}</span>,
        h2: ({ children }) => <span className="font-black">{children}</span>,
        h3: ({ children }) => <span className="font-black">{children}</span>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-[#D01F2D] pl-2 italic">{children}</blockquote>,
        ul: ({ children }) => <ul className="list-disc pl-4">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4">{children}</ol>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

const CATEGORY_STYLE = {
  'Meme': { color: 'text-[#0A0A0A]', border: 'border-[#0A0A0A]', bg: 'bg-[#F5C518]', icon: Laugh },
  'Recap': { color: 'text-white', border: 'border-[#0A0A0A]', bg: 'bg-[#16274F]', icon: FileText },
  'Notícia': { color: 'text-white', border: 'border-[#0A0A0A]', bg: 'bg-[#1E8E3E]', icon: Newspaper },
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
    <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .tp-shadow-navy { box-shadow: 6px 6px 0 0 #16274F; }
        .tp-shadow-navy-sm { box-shadow: 4px 4px 0 0 #16274F; }
        .tp-shadow-red { box-shadow: 6px 6px 0 0 #D01F2D; }
        .tp-shadow-red-sm { box-shadow: 4px 4px 0 0 #D01F2D; }
        .tp-shadow-black { box-shadow: 5px 5px 0 0 #0A0A0A; }
        .tp-stack-title { color: #D01F2D; text-shadow: 4px 4px 0 #0A0A0A; }
      `}</style>

      {/* Header */}
      <Header />

      <section className="mx-auto max-w-[1680px] px-3 md:px-6 pb-20">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden border-2 border-[#0A0A0A] tp-shadow-navy">
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <svg
              className="absolute inset-y-0 left-12 -translate-x-60 h-full w-[140%] max-w-none"
              viewBox="0 0 900 340"
              preserveAspectRatio="xMidYMid slice"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <g opacity="0.06">
                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                  <rect
                    key={i}
                    x={x}
                    y="-80"
                    width={i % 2 === 0 ? 55 : 22}
                    height="520"
                    fill="#16274F"
                    transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 170)`}
                  />
                ))}
              </g>

              <g opacity="0.10" fill="none" stroke="#16274F" strokeWidth="1">
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

              <g opacity="0.05" fill="#D01F2D">
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

              <g opacity="0.08" fill="none" stroke="#16274F" strokeWidth="2" strokeLinejoin="round">
                {[520, 600, 680].map((x, i) => (
                  <polyline key={i} points={`${x},0 ${x + 160},170 ${x},340`} />
                ))}
              </g>

              <g opacity="0.08" fill="#16274F">
                <polygon points="900,0 900,140 760,0" />
                <polygon points="900,340 900,200 760,340" />
              </g>

              <g opacity="0.08" fill="none" stroke="#16274F" strokeWidth="1">
                {[30, 50, 70].map((r) => (
                  <circle key={r} cx="870" cy="60" r={r} />
                ))}
              </g>

              <g opacity="0.10" fill="#16274F">
                {[40, 60, 80, 100].map((y) =>
                  [310, 330, 350].map((x) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />
                  ))
                )}
              </g>

              <g opacity="0.10" stroke="#16274F" strokeWidth="0.5">
                {[56, 113, 226, 284].map((y) => (
                  <line key={y} x1="0" y1={y} x2="900" y2={y} />
                ))}
              </g>

              <text
                x="820"
                y="310"
                fontFamily="'Bebas Neue', sans-serif"
                fontSize="340"
                fill="#16274F"
                opacity="0.04"
                textAnchor="middle"
              >
                12
              </text>
            </svg>

            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(105deg, #F7F6F2 28%, rgba(247,246,242,0.90) 48%, rgba(247,246,242,0.25) 100%)',
              }}
            />
          </div>

          <div className="relative z-10 p-6 sm:p-8 md:p-10">
            <div
              className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 bg-[#D01F2D] px-3 py-1.5 sm:px-4 sm:py-2"
              style={{ clipPath: 'polygon(0 0, 100% 0, 96% 100%, 0% 100%)' }}
            >
              <Newspaper className="h-3 w-3 sm:h-4 sm:w-4 text-white shrink-0" />
              <span
                className="font-black uppercase tracking-[0.25em] text-white whitespace-nowrap"
                style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
              >
                League Newsroom
              </span>
            </div>

            <h1
              className="leading-[0.9] tracking-[-0.02em] text-[#16274F]"
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 'clamp(48px, 7vw, 96px)',
              }}
            >
              <span style={{ display: 'block' }}>News &</span>
              <span className="tp-stack-title" style={{ display: 'block' }}>Memes</span>
            </h1>

            <p
              className="mt-3 sm:mt-4 max-w-xs sm:max-w-lg text-[#3F4757]"
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
              className={`flex-shrink-0 border-2 px-5 py-2.5 text-sm font-black transition-all ${filter === cat
                ? 'border-[#0A0A0A] bg-[#D01F2D] text-white'
                : 'border-[#0A0A0A] bg-white text-[#3F4757] hover:bg-[#F7F6F2]'
                }`}
            >{cat}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#6B7280] font-bold">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Laugh className="h-10 w-10 text-[#6B7280]" />
            <p className="text-[#6B7280] font-bold">Nenhum post ainda. Seja o primeiro a publicar!</p>
          </div>
        ) : (
          <>
            {/* Post em destaque */}
            {featured && (
              <button onClick={() => router.push(`/news/${featured.slug}`)}
                className="mb-6 w-full overflow-hidden border-2 border-[#0A0A0A] bg-white text-left tp-shadow-navy transition-all hover:-translate-y-[1px]"
              >
                <div className="flex flex-col md:flex-row">
                  {featured.imageUrl && (
                    <div className="relative h-56 w-full flex-shrink-0 overflow-hidden border-b-2 border-[#0A0A0A] md:h-auto md:w-80 md:border-b-0 md:border-r-2">
                      <img src={featured.imageUrl.split('|')[0]} alt={featured.title} className="h-full w-full object-cover object-top" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col justify-center p-8">
                    {featured.category && (() => {
                      const s = CATEGORY_STYLE[featured.category]
                      const Icon = s?.icon || Newspaper
                      return (
                        <div className={`mb-3 inline-flex w-fit items-center gap-1.5 border-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest ${s?.color} ${s?.border} ${s?.bg}`}>
                          <Icon className="h-3 w-3" />{featured.category}
                        </div>
                      )
                    })()}
                    <h2 className="mb-3 font-black text-[#16274F] leading-tight" style={{ fontSize: 'clamp(20px, 3vw, 32px)' }}>
                      {featured.title}
                    </h2>
                    <div className="text-[#3F4757] text-sm leading-relaxed line-clamp-3 mb-4 [&_p]:m-0 [&_hr]:my-2 [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_ul]:my-1 [&_ol]:my-1 [&_blockquote]:my-1">
                      <MarkdownPreview content={featured.content || ''} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#6B7280] font-bold">
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
                      className="overflow-hidden border-2 border-[#0A0A0A] bg-white text-left tp-shadow-navy-sm transition-all hover:-translate-y-[1px]"
                    >
                      {post.imageUrl && (
                        <div className="h-44 w-full overflow-hidden border-b-2 border-[#0A0A0A]">
                          <img src={post.imageUrl.split('|')[0]} alt={post.title} className="h-full w-full object-cover object-top transition-transform hover:scale-105" />
                        </div>
                      )}
                      <div className="p-5">
                        {post.category && s && (
                          <div className={`mb-2 inline-flex items-center gap-1 border-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${s.color} ${s.border} ${s.bg}`}>
                            <Icon className="h-2.5 w-2.5" />{post.category}
                          </div>
                        )}
                        <h3 className="mb-2 font-black text-[#16274F] leading-tight line-clamp-2" style={{ fontSize: 'clamp(14px, 1.8vw, 18px)' }}>
                          {post.title}
                        </h3>
                        <div className="text-[#6B7280] text-xs leading-relaxed line-clamp-2 mb-3 [&_p]:m-0 [&_hr]:my-1 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_ul]:my-1 [&_ol]:my-1 [&_blockquote]:my-1">
                          <MarkdownPreview content={post.content || ''} />
                        </div>
                        <div className="text-[10px] text-[#6B7280] font-bold">{formatDate(post.date)}</div>
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
                  className="inline-flex items-center gap-2 border-2 border-[#0A0A0A] bg-white px-6 py-3 text-sm font-black text-[#16274F] tp-shadow-black transition-all hover:-translate-y-[1px] hover:bg-[#F7F6F2]"
                >
                  Carregar mais <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="w-full border-t-4 border-[#D01F2D] bg-[#16274F]">
        <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-3 px-5 py-6 sm:px-8 lg:px-12">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={24} height={24} style={{ filter: 'invert(1)' }} className="opacity-70" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-white/70">Tapitas League · Est. 2014</span>
        </div>
      </footer>
    </main>
  )
}
