'use client';

import { createContext, FC, ReactNode, useContext } from 'react';
import { User } from '@prisma/client';
import { usePlans } from '@gitroom/frontend/lib/use-plans.hook';

export interface TierInfo {
  id?: string;
  current: string;
  month_price: number;
  year_price: number;
  channel?: number;
  posts_per_month: number;
  team_members: boolean;
  max_organizations: number;
  max_platforms: number;
  community_features: boolean;
  featured_by_appswifts: boolean;
  ai: boolean;
  import_from_channels: boolean;
  image_generator?: boolean;
  image_generation_count: number;
  generate_videos: number;
  public_api: boolean;
  webhooks: number;
  autoPost: boolean;
  inbox: boolean;
  campaigns: boolean;
  leads: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}

export const UserContext = createContext<
  | undefined
  | (User & {
      orgId: string;
      tier: TierInfo;
      publicApi: string;
      role: 'USER' | 'ADMIN' | 'SUPERADMIN';
      totalChannels: number;
      isLifetime?: boolean;
      impersonate: boolean;
      allowTrial: boolean;
      isTrailing: boolean;
      streakSince: string | null;
    })
>(undefined);
export const ContextWrapper: FC<{
  user: User & {
    orgId: string;
    tier: 'FREE' | 'STANDARD' | 'PRO' | 'ULTIMATE' | 'TEAM';
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
    publicApi: string;
    totalChannels: number;
  };
  children: ReactNode;
}> = ({ user, children }) => {
  const { plans } = usePlans();
  const defaultFree: TierInfo = {
    current: 'FREE', month_price: 0, year_price: 0, posts_per_month: 0,
    team_members: false, max_organizations: 1, max_platforms: 0,
    community_features: false, featured_by_appswifts: false, ai: false,
    import_from_channels: false, image_generation_count: 0, generate_videos: 0,
    public_api: false, webhooks: 0, autoPost: false, inbox: false,
    campaigns: false, leads: false, isDefault: true, isActive: true,
  };
  const tierData = plans?.[user?.tier] as TierInfo | undefined;

  const values = user
    ? {
        ...user,
        tier: tierData || defaultFree,
      }
    : ({} as any);
  return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};
export const useUser = () => useContext(UserContext);
