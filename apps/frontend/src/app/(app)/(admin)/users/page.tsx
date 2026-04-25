import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { AdminUsers } from '@gitroom/frontend/components/admin/users/admin.users';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'SwiftsAI' : 'AppSwifts'} Admin - User Management`,
  description: '',
};

export default async function AdminUsersPage() {
  return <AdminUsers />;
}