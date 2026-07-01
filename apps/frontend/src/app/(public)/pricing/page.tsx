'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthPrice: number;
  yearPrice: number;
  maxChannels: number;
  imageGenerationCount: number;
  generateVideos: number;
  teamMembers: boolean;
  ai: boolean;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetch('/api/public/plans')
      .then((r) => r.json())
      .then((data) => setPlans(data?.plans || []))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-white/40 max-w-xl mx-auto text-lg">
          Start for free, upgrade when you grow. No hidden fees.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.filter(p => p.name !== 'FREE').map((plan) => (
          <div
            key={plan.id}
            className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col"
          >
            <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
            <p className="text-sm text-white/40 mb-6">{plan.description}</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold">${plan.monthPrice}</span>
              <span className="text-white/40 text-sm">/mo</span>
            </div>
            <ul className="space-y-3 text-sm text-white/60 mb-8 flex-1">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {plan.maxChannels} channels
              </li>
              <li className="flex items-center gap-2">
                <span className={`${plan.ai ? 'text-green-400' : 'text-white/20'}`}>✓</span> AI content generation
              </li>
              <li className="flex items-center gap-2">
                <span className={`${plan.imageGenerationCount > 0 ? 'text-green-400' : 'text-white/20'}`}>✓</span> {plan.imageGenerationCount} AI images/mo
              </li>
              <li className="flex items-center gap-2">
                <span className={`${plan.teamMembers ? 'text-green-400' : 'text-white/20'}`}>✓</span> Team collaboration
              </li>
            </ul>
            <Link
              href="/auth"
              className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
