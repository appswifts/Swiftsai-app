import { Metadata } from 'next';
import { CampaignsPage } from '@gitroom/frontend/components/campaigns/campaigns.page';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'SwiftsAI' : 'AppSwifts'} - Campaigns`,
  description: '',
};

export default function Campaigns() {
  return <CampaignsPage />;
}
