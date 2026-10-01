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
      {/* BARRA DO TOPO (mobile): menu à esquerda sobre o bloco azul do Header, slot da página à direita */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex h-11 items-center justify-between lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center text-white"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="pointer-events-auto flex items-center gap-2 pr-3">
          {leftSlot && leftSlot}
        </div>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
        />
      )}

      <div
        className={`fixed left-0 top-0 z-50 flex h-full w-[min(86vw,320px)] flex-col bg-white shadow-xl transition-[transform,visibility] duration-300 lg:hidden ${
          open ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
        <div className="flex h-11 flex-shrink-0 items-stretch justify-between border-b border-[#E6E8EB] bg-white">
          <div
            className="flex items-center gap-2 bg-[#02275F] pl-4 pr-7"
            style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 11px) 100%, 0 100%)' }}
          >
            <Image
              src="/images/LogoFinalBlack.png"
              alt=""
              width={28}
              height={28}
              className="h-6 w-6 object-contain"
            />
            <span className="text-[15px] font-bold tracking-tight text-white">TapitasLeague</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex w-12 items-center justify-center text-[#3F4757]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center border-b border-[#EEF0F2] border-l-4 px-4 py-3.5 text-[15px] transition-colors ${
                  active
                    ? 'border-l-[#02275F] bg-[#F6F7F9] font-semibold text-[#02275F]'
                    : 'border-l-transparent font-medium text-[#374151] hover:bg-[#F6F7F9]'
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
