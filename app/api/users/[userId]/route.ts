import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const data = await request.json();

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate profilePicture size (base64 ~1.37x original)
    if (data.profilePicture && data.profilePicture.length > 3 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Profile picture is too large. Max 2MB.' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profilePicture: data.profilePicture ?? undefined,
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      isOrganiser: updatedUser.isOrganiser,
      profilePicture: updatedUser.profilePicture,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
