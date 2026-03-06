/**
 * GET /api/auth/google
 * Initiates Google OAuth 2.0 authorization flow.
 * Redirects user to Google's consent screen.
 *
 * To enable: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
    // Google OAuth not yet configured — show a friendly page
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Google Sign-In — Coming Soon</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #EFF2F7; margin: 0; }
    .card { background: white; border-radius: 1.5rem; padding: 2.5rem; max-width: 420px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.08); }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { color: #0A2E6E; font-size: 1.5rem; font-weight: 800; margin: 0 0 0.75rem; }
    p { color: #64748b; line-height: 1.6; margin: 0 0 1.5rem; }
    code { background: #f1f5f9; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.85em; }
    a { display: inline-block; background: #0A2E6E; color: white; text-decoration: none; padding: 0.75rem 2rem; border-radius: 9999px; font-weight: 700; font-size: 0.9rem; }
    a:hover { background: #1A6FEF; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔐</div>
    <h1>Google Sign-In Coming Soon</h1>
    <p>Google OAuth is not yet configured. Add your <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to <code>.env</code> to enable this feature.</p>
    <a href="/login">← Back to Login</a>
  </div>
</body>
</html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
