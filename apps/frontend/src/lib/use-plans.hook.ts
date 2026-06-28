import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

interface PlanRecord {
  id: string;
  name: string;
  monthPrice: number;
  yearPrice: number;
  maxChannels: number;
  postsPerMonth: number;
  teamMembers: boolean;
  maxOrganizations: number;
  maxPlatforms: number;
  communityFeatures: boolean;
  featuredByAppswifts: boolean;
  ai: boolean;
  importFromChannels: boolean;
  imageGenerator: boolean;
  imageGenerationCount: number;
  generateVideos: number;
  publicApi: boolean;
  webhooks: number;
  autoPost: boolean;
  inbox: boolean;
  campaigns: boolean;
  leads: boolean;
  isDefault: boolean;
  isActive: boolean;
}

export const usePlans = () => {
  const fetch = useFetch();
  const { data, error } = useSWR<PlanRecord[]>('plans', async () => {
    return (await fetch('/public/plans')).json();
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 60000,
  });

  const planMap: Record<string, any> = {};
  if (data) {
    for (const plan of data) {
      planMap[plan.name] = {
        id: plan.id,
        current: plan.name,
        month_price: plan.monthPrice,
        year_price: plan.yearPrice,
        channel: plan.maxChannels,
        posts_per_month: plan.postsPerMonth,
        team_members: plan.teamMembers,
        max_organizations: plan.maxOrganizations,
        max_platforms: plan.maxPlatforms,
        community_features: plan.communityFeatures,
        featured_by_appswifts: plan.featuredByAppswifts,
        ai: plan.ai,
        import_from_channels: plan.importFromChannels,
        image_generator: plan.imageGenerator,
        image_generation_count: plan.imageGenerationCount,
        generate_videos: plan.generateVideos,
        public_api: plan.publicApi,
        webhooks: plan.webhooks,
        autoPost: plan.autoPost,
        inbox: plan.inbox,
        campaigns: plan.campaigns,
        leads: plan.leads,
        isDefault: plan.isDefault,
        isActive: plan.isActive,
      };
    }
  }

  return { plans: data ? planMap : null, loading: !data && !error, error };
};
