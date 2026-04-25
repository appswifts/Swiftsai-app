import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { AdminOrganizations } from '@gitroom/frontend/components/admin/organizations/admin.organizations';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'SwiftsAI' : 'AppSwifts'} Admin - Organization Management`,
  description: '',
};

export default async function AdminOrganizationsPage() {
  return <AdminOrganizations />;
}