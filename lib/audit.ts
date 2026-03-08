/**
 * Audit log helper — fire-and-forget, never throws.
 * Records sensitive admin/organiser actions for accountability.
 */

import { prisma } from '@/lib/db';

interface AuditLogParams {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (err) {
    console.error('Audit log write failed:', err);
  }
}
