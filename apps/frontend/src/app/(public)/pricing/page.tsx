'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useFetch();

  useEffect(() => {
    let active = true;

    request('/public/plans')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load plans (${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setPlans(Array.isArray(data) ? data : data?.plans || []);
        setError('');
      })
      .catch(() => {
        if (active) {
          setError(
            'Pricing is temporarily unavailable. Please try again shortly.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [request]);

  const paidPlans = plans.filter((plan) => plan.name !== 'FREE');

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

      {loading && (
        <div
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          aria-label="Loading pricing plans"
          aria-busy="true"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-[420px] animate-pulse rounded-xl border border-white/5 bg-white/[0.02]"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="mx-auto max-w-xl rounded-xl border border-amber-400/20 bg-amber-400/5 p-6 text-center"
        >
          <h2 className="text-lg font-semibold">We could not load pricing</h2>
          <p className="mt-2 text-sm text-white/60">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-md bg-[#628830] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7aaf38] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#7aaf38]/40"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && paidPlans.length === 0 && (
        <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <h2 className="text-lg font-semibold">Plans are being prepared</h2>
          <p className="mt-2 text-sm text-white/60">
            Create a free account now, or contact us if you need a custom plan.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth"
              className="rounded-md bg-[#628830] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7aaf38]"
            >
              Start for free
            </Link>
            <a
              href="mailto:support@appswifts.com"
              className="rounded-md border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5"
            >
              Contact support
            </a>
          </div>
        </div>
      )}

      {!loading && !error && paidPlans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {paidPlans.map((plan) => (
            <div
              key={plan.id}
              className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col"
            >
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <p className="text-sm text-white/40 mb-6">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">
                  ${plan.monthPrice}
                </span>
                <span className="text-white/40 text-sm">/mo</span>
              </div>
              <ul className="space-y-3 text-sm text-white/60 mb-8 flex-1">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> {plan.maxChannels}{' '}
                  channels
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className={`${
                      plan.ai ? 'text-green-400' : 'text-white/20'
                    }`}
                  >
                    ✓
                  </span>{' '}
                  AI content generation
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className={`${
                      plan.imageGenerationCount > 0
                        ? 'text-green-400'
                        : 'text-white/20'
                    }`}
                  >
                    ✓
                  </span>{' '}
                  {plan.imageGenerationCount} AI images/mo
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className={`${
                      plan.teamMembers ? 'text-green-400' : 'text-white/20'
                    }`}
                  >
                    ✓
                  </span>{' '}
                  Team collaboration
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
      )}
    </div>
  );
}
