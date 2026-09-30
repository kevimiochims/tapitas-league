'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { ChevronLeft } from 'lucide-react'
import { PageShell, CardShell, Tag } from '../../components/ui'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const SCRIPT_URL =
    '/api/news'

export default function NewsArticle() {

    const { slug } = useParams()

    const [posts, setPosts] = useState([])
    const [post, setPost] = useState(null)
    const [loading, setLoading] = useState(true)


    const currentIndex =
        post
            ? posts.findIndex(p => p.slug === post.slug)
            : -1

    const previous =
        currentIndex > 0
            ? posts[currentIndex - 1]
            : null

    const next =
        currentIndex >= 0 &&
            currentIndex < posts.length - 1
            ? posts[currentIndex + 1]
            : null


    useEffect(() => {

        async function loadPost() {

            try {

                const response = await fetch(SCRIPT_URL)

                const data = await response.json()

                setPosts(data)

                const foundPost =
                    data.find(post => post.slug === slug)

                setPost(foundPost)

            } catch (err) {

                console.error(err)

            } finally {

                setLoading(false)

            }

        }

        loadPost()

    }, [slug])

    if (loading) return <PageShell loading />

    if (!post) {
        return (
            <PageShell>
                <div className="rounded-xl bg-white py-20 text-center text-[13px] text-[#6B7280]">
                    Notícia não encontrada · <Link href="/news" className="font-semibold text-[#D01F2D] hover:underline">voltar para News</Link>
                </div>
            </PageShell>
        )
    }

    const images = post?.imageUrl?.split('|') || []
    const related = posts.filter(p => p.slug !== post.slug).slice(0, 5)

    const formatNewsDate = (value) => {
        if (!value) return ''
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return value
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date)
    }

    return (
        <PageShell>
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
                <article className="mb-2 overflow-hidden rounded-xl bg-white">
                    {/* Título */}
                    <div className="px-4 pb-4 pt-4 sm:px-8 sm:pt-6">
                        <Link href="/news" className="inline-flex items-center gap-1 text-[12px] font-medium text-[#6B7280] hover:text-[#111]">
                            <ChevronLeft className="h-4 w-4" /> News
                        </Link>
                        <div className="mt-3 flex items-center gap-2">
                            {post.category && <Tag tone="navy">{post.category}</Tag>}
                        </div>
                        <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-[#111] sm:text-[36px]">{post.title}</h1>
                        {post.subtitle && <p className="mt-3 text-[16px] leading-relaxed text-[#3F4757] sm:text-[18px]">{post.subtitle}</p>}
                        <div className="mt-3 text-[13px] text-[#6B7280]">
                            {post.author && <span className="font-semibold text-[#111]">{post.author}</span>}
                            {post.date && <span>{post.author ? ' · ' : ''}{formatNewsDate(post.date)}</span>}
                        </div>
                    </div>

                    {/* Imagem */}
                    {images.length === 1 && (
                        <img src={images[0]} alt={post.title} className="h-auto w-full bg-[#F4F5F7]" />
                    )}
                    {images.length > 1 && (
                        <Swiper modules={[Navigation, Pagination]} navigation pagination={{ clickable: true }}>
                            {images.map((img, index) => (
                                <SwiperSlide key={index} className="flex items-center justify-center bg-[#F4F5F7]">
                                    <img src={img} alt="" className="h-auto w-full" />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    )}

                    {/* Texto */}
                    <div className="mx-auto max-w-[720px] px-4 py-6 text-[16px] sm:px-8 sm:py-8">
                        <ReactMarkdown
                            components={{
                                h1: ({ children }) => <h1 className="mb-3 mt-6 text-[24px] font-bold leading-tight text-[#111]">{children}</h1>,
                                h2: ({ children }) => <h2 className="mb-3 mt-6 text-[20px] font-bold leading-tight text-[#111]">{children}</h2>,
                                h3: ({ children }) => <h3 className="mb-2 mt-5 text-[17px] font-bold text-[#111]">{children}</h3>,
                                p: ({ children }) => <p className="mb-4 leading-[1.7] text-[#2F3542]">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold text-[#111]">{children}</strong>,
                                em: ({ children }) => <em className="font-semibold not-italic text-[#02275F]">{children}</em>,
                                ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-5 text-[#2F3542]">{children}</ul>,
                                ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-5 text-[#2F3542]">{children}</ol>,
                                li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
                                hr: () => <hr className="my-6 border-[#E6E8EB]" />,
                                blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-[#02275F] bg-[#F6F7F9] py-2 pl-4 pr-3 text-[#3F4757]">{children}</blockquote>,
                                img: ({ src, alt }) => <img src={src} alt={alt} className="my-6 w-full rounded-lg" />,
                            }}
                        >
                            {post.content || ''}
                        </ReactMarkdown>
                    </div>

                    {/* Anterior / próxima */}
                    {(previous || next) && (
                        <div className="grid grid-cols-2 gap-px border-t border-[#EEF0F2] bg-[#EEF0F2]">
                            {previous ? (
                                <Link href={`/news/${previous.slug}`} className="group bg-white px-4 py-3 hover:bg-[#F7F8FA] sm:px-6">
                                    <div className="text-[11px] text-[#6B7280]">← Notícia anterior</div>
                                    <div className="mt-0.5 line-clamp-2 text-[13px] font-semibold text-[#111] group-hover:text-[#02275F]">{previous.title}</div>
                                </Link>
                            ) : <div className="bg-white" />}
                            {next ? (
                                <Link href={`/news/${next.slug}`} className="group bg-white px-4 py-3 text-right hover:bg-[#F7F8FA] sm:px-6">
                                    <div className="text-[11px] text-[#6B7280]">Próxima notícia →</div>
                                    <div className="mt-0.5 line-clamp-2 text-[13px] font-semibold text-[#111] group-hover:text-[#02275F]">{next.title}</div>
                                </Link>
                            ) : <div className="bg-white" />}
                        </div>
                    )}
                </article>

                {/* Mais notícias */}
                {related.length > 0 && (
                    <aside>
                        <CardShell title="Mais notícias" subtitle="Do newsroom da liga" sidebar>
                            <div className="py-1">
                                {related.map(item => (
                                    <Link key={item.slug} href={`/news/${item.slug}`} className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-black/[0.03] lg:px-4">
                                        {item.imageUrl && (
                                            <img src={item.imageUrl.split('|')[0]} alt="" className="h-14 w-20 flex-shrink-0 rounded-md bg-[#F4F5F7] object-cover object-top" />
                                        )}
                                        <div className="min-w-0">
                                            {item.category && <div className="text-[11px] text-[#6B7280]">{item.category}</div>}
                                            <div className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#111] group-hover:text-[#02275F]">{item.title}</div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </CardShell>
                    </aside>
                )}
            </div>
        </PageShell>
    )
}
