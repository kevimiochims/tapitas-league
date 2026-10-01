'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { NAV_LINKS } from '../config/navigation'
import { SummaryButton } from './ui'
import TeamFocusPicker from './TeamFocusPicker'

const SUMMARY_PAGES = ['/', '/standings', '/powerrankings', '/draft', '/records']

export default function Header({ rightSlot, onSummaryOpen, flush = false }) {
  const pathname = usePathname()
  const showSummary = SUMMARY_PAGES.includes(pathname)

  return (
    <header className={`sticky top-0 z-40 w-full border-b border-[#E6E8EB] bg-white ${flush ? '' : 'mb-2'}`}>
      <div className="flex h-11 items-stretch">
        {/* Bloco azul (cor do TL do logo) com a marca. No mobile, o botão do menu (MobileDrawer) fica sobre a área da esquerda. */}
        <a
          href="/"
          aria-label="Tapitas League"
          className="flex shrink-0 items-center gap-2 bg-[#02275F] pl-12 pr-7 lg:pl-4 lg:pr-6 xl:pl-5 xl:pr-7"
          style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 11px) 100%, 0 100%)' }}
        >
          <Image
            src="/images/LogoFinalBlack.png"
            alt=""
            width={28}
            height={28}
            className="h-6 w-6 shrink-0 object-contain"
          />
          <span className="whitespace-nowrap text-[15px] font-bold tracking-tight text-white lg:hidden xl:inline">
            TapitasLeague
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
                className={`relative flex shrink-0 items-center whitespace-nowrap px-2 text-[13px] font-medium transition-colors xl:px-2.5 2xl:px-3.5 2xl:text-[14px] ${
                  isActive
                    ? 'font-semibold text-[#02275F] after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t after:bg-[#02275F] xl:after:inset-x-2.5 2xl:after:inset-x-3.5'
                    : 'text-[#4B5563] hover:text-[#02275F]'
                }`}
              >
                {label}
              </a>
            )
          })}
        </nav>

        {/* Direita: time em foco (filtro geral) e o resumo da temporada só com o
            ícone até telas bem largas, para o menu caber inteiro no notebook */}
        <div className="ml-auto hidden shrink-0 items-center gap-2 pl-2 pr-4 lg:flex xl:pr-6">
          <TeamFocusPicker showName="hidden 2xl:inline" />
          {showSummary && onSummaryOpen && (
            <SummaryButton onClick={onSummaryOpen} iconOnly="2xl:hidden" />
          )}
          {rightSlot && rightSlot}
        </div>
      </div>
    </header>
  )
}
