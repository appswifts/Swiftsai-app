import { ReactNode } from 'react';
import Link from 'next/link';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { ChunkLoadRecovery } from '@gitroom/frontend/components/layout/chunk-load-recovery';

import '../global.scss';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/swiftai.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="dark bg-[#0a0a0a] text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <ChunkLoadRecovery />
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="fixed top-0 left-0 right-0 z-50">
            <div className="absolute inset-0 backdrop-blur-xl bg-[#0a0a0a]/80" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 group">
                <LogoTextComponent
                  iconClassName="h-8 w-8 group-hover:scale-105 transition-transform"
                  labelClassName="text-lg"
                />
              </Link>
              <nav className="hidden md:flex items-center gap-8 text-sm text-white/50">
                <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
              </nav>
              <div className="flex items-center gap-1 sm:gap-3">
                <Link
                  href="/auth/login"
                  className="hidden xs:inline-flex text-sm text-white/60 hover:text-white transition-colors px-2 sm:px-4 py-2"
                >
                  Log In
                </Link>
                <Link
                  href="/auth"
                  className="text-xs sm:text-sm font-semibold bg-[#628830] text-white px-3 sm:px-5 py-2 rounded-lg hover:bg-[#7aaf38] transition-all duration-300 whitespace-nowrap"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 pt-16">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-white/[0.04] bg-[#0a0a0a]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                {/* Brand */}
                <div className="col-span-2 md:col-span-1">
                  <Link href="/" className="flex items-center gap-2.5 mb-4">
                    <LogoTextComponent iconClassName="h-8 w-8" labelClassName="text-lg" />
                  </Link>
                  <p className="text-sm text-white/30 leading-relaxed pr-8">
                    The agentic social media scheduling platform. Schedule, analyze, and engage with your audience across 30+ channels.
                  </p>
                </div>

                {/* Product */}
                <div>
                  <h4 className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-4">Product</h4>
                  <ul className="space-y-3 text-sm">
                    <li><Link href="/auth" className="text-white/40 hover:text-white transition-colors">Get Started</Link></li>
                    <li><Link href="/pricing" className="text-white/40 hover:text-white transition-colors">Pricing</Link></li>
                    <li><Link href="/auth/login" className="text-white/40 hover:text-white transition-colors">Log In</Link></li>
                  </ul>
                </div>

                {/* Channels */}
                <div>
                  <h4 className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-4">Channels</h4>
                  <ul className="space-y-3 text-sm">
                    {['Facebook', 'Instagram', 'X / Twitter', 'LinkedIn', 'TikTok', 'YouTube'].map((ch) => (
                      <li key={ch} className="text-white/40">{ch}</li>
                    ))}
                    <li className="text-white/20">+ 25 more</li>
                  </ul>
                </div>

                {/* Company */}
                <div>
                  <h4 className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-4">Company</h4>
                  <ul className="space-y-3 text-sm">
                    <li><Link href="/privacy-policy" className="text-white/40 hover:text-white transition-colors">Privacy Policy</Link></li>
                    <li><Link href="/terms-of-service" className="text-white/40 hover:text-white transition-colors">Terms of Service</Link></li>
                    <li><a href="mailto:support@appswifts.com" className="text-white/40 hover:text-white transition-colors">Contact</a></li>
                  </ul>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-xs text-white/20">&copy; SwiftsAI, {new Date().getFullYear()}. All rights reserved.</p>
                <div className="flex items-center gap-6">
                  <Link href="/privacy-policy" className="text-xs text-white/20 hover:text-white/40 transition-colors">Privacy</Link>
                  <Link href="/terms-of-service" className="text-xs text-white/20 hover:text-white/40 transition-colors">Terms</Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
