'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import Header from '../../components/Header'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbwQ0H5cbeMhSM8OXKTkoNoqEwZkMG93EiUcJNyNOsK6e-JoRRhQ13OuqhUDpJMq8zB0/exec'

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

    if (loading) {
        return (
            <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A] flex items-center justify-center font-bold">
                Carregando...
            </main>
        )
    }

    if (!post) {
        return (
            <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A] flex items-center justify-center font-bold">
                Notícia não encontrada
            </main>
        )
    }

    const images = post?.imageUrl?.split('|') || []

    return (
        <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
                .tp-shadow-navy { box-shadow: 6px 6px 0 0 #16274F; }
                .tp-shadow-navy-sm { box-shadow: 4px 4px 0 0 #16274F; }
                .tp-shadow-black { box-shadow: 5px 5px 0 0 #0A0A0A; }
            `}</style>

            {/* Header */}
            <Header />

            {/* Botao pra voltar e Título da Noticia*/}
            <section className="mx-auto max-w-5xl px-6 pt-8">

                <Link
                    href="/news"
                    className="
                    inline-flex
                    items-center
                    gap-2
                    border-2
                    border-[#0A0A0A]
                    bg-white
                    px-4
                    py-2
                    text-sm
                    font-bold
                    text-[#3F4757]
                    transition-all
                    hover:bg-[#F7F6F2]
                    "
                >
                    ← Voltar para Notícias
                </Link>

                <div className="mt-8">

                    <div
                        className="mb-4 inline-flex bg-[#D01F2D] px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 96% 100%, 0% 100%)' }}
                    >
                        {post.category}
                    </div>

                    <h1
                        className="leading-[0.95] text-[#16274F]"
                        style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(38px, 6vw, 64px)' }}
                    >
                        {post.title}
                    </h1>

                    {post.subtitle && (
                        <p className="
                            mt-6
                            text-lg
                            md:text-xl
                            text-[#3F4757]
                            leading-relaxed
                        ">
                            {post.subtitle}
                        </p>
                    )}

                    <div className="
                        mt-6
                        text-sm
                        font-semibold
                        text-[#6B7280]
                        ">
                        {post.author}
                        {post.date && ` • ${post.date}`}
                    </div>

                </div>

            </section>

            {/* imagem*/}
            <section className="mx-auto max-w-5xl px-6 mt-10">

                {images.length === 1 && (

                    <div className="
                        overflow-hidden
                        border-2
                        border-[#0A0A0A]
                        bg-white
                        tp-shadow-navy
                        ">
                        <img
                            src={images[0]}
                            alt={post.title}
                            className="w-full h-auto"
                        />
                    </div>

                )}

                {images.length > 1 && (

                    <div className="border-2 border-[#0A0A0A] tp-shadow-navy overflow-hidden">
                        <Swiper
                            modules={[Navigation, Pagination]}
                            navigation
                            pagination={{ clickable: true }}
                        >
                            {images.map((img, index) => (
                                <SwiperSlide
                                    key={index}
                                    className="flex items-center justify-center"
                                >
                                    <img
                                        src={img}
                                        alt=""
                                        className="w-full h-auto"
                                    />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>

                )}

            </section>

            {/* Texto */}
            <article className="mx-auto max-w-5xl px-6 py-12">

                <div
                    className=" prose prose-lg max-w-none">
                    <ReactMarkdown
                        components={{
                            h1: ({ children }) => (
                                <h1 className="text-2xl font-black text-[#16274F] mb-4 mt-6 leading-tight">
                                    {children}
                                </h1>
                            ),

                            h2: ({ children }) => (
                                <h2 className="text-xl font-black text-[#16274F] mb-3 mt-5 leading-tight">
                                    {children}
                                </h2>
                            ),

                            h3: ({ children }) => (
                                <h3 className="text-lg font-black text-[#16274F] mb-2 mt-4">
                                    {children}
                                </h3>
                            ),

                            p: ({ children }) => (
                                <p className="text-[#3F4757] mb-3 leading-relaxed text-justify">
                                    {children}
                                </p>
                            ),

                            strong: ({ children }) => (
                                <strong className="text-[#16274F] font-black">
                                    {children}
                                </strong>
                            ),

                            em: ({ children }) => (
                                <em className="text-[#D01F2D] not-italic font-bold">
                                    {children}
                                </em>
                            ),

                            ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-3 text-[#3F4757] space-y-1">
                                    {children}
                                </ul>
                            ),

                            ol: ({ children }) => (
                                <ol className="list-decimal list-inside mb-3 text-[#3F4757] space-y-1">
                                    {children}
                                </ol>
                            ),

                            li: ({ children }) => (
                                <li className="text-[#3F4757]">
                                    {children}
                                </li>
                            ),

                            hr: () => (
                                <hr className="border-[#0A0A0A]/10 my-4" />
                            ),

                            blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-[#D01F2D] pl-4 my-3 text-[#3F4757] italic">
                                    {children}
                                </blockquote>
                            ),
                            img: ({ src, alt }) => (
                                <img
                                    src={src}
                                    alt={alt}
                                    className="
                                    w-full
                                    border-2
                                    border-[#0A0A0A]
                                    my-6
                                    "
                                />
                            ),
                        }}
                    >
                        {post.content || ''}
                    </ReactMarkdown>

                </div>

            </article>

            {/* Noticias Relacionadas */}
            <section className="mx-auto max-w-5xl px-6 pb-12">

                <div className="mb-6 h-px bg-[#0A0A0A]/10" />

                <h2 className="mb-6 text-2xl font-black text-[#16274F]">
                    Mais notícias
                </h2>

                <div className="grid gap-4 md:grid-cols-3">


                    {posts
                        .filter(p => p.slug !== post.slug)
                        .slice(0, 3)
                        .map(item => (

                            <Link
                                key={item.slug}
                                href={`/news/${item.slug}`}
                                className="
                                    overflow-hidden
                                    border-2
                                    border-[#0A0A0A]
                                    bg-white
                                    tp-shadow-navy-sm
                                    transition-all
                                    hover:-translate-y-[1px]
                                "
                            >

                                {item.imageUrl && (
                                    <img
                                        src={item.imageUrl.split('|')[0]}
                                        alt={item.title}
                                        className="h-40 w-full object-cover object-top border-b-2 border-[#0A0A0A]"
                                    />
                                )}

                                <div className="p-4">

                                    <div className="
                                        mb-2
                                        text-xs
                                        font-black
                                        uppercase
                                        text-[#D01F2D]
                                        ">
                                        {item.category}
                                    </div>

                                    <div className="
                                        font-black
                                        text-[#16274F]
                                        leading-tight
                                        ">
                                        {item.title}
                                    </div>

                                </div>

                            </Link>

                        ))}

                </div>

            </section>

            {/* Proxima noticia e notícia anterior */}
            <section className="mx-auto max-w-5xl px-6 pb-16">

                <div className="flex justify-between gap-4">

                    {previous ? (

                        <Link
                            href={`/news/${previous.slug}`}
                            className="
                            max-w-sm
                            border-2
                            border-[#0A0A0A]
                            bg-white
                            p-4
                            tp-shadow-navy-sm
                            transition-all
                            hover:-translate-y-[1px]
                            "
                        >
                            <div className="text-xs text-[#6B7280] font-bold mb-1">
                                NOTÍCIA ANTERIOR
                            </div>

                            <div className="font-black text-[#16274F]">
                                ← {previous.title}
                            </div>
                        </Link>

                    ) : (
                        <div />
                    )}

                    {next ? (

                        <Link
                            href={`/news/${next.slug}`}
                            className="
                                max-w-sm
                                border-2
                                border-[#0A0A0A]
                                bg-white
                                p-4
                                text-right
                                tp-shadow-navy-sm
                                transition-all
                                hover:-translate-y-[1px]
                                "
                        >
                            <div className="text-xs text-[#6B7280] font-bold mb-1">
                                PRÓXIMA NOTÍCIA
                            </div>

                            <div className="font-black text-[#16274F]">
                                {next.title} →
                            </div>
                        </Link>

                    ) : (
                        <div />
                    )}

                </div>

            </section>


            {/*Footer*/}
            <footer className="w-full border-t-4 border-[#D01F2D] bg-[#16274F]">
                <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-3 px-5 py-6 sm:px-8 lg:px-12">
                    <Image
                        src="/images/LogoFinalBlack.png"
                        alt="Tapitas League"
                        width={24}
                        height={24}
                        style={{ filter: 'invert(1)' }}
                        className="opacity-70"
                    />

                    <span className="text-xs font-black uppercase tracking-[0.3em] text-white/70">
                        Tapitas League · Est. 2014
                    </span>
                </div>
            </footer>

        </main>
    )
}