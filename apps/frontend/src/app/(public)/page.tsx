import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SwiftsAI - The Agentic Social Media Scheduling Platform',
  description:
    'Schedule, analyze, and engage with your audience across 30+ social media channels. AI-powered content generation, team collaboration, and comprehensive analytics.',
  openGraph: {
    title: 'SwiftsAI - The Agentic Social Media Scheduling Platform',
    description:
      'Schedule, analyze, and engage with your audience across 30+ social media channels.',
    url: 'https://ai.appswifts.com',
    siteName: 'SwiftsAI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SwiftsAI - The Agentic Social Media Scheduling Platform',
    description:
      'Schedule, analyze, and engage with your audience across 30+ social media channels.',
  },
};

const features = [
  {
    icon: 'calendar_month',
    title: 'Seamless Scheduling',
    description: 'Schedule, analyze, and engage across 30+ channels from one visual calendar. Cross-post content with a single click.',
  },
  {
    icon: 'auto_awesome',
    title: 'AI Content Assistant',
    description: 'Let AI draft posts, generate hashtags, rewrite captions, and schedule everything automatically on your behalf.',
  },
  {
    icon: 'palette',
    title: 'Design with AI',
    description: 'Built-in visual editor and AI image generation to create stunning social media graphics without leaving the platform.',
  },
  {
    icon: 'groups',
    title: 'Team Collaboration',
    description: 'Manage channels with your team. Delegate tasks, set approval workflows, and collaborate in real-time.',
  },
  {
    icon: 'bolt',
    title: 'Auto Actions',
    description: 'Auto-post, auto-engage, and auto-respond when milestones are hit. Maximize engagement for every piece of content.',
  },
  {
    icon: 'insights',
    title: 'Comprehensive Analytics',
    description: 'Track performance metrics across all channels. Learn from your data and optimize your social media strategy.',
  },
];

const platforms = [
  { name: 'Instagram', icon: '/icons/platforms/instagram.png', color: 'from-pink-500 to-purple-600' },
  { name: 'Facebook', icon: '/icons/platforms/facebook.png', color: 'from-blue-500 to-blue-700' },
  { name: 'LinkedIn', icon: '/icons/platforms/linkedin.png', color: 'from-blue-600 to-blue-800' },
  { name: 'TikTok', icon: '/icons/platforms/tiktok.png', color: 'from-gray-800 to-gray-900' },
  { name: 'YouTube', icon: '/icons/platforms/youtube.png', color: 'from-red-500 to-red-700' },
  { name: 'X / Twitter', icon: '/icons/platforms/x.png', color: 'from-gray-700 to-gray-900' },
  { name: 'Threads', icon: '/icons/platforms/threads.png', color: 'from-gray-600 to-gray-800' },
  { name: 'Reddit', icon: '/icons/platforms/reddit.png', color: 'from-orange-500 to-red-600' },
  { name: 'Discord', icon: '/icons/platforms/discord.png', color: 'from-indigo-500 to-purple-600' },
  { name: 'Slack', icon: '/icons/platforms/slack.png', color: 'from-green-400 to-green-600' },
  { name: 'Pinterest', icon: '/icons/platforms/pinterest.png', color: 'from-red-500 to-rose-600' },
  { name: 'Bluesky', icon: '/icons/platforms/bluesky.png', color: 'from-sky-400 to-blue-500' },
  { name: 'Mastodon', icon: '/icons/platforms/mastodon.png', color: 'from-purple-500 to-indigo-600' },
  { name: 'Telegram', icon: '/icons/platforms/telegram.png', color: 'from-blue-400 to-cyan-500' },
  { name: 'WhatsApp', icon: '/icons/platforms/whatsapp.png', color: 'from-green-500 to-emerald-600' },
  { name: 'WordPress', icon: '/icons/platforms/wordpress.png', color: 'from-gray-600 to-blue-800' },
  { name: 'Twitch', icon: '/icons/platforms/twitch.png', color: 'from-purple-500 to-violet-600' },
  { name: 'Medium', icon: '/icons/platforms/medium.png', color: 'from-gray-600 to-gray-800' },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 sm:pt-32 sm:pb-40">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[#628830]/10 blur-[150px]" />
          <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#7aaf38]/10 blur-[120px]" />
          <div className="absolute bottom-[10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[#a8d468]/10 blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex max-w-full items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] mb-8 animate-fade-in" style={{ opacity: 0, animationDelay: '0.3s', animationFillMode: 'forwards' }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7aaf38] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7aaf38]" />
            </span>
            <span className="text-xs sm:text-sm text-white/60 truncate">
              <span className="bg-gradient-to-r from-[#628830] to-[#7aaf38] bg-clip-text text-transparent font-semibold">New</span>
              <span className="text-white/40 ml-1">— AI-Powered Scheduling</span>
            </span>
          </div>

          <h1 className="text-[2.25rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6 animate-fade-in-up break-words" style={{ opacity: 0, animationDelay: '0.5s', animationFillMode: 'forwards' }}>
            Plan, generate, and{' '}
            <span className="bg-gradient-to-r from-[#628830] via-[#7aaf38] to-[#a8d468] bg-clip-text text-transparent">
              schedule posts
            </span>
            <br />
            automatically to 30+ networks
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.7s', animationFillMode: 'forwards' }}>
            SwiftsAI is the all-in-one agentic social media scheduling platform.
            Review and edit everything in a visual calendar. Let AI agents do the heavy lifting.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.9s', animationFillMode: 'forwards' }}>
            <Link
              href="/auth"
              className="group relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#628830] text-white font-semibold text-base hover:bg-[#7aaf38] transition-all duration-300 shadow-lg shadow-[#628830]/30"
            >
              Start for Free
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/10 text-white/70 font-semibold text-base hover:bg-white/5 hover:border-white/20 transition-all"
            >
              Log In
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </Link>
          </div>

          {/* Dashboard Preview */}
          <div className="relative mt-16 mx-auto max-w-5xl animate-fade-in-up" style={{ opacity: 0, animationDelay: '1.1s', animationFillMode: 'forwards' }}>
            <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-2 shadow-2xl">
              <div className="rounded-xl bg-[#0a0a0a] border border-white/[0.04] overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.04]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  <div className="ml-4 flex-1 max-w-md mx-auto">
                    <div className="h-6 rounded-md bg-white/[0.04] flex items-center justify-center">
                      <span className="text-[10px] text-white/20">ai.appswifts.com</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-px bg-white/[0.04]">
                  <div className="col-span-3 p-4 border-r border-white/[0.04] space-y-3">
                    <img src="/swiftai.png" alt="SwiftsAI" className="h-8 w-auto" />
                    <div className="space-y-2">
                      {['Calendar', 'Posts', 'Analytics', 'Media'].map((item) => (
                        <div key={item} className="h-7 rounded-md bg-white/[0.04] flex items-center px-3">
                          <span className="text-[10px] text-white/30">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-9 p-4 space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-5 w-24 rounded bg-white/[0.04]" />
                      <div className="flex gap-2">
                        <div className="h-7 w-20 rounded-md bg-white/[0.06]" />
                        <div className="h-7 w-20 rounded-md bg-[#628830]" />
                      </div>
                    </div>
                    {[70, 90, 60, 80].map((w, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/[0.04]" />
                        <div className="flex-1 h-8 rounded-lg bg-white/[0.04] flex items-center px-3">
                          <div className="h-2 rounded-full bg-[#628830]/40" style={{ width: `${w}%` }} />
                        </div>
                        <div className="w-8 h-6 rounded bg-white/[0.04]" />
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="h-16 rounded-lg bg-white/[0.04] p-2 space-y-1">
                          <div className="h-2 w-12 rounded bg-white/[0.06]" />
                          <div className="h-3 w-8 rounded bg-white/[0.06]" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative mt-3 sm:mt-0 sm:absolute sm:-bottom-6 sm:left-1/2 sm:-translate-x-1/2 flex flex-wrap sm:flex-nowrap justify-center items-center gap-3 sm:gap-8 rounded-2xl border border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl px-4 sm:px-8 py-4 shadow-2xl">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-[#628830]/60" />
                ))}
              </div>
              <div className="text-left">
                <div className="text-xs text-white/40">Active users</div>
                <div className="text-sm font-semibold">2,847+</div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-white/[0.06]" />
              <div className="text-left">
                <div className="text-xs text-white/40">Posts scheduled</div>
                <div className="text-sm font-semibold">142K+</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Strip */}
      <section className="relative py-16 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-8">Trusted by innovative teams</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-40">
            {['Stripe', 'Spotify', 'Netflix', 'Airbnb', 'Notion', 'Figma'].map((name) => (
              <div key={name} className="flex items-center gap-2 text-white/40">
                <div className="w-6 h-6 rounded bg-white/[0.06]" />
                <span className="text-sm font-semibold tracking-tight">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#628830]/5 blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              All the tools you need to grow
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-sm sm:text-base">
              Everything you need to plan, create, schedule, and analyze your social media presence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative p-6 sm:p-8 rounded-2xl border border-white/[0.04] bg-gradient-to-b from-white/[0.02] to-transparent hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-500"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#628830]/10 border border-[#628830]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#7aaf38] text-xl">{feature.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Channels */}
      <section className="relative py-20 sm:py-28 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Wide list of supported channels
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-sm sm:text-base">
              Harness the power of 30+ social media channels seamlessly integrated into SwiftsAI.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="flex flex-col items-center gap-2 p-3 cursor-default"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <img src={platform.icon} alt="" className="w-8 h-8" />
                </div>
                <span className="text-xs text-white/50 text-center truncate max-w-[72px]">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Command Bar */}
      <section className="relative py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#628830]/20 via-[#7aaf38]/20 to-[#a8d468]/20 rounded-2xl blur-xl" />
            <div className="relative flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#0a0a0a] border border-white/[0.08] shadow-2xl">
              <span className="material-symbols-outlined text-white/30 text-lg">search</span>
              <span className="flex-1 text-sm text-white/30">Schedule a post to Instagram and LinkedIn at 3pm...</span>
              <div className="hidden sm:flex items-center gap-1.5 ml-4">
                <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-white/[0.06] text-white/30 border border-white/[0.06]">⌘</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-white/[0.06] text-white/30 border border-white/[0.06]">K</kbd>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#628830]/10 blur-[150px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.1]">
            Ready to streamline your{' '}
            <span className="bg-gradient-to-r from-[#628830] via-[#7aaf38] to-[#a8d468] bg-clip-text text-transparent">
              social media workflow
            </span>
            ?
          </h2>
          <p className="text-white/40 max-w-xl mx-auto text-sm sm:text-base mb-10">
            Join thousands of teams using SwiftsAI to schedule, analyze, and engage with their audience.
            Get started for free.
          </p>
          <Link
            href="/auth"
            className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#628830] text-white font-semibold text-base hover:bg-[#7aaf38] transition-all duration-300 shadow-lg shadow-[#628830]/30"
          >
            Start for Free
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
