import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { adminId, action, targetUserId, data } = await request.json();

    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // List all users
    if (action === 'list') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          isOrganiser: true,
          isAdmin: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(users);
    }

    // Delete user
    if (action === 'delete' && targetUserId) {
      if (targetUserId === adminId) {
        return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
      }
      await prisma.user.delete({ where: { id: targetUserId } });
      return NextResponse.json({ success: true });
    }

    // Toggle organiser
    if (action === 'toggleOrganiser' && targetUserId) {
      const user = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { isOrganiser: !user.isOrganiser },
      });
      return NextResponse.json({ isOrganiser: updated.isOrganiser });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
