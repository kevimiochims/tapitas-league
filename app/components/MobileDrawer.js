'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  Menu,
  X,
  Home,
  Trophy,
  Swords,
  History,
  Flame,
  BarChart2,
} from 'lucide-react'

const links = [
  { href: '/',              label: 'Home',           icon: Home      },
  { href: '/standings',     label: 'Standings',      icon: Trophy    },
  { href: '/matchups',      label: 'Matchups',       icon: Swords    },
  { href: '/history',       label: 'History',        icon: History   },
  { href: '/rivalries',     label: 'Rivalries',      icon: Flame     },
  { href: '/powerrankings', label: 'Power Rankings', icon: BarChart2 },
]

export default function MobileDrawer() {

  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* BOTÃO HAMBURGER */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#020617]/80 backdrop-blur-sm md:hidden"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>

      {/* OVERLAY */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* DRAWER */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-[#020617] border-r border-white/10 transition-transform duration-300 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* HEADER DO DRAWER */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Image
              src="/images/LogoFinalBlack.png"
              alt="Tapitas League"
              width={30}
              height={30}
              style={{ filter: 'invert(1)' }}
            />
            <span className="text-base font-black tracking-[-0.04em]">
              Tapitas<span className="text-cyan-400">League</span>
            </span>
          </div>

          <button onClick={() => setOpen(false)}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* LINKS */}
        <nav className="flex flex-col gap-1 p-4">
          {links.map(({ href, label, icon: Icon }) => {

            const active = pathname === href

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  active
                    ? 'bg-cyan-400/10 border border-cyan-400/20 text-cyan-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}