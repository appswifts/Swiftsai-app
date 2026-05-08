import { ReactNode } from 'react';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#09090b] text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#09090b]/80 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center text-white font-black text-sm group-hover:scale-105 transition-transform">
                  S
                </div>
                <span className="text-lg font-bold tracking-tight">SwiftsAI</span>
              </Link>
              <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
                <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
              </nav>
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2"
                >
                  Log In
                </Link>
                <Link
                  href="/auth"
                  className="text-sm font-semibold bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-white/5 bg-[#09090b]">
            <div className="max-w-7xl mx-auto px-6 py-16">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                {/* Brand */}
                <div className="md:col-span-1">
                  <Link href="/" className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center text-white font-black text-sm">
                      S
                    </div>
                    <span className="text-lg font-bold tracking-tight">SwiftsAI</span>
                  </Link>
                  <p className="text-sm text-white/40 leading-relaxed">
                    The agentic social media scheduling platform at ai.appswifts.com. Schedule, analyze, and engage with your audience across 30+ channels.
                  </p>
                </div>

                {/* Product */}
                <div>
                  <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Product</h4>
                  <ul className="space-y-3 text-sm text-white/50">
                    <li><Link href="/auth" className="hover:text-white transition-colors">Get Started</Link></li>
                    <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                    <li><Link href="/auth/login" className="hover:text-white transition-colors">Log In</Link></li>
                  </ul>
                </div>

                {/* Channels */}
                <div>
                  <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Channels</h4>
                  <ul className="space-y-3 text-sm text-white/50">
                    <li>Facebook</li>
                    <li>Instagram</li>
                    <li>X / Twitter</li>
                    <li>LinkedIn</li>
                    <li>TikTok</li>
                    <li>YouTube</li>
                    <li className="text-white/30">+ 25 more</li>
                  </ul>
                </div>

                {/* Legal */}
                <div>
                  <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Company</h4>
                  <ul className="space-y-3 text-sm text-white/50">
                    <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                    <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
                    <li><a href="mailto:support@appswifts.com" className="hover:text-white transition-colors">Contact</a></li>
                  </ul>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-xs text-white/30">© SwiftsAI, {new Date().getFullYear()}. All rights reserved.</p>
                <div className="flex items-center gap-6 text-xs text-white/30">
                  <Link href="/privacy-policy" className="hover:text-white/60 transition-colors">Privacy</Link>
                  <Link href="/terms-of-service" className="hover:text-white/60 transition-colors">Terms</Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
