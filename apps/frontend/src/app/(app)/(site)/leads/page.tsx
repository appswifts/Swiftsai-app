import { Metadata } from 'next';
import { LeadsPage } from '@gitroom/frontend/components/leads/leads.page';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'SwiftsAI' : 'AppSwifts'} - Leads Center`,
  description: 'Manage and track your leads across all platforms',
};

export default function Leads() {
  return <LeadsPage />;
}
