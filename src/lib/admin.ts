import "server-only";
import { requireAdmin, requestMeta, type AdminUser } from "./auth";
import { audit } from "./audit";

/**
 * Standard wrapper for admin server actions: enforces auth, runs the mutation,
 * and writes one audit row with before/after snapshots.
 */
export async function auditedMutation<T>(opts: {
  action: "create" | "update" | "delete";
  entityType: string;
  run: (admin: AdminUser) => T | Promise<T>;
  /** Snapshot fetchers — called around the mutation. */
  before?: () => unknown;
  entityId?: (result: T) => string | number | null | undefined;
  after?: (result: T) => unknown;
}): Promise<T> {
  const admin = await requireAdmin();
  const before = opts.before?.();
  const result = await opts.run(admin);
  const meta = await requestMeta();
  audit({
    actor: admin.email,
    action: opts.action,
    entityType: opts.entityType,
    entityId: opts.entityId?.(result) ?? null,
    before,
    after: opts.after?.(result),
    ...meta,
  });
  return result;
}
