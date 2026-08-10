import { notFound } from "next/navigation";
import { AdminUserDetail } from "@/components/admin-user-detail";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";
import { getAdminUserDetail } from "@/lib/admin-users";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  let admin;
  try {
    admin = await getCurrentAdminUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) notFound();
    throw error;
  }
  if (!admin) notFound();

  const { userId } = await params;
  const user = await getAdminUserDetail(userId);
  if (!user) notFound();

  return <AdminUserDetail user={user} currentAdminId={admin.id} />;
}
