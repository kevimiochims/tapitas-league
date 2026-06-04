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
            <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
                Carregando...
            </main>
        )
    }

    if (!post) {
        return (
            <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
                Notícia não encontrada
            </main>
        )
    }

    const images = post?.imageUrl?.split('|') || []

    return (
        <main className="min-h-screen bg-[#020617] text-white">

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
                    rounded-xl
                    border
                    border-white/10
                    bg-white/[0.03]
                    px-4
                    py-2
                    text-sm
                    font-bold
                    text-slate-400
                    transition-all
                    hover:text-white
                    hover:bg-white/[0.06]
                    "
                >
                    ← Voltar para Notícias
                </Link>

                <div className="mt-8">

                    <div className="
                                mb-4
                                inline-flex
                                rounded-xl
                                border
                                border-cyan-400/20
                                bg-cyan-400/10
                                px-3
                                py-1
                                text-xs
                                font-black
                                uppercase
                                tracking-widest
                                text-cyan-300
                                ">
                        {post.category}
                    </div>

                    <h1 className="
                        text-5xl
                        md:text-6xl
                        font-black
                        leading-tight
                        text-white
                        ">
                        {post.title}
                    </h1>

                    {post.subtitle && (
                        <p className="
                            mt-6
                            text-lg
                            md:text-xl
                            text-slate-300
                            leading-relaxed
                        ">
                            {post.subtitle}
                        </p>
                    )}

                    <div className="
                        mt-6
                        text-sm
                        font-semibold
                        text-slate-500
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
                        rounded-[32px]
                        border
                        border-white/10
                        bg-white/[0.02]
                        ">
                        <img
                            src={images[0]}
                            alt={post.title}
                            className="w-full h-auto"
                        />
                    </div>

                )}

                {images.length > 1 && (

                    <Swiper
                        modules={[Navigation, Pagination]}
                        navigation
                        pagination={{ clickable: true }}
                        className="rounded-[32px] overflow-hidden"
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

                )}

            </section>

            {/* Texto */}
            <article className="mx-auto max-w-5xl px-6 py-12">

                <div
                    className=" prose prose-invert prose-lg max-w-none">
                    <ReactMarkdown
                        components={{
                            h1: ({ children }) => (
                                <h1 className="text-2xl font-black text-white mb-4 mt-6 leading-tight">
                                    {children}
                                </h1>
                            ),

                            h2: ({ children }) => (
                                <h2 className="text-xl font-black text-white mb-3 mt-5 leading-tight">
                                    {children}
                                </h2>
                            ),

                            h3: ({ children }) => (
                                <h3 className="text-lg font-black text-white mb-2 mt-4">
                                    {children}
                                </h3>
                            ),

                            p: ({ children }) => (
                                <p className="text-slate-300 mb-3 leading-relaxed text-justify">
                                    {children}
                                </p>
                            ),

                            strong: ({ children }) => (
                                <strong className="text-white font-black">
                                    {children}
                                </strong>
                            ),

                            em: ({ children }) => (
                                <em className="text-cyan-300 not-italic font-bold">
                                    {children}
                                </em>
                            ),

                            ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-3 text-slate-300 space-y-1">
                                    {children}
                                </ul>
                            ),

                            ol: ({ children }) => (
                                <ol className="list-decimal list-inside mb-3 text-slate-300 space-y-1">
                                    {children}
                                </ol>
                            ),

                            li: ({ children }) => (
                                <li className="text-slate-300">
                                    {children}
                                </li>
                            ),

                            hr: () => (
                                <hr className="border-white/10 my-4" />
                            ),

                            blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-cyan-400 pl-4 my-3 text-slate-400 italic">
                                    {children}
                                </blockquote>
                            ),
                            img: ({ src, alt }) => (
                                <img
                                    src={src}
                                    alt={alt}
                                    className="
                                    w-full
                                    rounded-[28px]
                                    border
                                    border-white/10
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

                <div className="mb-6 h-px bg-white/10" />

                <h2 className="mb-6 text-2xl font-black">
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
                                    rounded-3xl
                                    border
                                    border-white/10
                                    bg-white/[0.02]
                                    transition-all
                                    hover:bg-white/[0.04]
                                    hover:border-white/20
                                "
                            >

                                {item.imageUrl && (
                                    <img
                                        src={item.imageUrl.split('|')[0]}
                                        alt={item.title}
                                        className="h-40 w-full object-cover"
                                    />
                                )}

                                <div className="p-4">

                                    <div className="
                                        mb-2
                                        text-xs
                                        font-black
                                        uppercase
                                        text-cyan-400
                                        ">
                                        {item.category}
                                    </div>

                                    <div className="
                                        font-black
                                        text-white
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
                            rounded-2xl
                            border
                            border-white/10
                            bg-white/[0.02]
                            p-4
                            transition-all
                            hover:bg-white/[0.04]
                            "
                        >
                            <div className="text-xs text-slate-500 mb-1">
                                NOTÍCIA ANTERIOR
                            </div>

                            <div className="font-black text-white">
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
                                rounded-2xl
                                border
                                border-white/10
                                bg-white/[0.02]
                                p-4
                                text-right
                                transition-all
                                hover:bg-white/[0.04]
                                "
                        >
                            <div className="text-xs text-slate-500 mb-1">
                                PRÓXIMA NOTÍCIA
                            </div>

                            <div className="font-black text-white">
                                {next.title} →
                            </div>
                        </Link>

                    ) : (
                        <div />
                    )}

                </div>

            </section>


            {/*Footer*/}
            <footer className="px-2 py-6 md:px-6 max-w-[1680px] mx-auto">
                <div className="flex items-center justify-center gap-3 rounded-[28px] border border-white/5 py-6">
                    <Image
                        src="/images/LogoFinalBlack.png"
                        alt="Tapitas League"
                        width={24}
                        height={24}
                        style={{ filter: 'invert(1)' }}
                        className="opacity-30"
                    />

                    <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">
                        Tapitas League · Est. 2014
                    </span>
                </div>
            </footer>

        </main>
    )
}