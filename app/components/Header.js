'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { NAV_LINKS } from '../config/navigation'

export default function Header({ rightSlot }) {

  const pathname = usePathname()

  return (
    <header className="relative z-20 mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">

      <a href="/" className="flex items-center gap-3">
        <Image
          src="/images/LogoFinalBlack.png"
          alt="Tapitas League"
          width={36}
          height={36}
          className="rounded-xl invert opacity-80"
        />
        <span className="text-base font-black tracking-[-0.04em] text-white">
          Tapitas<span className="text-cyan-400">League</span>
        </span>
      </a>

      <nav className="hidden items-center gap-1 lg:flex">
        {NAV_LINKS.map(({ label, href }) => {
          const isActive = pathname === href
          return (
            <a
              key={href}
              href={href}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-all hover:bg-white/[0.06] hover:text-white ${isActive
                  ? 'bg-white/[0.06] text-white'
                  : 'text-slate-400'
                }`}
            >
              {label}
            </a>
          )
        })}
      </nav>

      {rightSlot && (
        <div className="hidden lg:block">
          {rightSlot}
        </div>
      )}

    </header>
  )
}