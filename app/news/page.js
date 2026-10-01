'use client'

import { useEffect, useState } from 'react'
import { Newspaper, Laugh, FileText, ChevronRight, SquarePen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import NewsTicker from '../components/nfl/NewsTicker'
import { BrandBackdrop, PageShell, PageBar, BarTab, CardShell, StatRow, Tag, Pager, usePager, LoadingState, Skeleton } from '../components/ui'
import ReactMarkdown from 'react-markdown'
import { NEWS_FORM_URL } from '../config/news'

const SCRIPT_URL = '/api/news'

const CATEGORIES = ['Todos', 'Meme', 'Recap', 'Notícia']

function MarkdownPreview({ content }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="m-0">{children}</p>,
        hr: () => <hr className="my-2 border-[#D1D5DB]" />,
        h1: ({ children }) => <span className="font-semibold">{children}</span>,
        h2: ({ children }) => <span className="font-semibold">{children}</span>,
        h3: ({ children }) => <span className="font-semibold">{children}</span>,
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
  'Meme': { tone: 'gold', icon: Laugh },
  'Recap': { tone: 'navy', icon: FileText },
  'Notícia': { tone: 'green', icon: Newspaper },
}

function CategoryTag({ category }) {
  if (!category) return null
  const s = CATEGORY_STYLE[category]
  const Icon = s?.icon || Newspaper
  return <Tag tone={s?.tone}><Icon className="mr-1 h-3 w-3" />{category}</Tag>
}

// Resumo em texto puro (sem markdown) para as prévias.
function excerpt(content, max = 220) {
  const text = String(content || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max).trim()}…` : text
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
  const router = useRouter()
  const PER_PAGE = 8

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
  const featured = filtered[0]
  const { visible: rest, totalPages, pagerProps, listProps } = usePager(filtered.slice(1), PER_PAGE, filter)

  const countFor = cat => cat === 'Todos' ? posts.length : posts.filter(p => p.category === cat).length
  const selectCategory = cat => setFilter(cat)

  const publishButton = NEWS_FORM_URL && (
    <a href={NEWS_FORM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full bg-[#D01F2D] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#B01A26]">
      <SquarePen className="h-3.5 w-3.5" />
      <span>Publicar</span>
    </a>
  )

  return (
    <PageShell>
      <PageBar title="News" right={publishButton}>
        {CATEGORIES.map(cat => (
          <BarTab key={cat} active={filter === cat} onClick={() => selectCategory(cat)}>
            {cat}
            {!loading && <span className="text-[11px] font-normal text-[#9CA3AF]">{countFor(cat)}</span>}
          </BarTab>
        ))}
      </PageBar>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-[260px] w-full rounded-xl sm:h-[380px]" />
          <LoadingState label="Carregando" rows={6} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white py-20">
          <Laugh className="h-8 w-8 text-[#9CA3AF]" />
          <p className="text-[13px] text-[#6B7280]">Nenhum post ainda. Seja o primeiro a publicar!</p>
        </div>
      ) : (
        <>
          {/* Matéria em destaque: imagem inteira com o título por cima */}
          {featured && (
            <button onClick={() => router.push(`/news/${featured.slug}`)} className="group relative mb-2 block h-[300px] w-full overflow-hidden rounded-xl bg-[#02275F] text-left sm:h-[420px]">
              {featured.imageUrl && (
                <img src={featured.imageUrl.split('|')[0]} alt={featured.title} className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-7">
                <div className="mb-2 flex items-center gap-2 text-[12px] text-white/80">
                  <CategoryTag category={featured.category} />
                  <span>{formatDate(featured.date)}</span>
                  {featured.author && <><span>·</span><span>{featured.author}</span></>}
                </div>
                <h2 className="max-w-[820px] text-[24px] font-bold leading-tight tracking-tight sm:text-[36px]">{featured.title}</h2>
                <p className="mt-2 hidden max-w-[720px] text-[14px] leading-relaxed text-white/80 sm:line-clamp-2">{excerpt(featured.content)}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-white">Read the story <ChevronRight className="h-4 w-4" /></span>
              </div>
            </button>
          )}

          {/* Letreiro de manchetes da NFL entre o destaque e a lista */}
          <NewsTicker />

          <div data-sticky-cols className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
            <div className="min-w-0">
              {rest.length > 0 && (
                <CardShell title="Latest" subtitle={filter === 'Todos' ? 'All stories, newest first' : `${filter} · newest first`}>
                  <div {...listProps} className="divide-y divide-[#F1F2F4]">
                    {rest.map((post, i) => (
                      <button key={post.id || i} onClick={() => router.push(`/news/${post.slug}`)} className="group flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-[#F7F8FA] sm:gap-4 lg:px-4">
                        <div className="h-[72px] w-[108px] flex-shrink-0 overflow-hidden rounded-lg bg-[#F4F5F7] sm:h-[104px] sm:w-[168px]">
                          {post.imageUrl && <img src={post.imageUrl.split('|')[0]} alt="" className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.04]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                            <CategoryTag category={post.category} />
                            <span>{formatDate(post.date)}</span>
                          </div>
                          <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-[#111] group-hover:text-[#02275F] sm:text-[17px]">{post.title}</h3>
                          <p className="mt-1 hidden text-[13px] leading-relaxed text-[#6B7280] sm:line-clamp-2">{excerpt(post.content)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {totalPages > 1 && <Pager {...pagerProps} />}
                </CardShell>
              )}
            </div>

            <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC]">
              <CardShell title="Categories" subtitle={`${posts.length} stories in the newsroom`} sidebar>
                <div className="py-1 lg:py-2">
                  {CATEGORIES.map(cat => {
                    const style = CATEGORY_STYLE[cat]
                    const Icon = style?.icon || Newspaper
                    return (
                      <StatRow
                        key={cat}
                        onClick={() => selectCategory(cat)}
                        left={<span className={`flex h-7 w-7 items-center justify-center rounded-full ${filter === cat ? 'bg-[#02275F] text-white' : ({ gold: 'bg-[#FFF2B8] text-[#6B5A00]', navy: 'bg-[#EEF3FF] text-[#02275F]', green: 'bg-[#E8F5EC] text-[#1E8E3E]', red: 'bg-[#FDECEE] text-[#B3171F]' }[style?.tone] || 'bg-white text-[#3F4757] ring-1 ring-[#E6E8EB]')}`}><Icon className="h-3.5 w-3.5" /></span>}
                        title={cat === 'Todos' ? 'All stories' : cat}
                        value={countFor(cat)}
                        valueClass={filter === cat ? 'text-[#02275F]' : 'text-[#6B7280]'}
                      />
                    )
                  })}
                </div>
              </CardShell>
              {NEWS_FORM_URL && (
                <section className="relative mb-2 overflow-hidden rounded-xl text-white">
                  <BrandBackdrop />
                  <div className="relative p-4 lg:p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E8C766]">Newsroom</div>
                    <h2 className="mt-1 text-[18px] font-bold leading-tight">Got a story?</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">Memes, recaps and hot takes from the league. Send your post through the form. It shows up here after it&apos;s published.</p>
                    <div className="mt-3">{publishButton}</div>
                  </div>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </PageShell>
  )
}
