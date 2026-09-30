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
    <header className="relative z-30 mb-2 w-full bg-[#2A2B2E]">
      <div className="flex h-14 items-stretch">
        {/* Bloco vermelho com a marca. No mobile, o botão do menu (MobileDrawer) fica sobre a área da esquerda. */}
        <a
          href="/"
          aria-label="Tapitas League"
          className="flex shrink-0 items-center gap-2 bg-[#D01F2D] pl-14 pr-8 lg:pl-6"
          style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%)' }}
        >
          <Image
            src="/images/LogoFinalBlack.png"
            alt=""
            width={34}
            height={34}
            className="h-7 w-7 shrink-0 object-contain brightness-0 invert"
          />
          <span className="whitespace-nowrap text-[17px] font-bold tracking-tight text-white sm:text-[18px]">
            Tapitas League
          </span>
        </a>

        <nav className="hidden min-w-0 flex-1 items-stretch overflow-x-auto pl-2 lg:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href
            return (
              <a
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex shrink-0 items-center whitespace-nowrap px-2.5 text-[13px] font-medium transition-colors xl:px-3.5 xl:text-[14px] ${
                  isActive
                    ? 'text-white after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:border-x-[6px] after:border-b-[6px] after:border-x-transparent after:border-b-white'
                    : 'text-[#C4C7CC] hover:text-white'
                }`}
              >
                {label}
              </a>
            )
          })}
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-2 pl-2 pr-4 lg:flex xl:pr-6">
          {showSummary && onSummaryOpen && (
            <button
              onClick={onSummaryOpen}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-[#D01F2D] pl-3.5 pr-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#B91A27]"
            >
              Summary
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </button>
          )}
          {rightSlot && rightSlot}
        </div>
      </div>
    </header>
  )
}
