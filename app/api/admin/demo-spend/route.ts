/**
 * GET /api/admin/demo-spend
 * Returns current AI API spend for the demo. Admin-only.
 *
 * Query param: ?adminKey=YOUR_ADMIN_KEY  (set DEMO_ADMIN_KEY in env, or defaults to "tcdadmin")
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSpendSummary } from '@/lib/demo-spend';

export async function GET(request: NextRequest) {
  const adminKey = request.nextUrl.searchParams.get('adminKey');
  const expectedKey = process.env.DEMO_ADMIN_KEY || 'tcdadmin';

  if (adminKey !== expectedKey) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const summary = await getSpendSummary();
  return NextResponse.json(summary);
}
