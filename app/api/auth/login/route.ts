import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate inputs
    if (!email || !password) {
      // Deliberate delay to prevent timing attacks
      await new Promise((r) => setTimeout(r, 300));
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Generic error - don't reveal whether account exists
    if (!user || user.password !== password) {
      // Deliberate delay to prevent timing attacks
      await new Promise((r) => setTimeout(r, 300));
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Return user data (without password)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isOrganiser: user.isOrganiser,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
