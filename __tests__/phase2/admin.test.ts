/**
 * Tests for admin validation schemas and audit log utilities.
 */

import { AdminActionSchema, AdminOrderPatchSchema } from '@/lib/validation';
import { createAuditLog } from '@/lib/audit';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit1' }),
    },
  },
}));

describe('AdminActionSchema', () => {
  it('accepts list action', () => {
    const result = AdminActionSchema.safeParse({ adminId: 'cladmin123abc456de', action: 'list' });
    expect(result.success).toBe(true);
  });

  it('accepts delete action with targetUserId', () => {
    const result = AdminActionSchema.safeParse({
      adminId: 'cladmin123abc456de',
      action: 'delete',
      targetUserId: 'cltarget123abc456',
    });
    expect(result.success).toBe(true);
  });

  it('accepts toggleOrganiser action', () => {
    const result = AdminActionSchema.safeParse({
      adminId: 'cladmin123abc456de',
      action: 'toggleOrganiser',
      targetUserId: 'cltarget123abc456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown action', () => {
    const result = AdminActionSchema.safeParse({
      adminId: 'cladmin123abc456de',
      action: 'superDelete',
    });
    expect(result.success).toBe(false);
  });
});

describe('AdminOrderPatchSchema', () => {
  it('accepts CONFIRMED status', () => {
    const result = AdminOrderPatchSchema.safeParse({
      adminId: 'cladmin123abc456de',
      status: 'CONFIRMED',
    });
    expect(result.success).toBe(true);
  });

  it('accepts CANCELLED status', () => {
    const result = AdminOrderPatchSchema.safeParse({
      adminId: 'cladmin123abc456de',
      status: 'CANCELLED',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = AdminOrderPatchSchema.safeParse({
      adminId: 'cladmin123abc456de',
      status: 'DELETED',
    });
    expect(result.success).toBe(false);
  });
});

describe('createAuditLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls prisma.auditLog.create with correct data', async () => {
    const { prisma } = require('@/lib/db');
    await createAuditLog({
      actorId: 'cladmin1',
      action: 'BAN_USER',
      entityType: 'user',
      entityId: 'cluser1',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'cladmin1',
        action: 'BAN_USER',
        entityType: 'user',
        entityId: 'cluser1',
      }),
    });
  });

  it('does not throw if Prisma throws (fire-and-forget)', async () => {
    const { prisma } = require('@/lib/db');
    prisma.auditLog.create.mockRejectedValueOnce(new Error('DB error'));
    await expect(
      createAuditLog({
        actorId: 'a',
        action: 'BAN_USER',
        entityType: 'user',
        entityId: 'b',
      })
    ).resolves.toBeUndefined();
  });
});
