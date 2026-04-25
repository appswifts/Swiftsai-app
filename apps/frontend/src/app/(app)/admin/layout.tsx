import { AdminLayoutComponent } from '@gitroom/frontend/components/admin/layout/admin.layout.component';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutComponent>{children}</AdminLayoutComponent>;
}