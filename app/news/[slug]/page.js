'use client'

import { useState, useEffect } from 'react'
import Header from '../components/Header'
import SummaryDrawer from '../components/SummaryDrawer'
import { useDrawer } from '../context/DrawerContext'

const SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbwQ0H5cbeMhSM8OXKTkoNoqEwZkMG93EiUcJNyNOsK6e-JoRRhQ13OuqhUDpJMq8zB0/exec'

async function getPost(slug) {
    const res = await fetch(SCRIPT_URL, {
        next: { revalidate: 60 }
    })

    const posts = await res.json()

    return posts.find(post => post.slug === slug)
}

export default async function NewsArticle({ params }) {

    const [drawerOpen, setDrawerOpen] = useState(false)
    const { setLeftSlot } = useDrawer()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [summaryOpen, setSummaryOpen] = useState(false)
    const post = await getPost(params.slug)

    if (!post) {
        return (
            <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
                Notícia não encontrada
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-[#020617] text-white">

            {/* Header */}
            <Header onSummaryOpen={() => setDrawerOpen(true)} />

            <section className="relative h-[600px] overflow-hidden">

                <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/70 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-6xl p-8">

                    <div className="mb-4 inline-flex rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-300">
                        {post.category}
                    </div>

                    <h1 className="max-w-4xl text-5xl md:text-7xl font-black leading-none">
                        {post.title}
                    </h1>

                    <div className="mt-4 text-sm text-slate-400">
                        {post.author}
                    </div>

                </div>

            </section>

            <article className="mx-auto max-w-4xl px-6 py-12">

                <div
                    className="
            prose
            prose-invert
            prose-lg
            max-w-none
          "
                    dangerouslySetInnerHTML={{
                        __html: post.content
                    }}
                />

            </article>
            <SummaryDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                allSeasons={allSeasons}
            />

        </main>
    )
}