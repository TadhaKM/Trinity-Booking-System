/**
 * POST /api/events/create
 *
 * Security hardening applied:
 *  - Zod schema validation (CreateEventSchema) — OWASP A03
 *  - Strict field limits & type coercion — OWASP A03
 *  - No internal error details leaked to caller — OWASP A05
 *  - Organiser permission verified server-side — OWASP A01
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateEventSchema, zodErrors } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // ── 1. Parse & validate input ─────────────────────────────────────────────
    const body = await request.json();
    const parsed = CreateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodErrors(parsed) },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      societyId,
      startDate,
      endDate,
      location,
      category,
      imageUrl,
      tags,
      ticketTypes,
      organiserId,
    } = parsed.data;

    // ── 2. Verify organiser ───────────────────────────────────────────────────
    const organiser = await prisma.user.findUnique({
      where: { id: organiserId },
    });

    if (!organiser) {
      return NextResponse.json(
        { error: 'Your account was not found. Please log in again.' },
        { status: 404 }
      );
    }

    if (!organiser.isOrganiser && !organiser.isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to create events.' },
        { status: 403 }
      );
    }

    // ── 3. Resolve society ────────────────────────────────────────────────────
    // If societyId matches an existing society ID, use it.
    // Otherwise treat it as a name — find by name or create a new society.
    let society = await prisma.society.findUnique({
      where: { id: societyId },
    });

    let resolvedSocietyId = societyId;

    if (!society) {
      const existingByName = await prisma.society.findFirst({
        where: { name: { equals: societyId } },
      });

      if (existingByName) {
        society = existingByName;
        resolvedSocietyId = existingByName.id;
      } else {
        society = await prisma.society.create({
          data: {
            name: societyId.trim(),
            description: 'Society created by organiser',
            category: category || 'Other',
            imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c8f1?w=800',
            location: '{}',
          },
        });
        resolvedSocietyId = society.id;
      }
    }

    // ── 4. Create event ───────────────────────────────────────────────────────
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : '[]';

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        societyId: resolvedSocietyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate || startDate),
        location: location.trim(),
        locationCoords: society.location,
        category: category || 'Arts & Culture',
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        tags: tagsJson,
        organiserId,
        ticketTypes: {
          create: ticketTypes.map((tt) => ({
            name: tt.name.trim(),
            price: tt.price,
            quantity: tt.quantity,
            available: tt.quantity,
          })),
        },
      },
      include: {
        ticketTypes: true,
        society: true,
      },
    });

    return NextResponse.json(event);
  } catch (error: any) {
    console.error('Error creating event:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An event with this information already exists.' },
        { status: 400 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference: the society or organiser does not exist.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create event. Please try again.' },
      { status: 500 }
    );
  }
}
