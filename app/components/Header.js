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
      <div className="mx-auto flex min-h-[70px] max-w-[1920px] items-center justify-between gap-2 px-3 sm:px-5 lg:px-6 xl:px-8 2xl:px-12">
        <a href="/" className="flex min-w-0 shrink-0 items-center gap-1.5 xl:gap-2">
          <Image
            src="/images/LogoFinalBlack.png"
            alt="Tapitas League"
            width={34}
            height={34}
            className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8"
          />
          <span className="whitespace-nowrap text-[18px] font-black tracking-[-0.045em] text-white sm:text-[20px] xl:text-[22px] 2xl:text-[23px]">
            Tapitas<span className="text-[#D01F2D]">League</span>
          </span>
        </a>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0 lg:flex">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href
            return (
              <a
                key={href}
                href={href}
                className={`relative whitespace-nowrap px-1.5 py-2 text-[12px] font-black transition-colors duration-200 sm:px-2 sm:text-[13px] lg:px-1.5 lg:text-[13px] xl:px-2.5 xl:text-[15px] 2xl:px-3.5 2xl:text-[16px] ${
                  isActive
                    ? 'text-white after:absolute after:inset-x-1.5 sm:after:inset-x-2 xl:after:inset-x-2.5 2xl:after:inset-x-3 after:-bottom-[2px] after:h-[3px] after:bg-[#D01F2D]'
                    : 'text-[#B8C0D0] hover:text-white'
                }`}
              >
                {label}
              </a>
            )
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-1.5 lg:flex xl:gap-2">
          {showSummary && onSummaryOpen && (
            <button
              onClick={onSummaryOpen}
              className="inline-flex h-10 items-center gap-1.5 border-2 border-[#0A0A0A] bg-[#D01F2D] px-2.5 text-[13px] font-black text-white tp-shadow-black transition-all hover:-translate-y-[1px] sm:px-3 lg:px-2.5 xl:px-4 xl:text-[15px]"
            >
              Summary
              <ChevronRight className="h-3.5 w-3.5 shrink-0 xl:h-4 xl:w-4" />
            </button>
          )}
          {rightSlot && rightSlot}
        </div>
      </div>
    </header>
  )
}
