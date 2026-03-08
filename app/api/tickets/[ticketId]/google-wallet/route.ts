import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import jwt from 'jsonwebtoken';

/**
 * GET /api/tickets/[ticketId]/google-wallet?userId=xxx
 *
 * Returns a Google Wallet "Add to Wallet" URL containing a signed JWT.
 *
 * Required env vars:
 *   GOOGLE_WALLET_ISSUER_ID        – your numeric issuer ID from Google Pay & Wallet Console
 *   GOOGLE_WALLET_SERVICE_ACCOUNT  – service account email
 *   GOOGLE_WALLET_PRIVATE_KEY      – service account private key (PEM, newlines as \n)
 *
 * Setup guide:
 *   1. Go to https://pay.google.com/business/console → Wallet API
 *   2. Create an Issuer ID and an "Event Ticket" pass class (classId = "TcdTicketsEvent")
 *   3. Create a Service Account in Google Cloud, give it "Wallet Object Issuer" role
 *   4. Download the service account JSON, paste email + private_key into .env
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const ip = getClientIp(request);
  const rl = rateLimit('google-wallet', ip, LIMITS.GENERAL.limit, LIMITS.GENERAL.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  const { ticketId } = await params;
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  // ── Env check ───────────────────────────────────────────────────────────────
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const serviceAccount = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT;
  const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!issuerId || !serviceAccount || !privateKey) {
    return NextResponse.json(
      { error: 'Google Wallet not configured. Set GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT, and GOOGLE_WALLET_PRIVATE_KEY in .env.' },
      { status: 501 }
    );
  }

  // ── Fetch ticket ─────────────────────────────────────────────────────────────
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      ticketType: true,
      order: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          event: {
            include: {
              society: { select: { name: true } },
            },
          },
        },
      },
    },
  }).catch(() => null);

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }
  if (ticket.order.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const event = ticket.order.event;
  const user = ticket.order.user;

  // ── Build Google Wallet pass object ──────────────────────────────────────────
  const classId = `${issuerId}.TcdTicketsEvent`;
  const objectId = `${issuerId}.ticket_${ticket.id}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tcd-tickets.vercel.app';

  const startIso = new Date(event.startDate).toISOString();
  const [datePart, timePart] = startIso.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  const passObject = {
    id: objectId,
    classId,
    state: ticket.isRefunded ? 'INACTIVE' : 'ACTIVE',

    // ── Ticket holder ──────────────────────────────────────────────────────────
    ticketHolderName: user.name,
    ticketNumber: ticket.id.slice(-8).toUpperCase(),

    // ── Event info ─────────────────────────────────────────────────────────────
    reservationInfo: {
      confirmationCode: ticket.id.slice(-8).toUpperCase(),
    },

    // ── Barcode ────────────────────────────────────────────────────────────────
    barcode: {
      type: 'QR_CODE',
      value: ticket.qrCode,
      alternateText: ticket.id.slice(-8).toUpperCase(),
    },

    // ── Event dates ────────────────────────────────────────────────────────────
    validTimeInterval: {
      start: {
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
      },
    },

    // ── Venue ──────────────────────────────────────────────────────────────────
    venue: {
      name: { defaultValue: { language: 'en-IE', value: event.location } },
    },

    // ── Logo ───────────────────────────────────────────────────────────────────
    logo: {
      sourceUri: { uri: `${siteUrl}/icons/icon-192.png` },
      contentDescription: { defaultValue: { language: 'en-IE', value: 'TCD Tickets' } },
    },

    // ── Hero image (only if it's a real URL, not base64) ──────────────────────
    ...(event.imageUrl && !event.imageUrl.startsWith('data:') && {
      heroImage: {
        sourceUri: { uri: event.imageUrl },
        contentDescription: { defaultValue: { language: 'en-IE', value: event.title } },
      },
    }),

    // ── Card title / header ───────────────────────────────────────────────────
    cardTitle: {
      defaultValue: { language: 'en-IE', value: 'TCD Tickets' },
    },
    eventName: {
      defaultValue: { language: 'en-IE', value: event.title },
    },

    // ── Text modules ───────────────────────────────────────────────────────────
    textModulesData: [
      {
        id: 'ticket_type',
        header: 'Ticket Type',
        body: ticket.ticketType.name,
      },
      {
        id: 'organiser',
        header: 'Organiser',
        body: event.society?.name ?? 'TCD',
      },
      {
        id: 'price',
        header: 'Price Paid',
        body: ticket.price === 0 ? 'Free' : `€${ticket.price.toFixed(2)}`,
      },
    ],

    // ── Links ──────────────────────────────────────────────────────────────────
    linksModuleData: {
      uris: [
        {
          uri: `${siteUrl}/events/${event.id}`,
          description: 'View Event',
          id: 'event_link',
        },
        {
          uri: `${siteUrl}/tickets/${ticket.id}/card`,
          description: 'My Ticket',
          id: 'ticket_link',
        },
      ],
    },
  };

  // ── Sign JWT ─────────────────────────────────────────────────────────────────
  const claims = {
    iss: serviceAccount,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      eventTicketObjects: [passObject],
    },
    origins: [siteUrl],
  };

  let token: string;
  try {
    token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
  } catch (err) {
    console.error('[google-wallet] JWT sign failed:', err);
    return NextResponse.json({ error: 'Failed to generate wallet pass' }, { status: 500 });
  }

  const addToWalletUrl = `https://pay.google.com/gp/v/save/${token}`;
  return NextResponse.json({ url: addToWalletUrl });
}
