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
    <header className="relative z-30 mb-5 w-full border-b-4 border-[#D01F2D] bg-[#16274F]">
      <div className="mx-auto flex min-h-[70px] max-w-[1920px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
        <a href="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <Image
            src="/images/LogoFinalBlack.png"
            alt="Tapitas League"
            width={34}
            height={34}
            className="h-8 w-8 shrink-0 object-contain"
          />
          <span className="whitespace-nowrap text-[20px] font-black tracking-[-0.04em] text-white sm:text-[22px]">
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
                className={`relative whitespace-nowrap px-3 py-2 text-[14px] font-black transition-colors duration-200 xl:px-3.5 xl:text-[15px] ${
                  isActive
                    ? 'text-white after:absolute after:inset-x-3 after:-bottom-[2px] after:h-[3px] after:bg-[#D01F2D]'
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
              className="inline-flex h-10 items-center gap-2 border-2 border-[#0A0A0A] bg-[#D01F2D] px-5 text-[15px] font-black text-white tp-shadow-black transition-all hover:-translate-y-[1px]"
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
