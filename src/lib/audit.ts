import "server-only";
import { getDb, schema as t } from "@/db";

export interface AuditEntry {
  /** Admin email, or 'public' (site visitors) / 'system' (webhooks, jobs). */
  actor: string;
  /** create | update | delete | login | login_failed | logout | lead | register | payment_created | payment_paid | payment_failed … */
  action: string;
  entityType: string;
  entityId?: string | number | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

const serialize = (v: unknown): string | null =>
  v === undefined || v === null ? null : JSON.stringify(v);

/**
 * Appends one immutable row to the audit log. The table has no update/delete
 * code paths anywhere in the app — treat it as append-only by construction.
 * Auditing must never break the mutation it documents, so failures only log.
 */
export function audit(entry: AuditEntry): void {
  try {
    getDb()
      .insert(t.auditLog)
      .values({
        at: new Date().toISOString(),
        actor: entry.actor,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId == null ? null : String(entry.entityId),
        beforeJson: serialize(entry.before),
        afterJson: serialize(entry.after),
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
      })
      .run();
  } catch (err) {
    console.error("[audit] failed to record entry:", entry.action, entry.entityType, err);
  }
}
