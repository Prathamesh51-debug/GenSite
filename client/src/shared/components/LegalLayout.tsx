import type { ReactNode } from 'react'
import Footer from './Footer'

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h2 className="text-white font-semibold text-base mb-2">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-gray-300">{children}</div>
  </section>
)

const LegalLayout = ({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: ReactNode }) => (
  <div className="relative text-white">
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-indigo-600/15 blur-[130px]" />
    </div>

    <div className="max-w-3xl mx-auto px-4 md:px-6 min-h-[80vh] pt-16 pb-10">
      <h1 className="text-shimmer text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="text-xs text-gray-500 mt-2">Last updated: {lastUpdated}</p>

      <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200/90">
        <strong>Template notice:</strong> This document is a starting-point template, not legal advice.
        Please review and adapt it with a qualified professional before relying on it.
      </div>

      <div className="mt-8 space-y-8">{children}</div>
    </div>
    <Footer />
  </div>
)

export default LegalLayout
