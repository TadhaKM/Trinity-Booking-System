/**
 * GET /api/auth/google/callback
 * Handles Google OAuth 2.0 callback, exchanges code for tokens,
 * fetches user profile, upserts user in DB, returns user session data.
 *
 * Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET in .env
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=google_cancelled`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
    return NextResponse.redirect(`${origin}/login?error=oauth_not_configured`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const tokens = await tokenRes.json();

    // Fetch Google user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const profile = await profileRes.json();
    const { email, name, picture } = profile;

    if (!email) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Restrict to TCD email addresses only
    if (!normalizedEmail.endsWith('@tcd.ie')) {
      return NextResponse.redirect(`${origin}/login?error=tcd_only`);
    }

    // Upsert user in DB — always sync the Google profile picture on every login
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      // Always update profile picture from Google so it stays current
      user = await prisma.user.update({
        where: { email: normalizedEmail },
        data: { profilePicture: picture || user.profilePicture },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name || email.split('@')[0],
          password: '',
          profilePicture: picture || null,
          isOrganiser: false,
          isAdmin: false,
        },
      });
    }

    // Encode user data as base64 and pass to client via redirect
    const userData = Buffer.from(
      JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        isOrganiser: user.isOrganiser,
        isAdmin: user.isAdmin,
        profilePicture: user.profilePicture || null,
      })
    ).toString('base64');

    // Redirect to a client-side page that stores user in Zustand and navigates home.
    // encodeURIComponent is required — base64 contains '+' which browsers decode as
    // a space in query params, corrupting the string and causing atob() to throw.
    return NextResponse.redirect(`${origin}/auth/google-success?data=${encodeURIComponent(userData)}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }
}
