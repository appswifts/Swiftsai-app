import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { AdminDashboard } from '@gitroom/frontend/components/admin/dashboard/admin.dashboard';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'SwiftsAI' : 'AppSwifts'} Admin Dashboard`,
  description: '',
};

export default async function AdminPage() {
  return <AdminDashboard />;
}