'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { NAV_LINKS } from '../config/navigation'
import { ChevronRight } from 'lucide-react'

const SUMMARY_PAGES = ['/', '/standings', '/powerrankings', '/draft', '/records']

export default function Header({ rightSlot, onSummaryOpen }) {
  const pathname = usePathname()
  const showSummary = SUMMARY_PAGES.includes(pathname)

  return (
    <header className="relative z-30 mb-6 w-full border-b-4 border-[#D01F2D] bg-[#16274F]">
      <div className="mx-auto flex min-h-[88px] max-w-[1920px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
        <a href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <Image
            src="/images/LogoFinalBlack.png"
            alt="Tapitas League"
            width={38}
            height={38}
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="whitespace-nowrap text-[21px] font-black tracking-[-0.04em] text-white sm:text-[23px]">
            Tapitas<span className="text-[#D01F2D]">League</span>
          </span>
        </a>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href
            return (
              <a
                key={href}
                href={href}
                className={`relative whitespace-nowrap px-3.5 py-3 text-[15px] font-black transition-colors duration-200 ${
                  isActive
                    ? 'text-white after:absolute after:inset-x-3.5 after:-bottom-[1px] after:h-[3px] after:bg-[#D01F2D]'
                    : 'text-[#B8C0D0] hover:text-white'
                }`}
              >
                {label}
              </a>
            )
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {showSummary && onSummaryOpen && (
            <button
              onClick={onSummaryOpen}
              className="inline-flex h-12 items-center gap-2 border-2 border-[#0A0A0A] bg-[#D01F2D] px-6 text-[16px] font-black text-white tp-shadow-black transition-all hover:-translate-y-[1px]"
            >
              Summary
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {rightSlot && rightSlot}
        </div>
      </div>
    </header>
  )
}
