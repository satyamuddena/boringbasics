import { AdminAlert, AdminHeading } from "@/components/admin/ui";
import { SignedInDevices } from "@/components/admin/SignedInDevices";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Session management, on its own page under Administration.
 *
 * It used to hang off the bottom of Settings, outside that page's form — a
 * different kind of thing (an account action, taking effect immediately) sitting
 * under nine cards of site configuration that only apply when you press Save.
 */
export default async function DevicesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ revoked?: string }>;
}) {
  const [{ revoked }, admin] = await Promise.all([searchParams, requireAdmin()]);

  return (
    <>
      <AdminHeading title="Devices" />
      {revoked && (
        <AdminAlert tone="ok">
          That device has been signed out and will no longer receive booking notifications.
        </AdminAlert>
      )}
      <div className="max-w-3xl">
        <SignedInDevices userId={admin.id} />
      </div>
    </>
  );
}
