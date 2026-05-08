import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SwiftsAI - The Agentic Social Media Scheduling Platform',
  description:
    'Schedule, analyze, and engage with your audience across 30+ social media channels. AI-powered content generation, team collaboration, and comprehensive analytics — all in one platform.',
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

const channels = [
  'Facebook', 'Instagram', 'Threads', 'LinkedIn', 'X / Twitter',
  'TikTok', 'YouTube', 'Google My Business', 'Reddit', 'Telegram',
  'Discord', 'Slack', 'Pinterest', 'Dribbble', 'Mastodon',
  'Bluesky', 'Twitch', 'Kick', 'WordPress', 'Medium',
  'Hashnode', 'Dev.to', 'Nostr', 'Lemmy', 'WhatsApp',
];

const features = [
  {
    icon: '📅',
    title: 'Seamless Scheduling',
    description:
      'Schedule, analyze, and engage with your audience. Cross-post your social media content into multiple channels from one visual calendar.',
  },
  {
    icon: '🤖',
    title: 'AI Content Assistant',
    description:
      'Improve your content creation process with an AI agent that drafts posts, generates hashtags, rewrites captions, and schedules — all on your behalf.',
  },
  {
    icon: '🎨',
    title: 'Design with AI',
    description:
      'Use a built-in Canva-like editor and AI image generation to create stunning visuals for your social media posts.',
  },
  {
    icon: '👥',
    title: 'Team Collaboration',
    description:
      'Manage social media channels with ease. Collaborate with your team, delegate tasks, and set approval workflows.',
  },
  {
    icon: '⚡',
    title: 'Auto Actions',
    description:
      'SwiftsAI will auto-post, auto-engage, and auto-respond when you reach milestones — maximizing engagement for every piece of content.',
  },
  {
    icon: '📊',
    title: 'Comprehensive Analytics',
    description:
      'Learn from your data and improve your social media strategy. Track performance metrics and optimize your content across all channels.',
  },
];

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-40%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#6366f1]/10 blur-[120px]" />
          <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#a855f7]/8 blur-[100px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Trusted by teams worldwide
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Plan, generate, and{' '}
            <span className="bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] bg-clip-text text-transparent">
              schedule posts
            </span>{' '}
            automatically to 30+ networks
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            SwiftsAI is the all-in-one agentic social media scheduling platform.
            Review and edit everything in a visual calendar. Let AI agents do the
            heavy lifting.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-[#6366f1]/20"
            >
              Start for Free
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-3.5 rounded-xl border border-white/10 text-white/70 font-semibold text-base hover:bg-white/5 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            All the tools for social media growth in one place
          </h2>
          <p className="text-white/40 max-w-xl mx-auto">
            Everything you need to plan, create, schedule, and analyze your social media presence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Channels */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Wide list of supported channels
          </h2>
          <p className="text-white/40 max-w-xl mx-auto">
            Harness the power of 30+ social media channels seamlessly integrated into SwiftsAI.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {channels.map((channel) => (
            <span
              key={channel}
              className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/5 text-sm text-white/50 hover:border-[#6366f1]/40 hover:text-white/80 transition-all cursor-default"
            >
              {channel}
            </span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="p-12 rounded-3xl bg-gradient-to-br from-[#6366f1]/10 to-[#a855f7]/10 border border-white/5">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Grow your social media presence with SwiftsAI
          </h2>
          <p className="text-white/40 mb-8 max-w-lg mx-auto">
            Schedule, analyze, and engage with your audience. Get started for free today.
          </p>
          <Link
            href="/auth"
            className="inline-flex px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-[#6366f1]/20"
          >
            Start for Free
          </Link>
        </div>
      </section>
    </div>
  );
}
