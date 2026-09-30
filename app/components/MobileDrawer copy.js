'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { NAV_LINKS } from '../config/navigation'
import { useDrawer } from '../context/DrawerContext'


export default function MobileDrawer() {

  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { leftSlot } = useDrawer()

  return (
    <>
      {/* BOTÕES FIXOS */}
      <div className="absolute right-4 top-4 z-50 flex items-center gap-2 lg:hidden">

        {leftSlot && leftSlot}

        <button
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center border-2 border-[#0A0A0A] bg-[#D01F2D] tp-shadow-black"
        >
          <Menu className="h-5 w-5 text-white" />
        </button>

      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-[#16274F]/55 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <div
        className={`fixed left-0 top-0 z-50 h-full w-[min(86vw,360px)] border-r-4 border-[#0A0A0A] bg-[#F7F6F2] transition-transform duration-300 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-[#0A0A0A] bg-[#16274F] px-5 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/images/LogoFinalBlack.png"
              alt="Tapitas League"
              width={30}
              height={30}
              className="h-8 w-8 object-contain"
            />
            <span className="text-[18px] font-black tracking-[-0.04em] text-white">
              Tapitas<span className="text-[#D01F2D]">League</span>
            </span>
          </div>
          <button onClick={() => setOpen(false)}>
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <nav className="flex flex-col gap-2 overflow-y-auto p-4">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between border-2 px-4 py-3.5 text-[14px] font-black transition-all ${
                  active
                    ? 'bg-cyan-400/10 border-cyan-400/20 text-[#D01F2D]'
                    : 'border-transparent text-[#3F4757] hover:border-[#0A0A0A]/20 hover:bg-white'
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