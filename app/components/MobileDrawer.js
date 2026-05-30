'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { NAV_LINKS } from '../config/navigation'

export default function MobileDrawer() {

  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#020617]/80 backdrop-blur-sm lg:hidden"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-[#020617] border-r border-white/10 transition-transform duration-300 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Image
              src="/images/LogoFinalBlack.png"
              alt="Tapitas League"
              width={30}
              height={30}
              className="rounded-xl invert"
            />
            <span className="text-base font-black tracking-[-0.04em]">
              Tapitas<span className="text-cyan-400">League</span>
            </span>
          </div>
          <button onClick={() => setOpen(false)}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all border ${
                  active
                    ? 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}