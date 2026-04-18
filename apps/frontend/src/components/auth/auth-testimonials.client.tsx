'use client';

import { TestimonialComponent } from '@gitroom/frontend/components/auth/testimonial.component';

export function AuthTestimonialsClient() {
  return (
    <div
      suppressHydrationWarning
      className="text-[36px] flex-1 pt-[88px] hidden lg:flex flex-col items-center"
    >
      <div suppressHydrationWarning className="text-center">
        Over <span className="text-[42px] text-[#7aaf38]">20,000+</span>{' '}
        Entrepreneurs use
        <br />
        Swifts AI To Grow Their Social Presence
      </div>
      <TestimonialComponent />
    </div>
  );
}
