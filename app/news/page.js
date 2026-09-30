'use client'

import { useEffect, useState } from 'react'
import { Newspaper, Laugh, FileText, ChevronRight, SquarePen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageShell, PageTitle, ToggleChip, Tag, ShowMore, LoadingState } from '../components/ui'
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
    <PageShell>
      <PageTitle
        title="News & Memes"
        subtitle="Every headline, every recap, every joke from the league."
        right={NEWS_FORM_URL && (
          <a
            href={NEWS_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#D01F2D] px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#B01A26]"
          >
            <SquarePen className="h-4 w-4" />
            <span>Publicar</span>
          </a>
        )}
      />

      {/* Filtros de categoria */}
      <div className="scroll-hide mb-2 flex gap-1.5 overflow-x-auto rounded-xl bg-white p-2">
        {CATEGORIES.map(cat => (
          <ToggleChip key={cat} active={filter === cat} onClick={() => { setFilter(cat); setPage(1) }}>{cat}</ToggleChip>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Carregando" rows={6} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white py-20">
          <Laugh className="h-8 w-8 text-[#9CA3AF]" />
          <p className="text-[13px] text-[#6B7280]">Nenhum post ainda. Seja o primeiro a publicar!</p>
        </div>
      ) : (
        <>
          {/* Post em destaque */}
          {featured && (
            <button onClick={() => router.push(`/news/${featured.slug}`)} className="group mb-2 w-full overflow-hidden rounded-xl bg-white text-left">
              <div className="flex flex-col md:flex-row">
                {featured.imageUrl && (
                  <div className="h-56 w-full flex-shrink-0 overflow-hidden bg-[#F4F5F7] md:h-auto md:min-h-[280px] md:w-[46%]">
                    <img src={featured.imageUrl.split('|')[0]} alt={featured.title} className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]" />
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-center p-4 sm:p-6 lg:p-8">
                  <div className="mb-2 flex items-center gap-2 text-[12px] text-[#6B7280]">
                    <CategoryTag category={featured.category} />
                    <span>{formatDate(featured.date)}</span>
                    {featured.author && <><span>·</span><span>{featured.author}</span></>}
                  </div>
                  <h2 className="mb-2 text-[22px] font-bold leading-tight tracking-tight text-[#111] group-hover:text-[#02275F] sm:text-[28px]">
                    {featured.title}
                  </h2>
                  <div className="line-clamp-3 text-[14px] leading-relaxed text-[#3F4757] [&_blockquote]:my-1 [&_h1]:text-[14px] [&_h2]:text-[14px] [&_h3]:text-[14px] [&_hr]:my-2 [&_ol]:my-1 [&_p]:m-0 [&_ul]:my-1">
                    <MarkdownPreview content={featured.content || ''} />
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#D01F2D]">Read more <ChevronRight className="h-4 w-4" /></span>
                </div>
              </div>
            </button>
          )}

          {/* Grid de posts */}
          {rest.length > 0 && (
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post, i) => (
                <button key={post.id || i} onClick={() => router.push(`/news/${post.slug}`)} className="group flex flex-col overflow-hidden rounded-xl bg-white text-left">
                  {post.imageUrl && (
                    <div className="h-44 w-full overflow-hidden bg-[#F4F5F7]">
                      <img src={post.imageUrl.split('|')[0]} alt={post.title} className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-3 sm:p-4">
                    <div className="mb-1.5 flex items-center gap-2 text-[11px] text-[#6B7280]">
                      <CategoryTag category={post.category} />
                      <span>{formatDate(post.date)}</span>
                    </div>
                    <h3 className="mb-1 line-clamp-2 text-[15px] font-bold leading-snug text-[#111] group-hover:text-[#02275F]">{post.title}</h3>
                    <div className="line-clamp-2 text-[12px] leading-relaxed text-[#6B7280] [&_blockquote]:my-1 [&_h1]:text-[12px] [&_h2]:text-[12px] [&_h3]:text-[12px] [&_hr]:my-1 [&_ol]:my-1 [&_p]:m-0 [&_ul]:my-1">
                      <MarkdownPreview content={post.content || ''} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Carregar mais */}
          {hasMore && (
            <div className="overflow-hidden rounded-xl bg-white">
              <ShowMore remaining={filtered.length - paginated.length} onClick={() => setPage(p => p + 1)} noun="posts" />
            </div>
          )}
        </>
      )}
    </PageShell>
  )
}
