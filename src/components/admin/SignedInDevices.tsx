import { desc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminCard } from "@/components/admin/ui";
import { currentSessionTokenHash } from "@/lib/auth";
import { deviceLabel } from "@/lib/deviceLabel";
import { ageLabel, fullDateTime } from "@/lib/bookingProgress";
import { revokeSessionAction } from "@/app/admin/(panel)/devices/actions";

/**
 * Every browser currently signed in as this admin, with a way to sign one out
 * remotely. This is the answer to a lost phone: revoking takes the device's
 * booking notifications with it, so client names stop appearing on a lock
 * screen you no longer control.
 */
export async function SignedInDevices({ userId }: { userId: number }) {
  const db = getDb();
  const sessions = db
    .select()
    .from(t.sessions)
    .where(eq(t.sessions.userId, userId))
    .orderBy(desc(t.sessions.createdAt))
    .all();
  const thisDevice = await currentSessionTokenHash();

  // Which of these devices will actually buzz — worth showing, because it is
  // the thing revoking is meant to stop.
  const notifying = new Set(
    db
      .select({ hash: t.pushSubscriptions.sessionTokenHash })
      .from(t.pushSubscriptions)
      .where(eq(t.pushSubscriptions.userId, userId))
      .all()
      .map((row) => row.hash)
      .filter((hash): hash is string => Boolean(hash)),
  );

  return (
    <AdminCard title="Signed-in devices">
      <p className="mb-4 text-sm text-muted">
        Signing a device out here ends its session and stops its booking notifications
        immediately. Use it if a phone is lost.
      </p>
      <ul className="divide-y divide-line">
        {sessions.map((session) => {
          const isCurrent = session.tokenHash === thisDevice;
          return (
            <li
              key={session.tokenHash}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {deviceLabel(session.userAgent)}
                  {isCurrent && (
                    <span className="ml-2 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                      This device
                    </span>
                  )}
                  {notifying.has(session.tokenHash) && (
                    <span className="ml-2 rounded-full border border-ok/40 bg-ok/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ok">
                      Notifications on
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {session.ip ?? "unknown IP"} · signed in {ageLabel(session.createdAt)}
                  {session.lastUsedAt ? ` · last used ${ageLabel(session.lastUsedAt)}` : ""}
                </p>
                <p className="text-xs text-muted/70" title={fullDateTime(session.expiresAt)}>
                  Stays signed in until {fullDateTime(session.expiresAt)} unless used again
                </p>
              </div>
              <form action={revokeSessionAction} className="shrink-0">
                <input type="hidden" name="tokenHash" value={session.tokenHash} />
                <button
                  type="submit"
                  className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-bad hover:text-bad"
                >
                  {isCurrent ? "Sign out here" : "Sign out"}
                </button>
              </form>
            </li>
          );
        })}
        {sessions.length === 0 && (
          <li className="py-3 text-sm text-muted">No other devices are signed in.</li>
        )}
      </ul>
    </AdminCard>
  );
}
