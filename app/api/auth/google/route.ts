/**
 * POST /api/auth/google
 * Exchange Emergent session_id for user data, create/update user in DB
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Exchange session_id with Emergent Auth
    const authRes = await fetch(
      'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
      { headers: { 'X-Session-ID': sessionId } }
    );

    if (!authRes.ok) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const googleData = await authRes.json();
    const { email, name, picture } = googleData;

    if (!email) {
      return NextResponse.json({ error: 'No email returned from Google' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      // Update profile picture if they didn't have one
      if (!user.profilePicture && picture) {
        user = await prisma.user.update({
          where: { email: normalizedEmail },
          data: { profilePicture: picture },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name || email.split('@')[0],
          password: '', // Google auth users don't have a password
          profilePicture: picture || null,
          isOrganiser: false,
          isAdmin: false,
        },
      });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isOrganiser: user.isOrganiser,
      isAdmin: user.isAdmin,
      profilePicture: user.profilePicture || null,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
