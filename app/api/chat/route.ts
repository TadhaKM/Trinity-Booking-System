/**
 * POST /api/chat
 *
 * Security hardening applied:
 *  - IP-based rate limiting (20 req/min) — OWASP A07
 *  - Zod schema validation (ChatRequestSchema) — OWASP A03
 *  - Server-side auth resolution — never trusts client role — OWASP A01
 *  - Tool filtering by role — OWASP A01
 *  - ANTHROPIC_API_KEY never exposed to client — OWASP A02
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { chatTools, filterToolsByRole } from '@/lib/chat-tools';
import { buildSystemPrompt, AuthContext } from '@/lib/chat-system-prompt';
import { rateLimit, getClientIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { ChatRequestSchema, zodErrors } from '@/lib/validation';
import { isAiDisabled, addApiUsage } from '@/lib/demo-spend';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit('chat', ip, LIMITS.CHAT.limit, LIMITS.CHAT.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfterMs);

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Chat is not configured. Missing ANTHROPIC_API_KEY.' },
        { status: 500 }
      );
    }

    // ── 1b. Global demo budget check ($25 cap across all users) ──────────────
    if (await isAiDisabled()) {
      return NextResponse.json({
        message:
          "The AI assistant has been disabled for this demo — the $15 API credit included with the demo has been fully used. All other features of the site still work. Thanks for exploring TCD Tickets!",
        actions: [],
      });
    }

    // ── 2. Parse & validate input ─────────────────────────────────────────────
    const body = await request.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodErrors(parsed) },
        { status: 400 }
      );
    }

    const { messages, userId } = parsed.data;

    // ── 3. Resolve auth context from DB ──────────────────────────────────────
    const authContext = await resolveAuthContext(userId);

    // ── 4. Demo message caps ──────────────────────────────────────────────────
    const userMessageCount = messages.filter((m) => m.role === 'user').length;

    if (authContext.role === 'guest') {
      authContext.guestMessageCount = userMessageCount;
      if (userMessageCount > 2) {
        return NextResponse.json({
          message:
            "You've reached the guest message limit. Please sign in or create an account to continue chatting!",
          actions: [{ type: 'NAVIGATE', payload: { path: '/login' } }],
        });
      }
    }

    // Demo cap: 5 messages for logged-in users
    const DEMO_MSG_LIMIT = 5;
    if (authContext.role !== 'guest' && userMessageCount > DEMO_MSG_LIMIT) {
      return NextResponse.json({
        message:
          "That's all for the demo version! You've used all 5 AI messages included with this demo account. In the full version, there's no limit — enjoy exploring the rest of the app!",
        actions: [],
      });
    }

    // ── 5. Build system prompt & filter tools by role ─────────────────────────
    const systemPrompt = buildSystemPrompt(authContext);
    const allowedTools = filterToolsByRole(authContext.role);

    // ── 6. Format messages for Claude API ────────────────────────────────────
    const claudeMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // ── 7. Call Claude with agentic tool loop (max 3 iterations) ─────────────
    let finalText = '';
    const allActions: any[] = [];
    let currentMessages = [...claudeMessages];
    let iterations = 0;
    const MAX_ITERATIONS = 3;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        tools: allowedTools.length > 0 ? allowedTools : undefined,
        messages: currentMessages,
      });

      // Accumulate token usage across all loop iterations
      totalInputTokens  += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Collect text and tool_use blocks
      let hasToolUse = false;
      const toolUseBlocks: any[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          finalText = block.text;
        } else if (block.type === 'tool_use') {
          hasToolUse = true;
          toolUseBlocks.push(block);
        }
      }

      // If no tool calls, we're done
      if (!hasToolUse) break;

      // Process each tool call
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolBlock of toolUseBlocks) {
        const result = await executeServerTool(toolBlock, authContext);

        if (result.clientAction) {
          allActions.push(result.clientAction);
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result.data),
        });
      }

      // Add the assistant response + tool results and loop for another Claude call
      currentMessages = [
        ...currentMessages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ];
    }

    // ── 8. Record token usage for demo budget tracking ───────────────────────
    await addApiUsage(totalInputTokens, totalOutputTokens);

    return NextResponse.json({
      message: finalText,
      actions: allActions,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message. Please try again.' },
      { status: 500 }
    );
  }
}

async function resolveAuthContext(userId?: string): Promise<AuthContext> {
  if (!userId) {
    return { role: 'guest' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { role: 'guest' };
    }

    // Admin gets full access to everything
    if (user.isAdmin) {
      const allSocieties = await prisma.society.findMany({
        select: { id: true, name: true },
      });

      return {
        role: 'admin',
        userId: user.id,
        userName: user.name,
        isAdmin: true,
        organiserSocieties: allSocieties,
        allSocieties,
      };
    }

    if (user.isOrganiser) {
      // Find which societies this organiser has created events for
      const events = await prisma.event.findMany({
        where: { organiserId: userId },
        select: { societyId: true },
        distinct: ['societyId'],
      });

      const societyIds = events.map((e) => e.societyId);
      const societies =
        societyIds.length > 0
          ? await prisma.society.findMany({
              where: { id: { in: societyIds } },
              select: { id: true, name: true },
            })
          : [];

      return {
        role: 'organiser',
        userId: user.id,
        userName: user.name,
        isAdmin: user.isAdmin,
        organiserSocieties: societies,
      };
    }

    return {
      role: 'customer',
      userId: user.id,
      userName: user.name,
      isAdmin: user.isAdmin,
    };
  } catch {
    return { role: 'guest' };
  }
}

function isClientActionTool(name: string): boolean {
  return [
    'navigate',
    'prepare_event_draft',
    'prepare_event_edit',
    'show_toast',
  ].includes(name);
}

async function executeServerTool(
  toolBlock: { name: string; input: any },
  authContext: AuthContext
): Promise<{ data: any; clientAction?: any }> {
  const { name, input } = toolBlock;

  switch (name) {
    // ──── Data tools (executed server-side) ────

    case 'search_events': {
      try {
        const where: any = { startDate: { gte: new Date() } };
        if (input.category) {
          where.category = { contains: input.category };
        }
        const events = await prisma.event.findMany({
          where,
          include: { society: true, ticketTypes: true },
          orderBy: { startDate: 'asc' },
          take: 10,
        });

        // Client-side text search filtering (SQLite doesn't support case-insensitive contains well)
        let filtered = events;
        if (input.query) {
          const q = input.query.toLowerCase();
          filtered = events.filter(
            (e) =>
              e.title.toLowerCase().includes(q) ||
              e.description.toLowerCase().includes(q) ||
              e.society.name.toLowerCase().includes(q) ||
              e.tags.toLowerCase().includes(q)
          );
        }

        return {
          data: filtered.map((e) => ({
            id: e.id,
            title: e.title,
            startDate: e.startDate.toISOString(),
            endDate: e.endDate.toISOString(),
            location: e.location,
            category: e.category,
            societyName: e.society.name,
            societyId: e.societyId,
            lowestPrice: e.ticketTypes.length > 0
              ? Math.min(...e.ticketTypes.map((tt) => tt.price))
              : 0,
            ticketsLeft: e.ticketTypes.reduce((sum, tt) => sum + tt.available, 0),
          })),
        };
      } catch {
        return { data: { error: 'Failed to search events' } };
      }
    }

    case 'search_societies': {
      try {
        const societies = await prisma.society.findMany({
          take: 20,
        });

        let filtered = societies;
        if (input.query) {
          const q = input.query.toLowerCase();
          filtered = societies.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.description.toLowerCase().includes(q) ||
              s.category.toLowerCase().includes(q)
          );
        }

        return {
          data: filtered.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            description: s.description.slice(0, 200),
          })),
        };
      } catch {
        return { data: { error: 'Failed to search societies' } };
      }
    }

    case 'fetch_event': {
      try {
        const event = await prisma.event.findUnique({
          where: { id: input.eventId },
          include: { society: true, ticketTypes: true, orders: true },
        });

        if (!event) return { data: { error: 'Event not found' } };

        return {
          data: {
            id: event.id,
            title: event.title,
            description: event.description,
            startDate: event.startDate.toISOString(),
            endDate: event.endDate.toISOString(),
            location: event.location,
            category: event.category,
            tags: event.tags,
            societyName: event.society.name,
            societyId: event.societyId,
            organiserId: event.organiserId,
            ticketTypes: event.ticketTypes.map((tt) => ({
              id: tt.id,
              name: tt.name,
              price: tt.price,
              quantity: tt.quantity,
              available: tt.available,
            })),
            totalOrders: event.orders.length,
          },
        };
      } catch {
        return { data: { error: 'Failed to fetch event' } };
      }
    }

    case 'fetch_society': {
      try {
        const society = await prisma.society.findUnique({
          where: { id: input.societyId },
          include: { events: { orderBy: { startDate: 'asc' }, take: 5 } },
        });

        if (!society) return { data: { error: 'Society not found' } };

        return {
          data: {
            id: society.id,
            name: society.name,
            category: society.category,
            description: society.description,
            upcomingEvents: society.events
              .filter((e) => e.startDate >= new Date())
              .map((e) => ({
                id: e.id,
                title: e.title,
                startDate: e.startDate.toISOString(),
                location: e.location,
              })),
          },
        };
      } catch {
        return { data: { error: 'Failed to fetch society' } };
      }
    }

    case 'fetch_organiser_stats': {
      if (authContext.role !== 'organiser' && authContext.role !== 'admin') {
        return { data: { error: 'Not authorised' } };
      }
      if (!authContext.userId) {
        return { data: { error: 'Not authorised' } };
      }

      try {
        // Admin sees ALL events; organiser sees only their own
        const where = authContext.role === 'admin' ? {} : { organiserId: authContext.userId };
        const events = await prisma.event.findMany({
          where,
          include: { ticketTypes: true, orders: true, society: true },
        });

        const totalEvents = events.length;
        const totalTicketsSold = events.reduce(
          (sum, e) => sum + e.ticketTypes.reduce((s, tt) => s + (tt.quantity - tt.available), 0),
          0
        );
        const totalRevenue = events.reduce(
          (sum, e) => sum + e.orders.reduce((s, o) => s + o.totalAmount, 0),
          0
        );
        const upcomingEvents = events.filter((e) => e.startDate >= new Date());

        return {
          data: {
            totalEvents,
            upcomingEvents: upcomingEvents.length,
            totalTicketsSold,
            totalRevenue: totalRevenue.toFixed(2),
            events: events.map((e) => ({
              id: e.id,
              title: e.title,
              societyName: e.society.name,
              startDate: e.startDate.toISOString(),
              ticketsSold: e.ticketTypes.reduce((s, tt) => s + (tt.quantity - tt.available), 0),
              revenue: e.orders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2),
            })),
          },
        };
      } catch {
        return { data: { error: 'Failed to fetch stats' } };
      }
    }

    // ──── Client action tools (returned to frontend) ────

    case 'navigate': {
      return {
        data: { status: 'ok', navigatingTo: input.path },
        clientAction: { type: 'NAVIGATE', payload: { path: input.path, label: input.label } },
      };
    }

    case 'show_toast': {
      return {
        data: { status: 'ok' },
        clientAction: {
          type: 'SHOW_TOAST',
          payload: { message: input.message, type: input.type || 'info' },
        },
      };
    }

    case 'prepare_event_draft': {
      // Admin bypasses all permission checks
      if (authContext.role !== 'admin' && input.societyId && authContext.organiserSocieties) {
        const allowed = authContext.organiserSocieties.some(
          (s) => s.id === input.societyId
        );
        if (!allowed) {
          return {
            data: {
              error:
                'Permission denied: you do not manage this society. You can only create events for your own societies.',
            },
          };
        }
      }

      return {
        data: { status: 'ok', message: 'Event draft prepared. Navigating to create event form.' },
        clientAction: {
          type: 'FILL_FORM',
          payload: { formType: 'create-event', data: input },
        },
      };
    }

    case 'prepare_event_edit': {
      // Admin bypasses permission checks
      if (authContext.role !== 'admin' && authContext.role !== 'organiser') {
        return { data: { error: 'Not authorised to edit events.' } };
      }
      if (!authContext.userId) {
        return { data: { error: 'Not authorised to edit events.' } };
      }

      try {
        const event = await prisma.event.findUnique({
          where: { id: input.eventId },
          select: { organiserId: true, societyId: true },
        });

        if (!event) return { data: { error: 'Event not found.' } };
        if (authContext.role !== 'admin' && event.organiserId !== authContext.userId) {
          return { data: { error: 'Permission denied: you are not the organiser of this event.' } };
        }

        return {
          data: {
            status: 'ok',
            message: 'Edit prepared. Navigating to edit form.',
            changes: input.changes,
          },
          clientAction: {
            type: 'FILL_FORM',
            payload: {
              formType: 'edit-event',
              eventId: input.eventId,
              changes: input.changes,
            },
          },
        };
      } catch {
        return { data: { error: 'Failed to verify event ownership.' } };
      }
    }

    case 'delete_event': {
      // Admin bypasses permission checks
      if (authContext.role !== 'admin' && authContext.role !== 'organiser') {
        return { data: { error: 'Not authorised to delete events.' } };
      }
      if (!authContext.userId) {
        return { data: { error: 'Not authorised to delete events.' } };
      }

      try {
        const event = await prisma.event.findUnique({
          where: { id: input.eventId },
          select: { organiserId: true, title: true, id: true },
        });

        if (!event) return { data: { error: 'Event not found.' } };
        if (authContext.role !== 'admin' && event.organiserId !== authContext.userId) {
          return { data: { error: 'Permission denied: you are not the organiser of this event.' } };
        }

        // Actually delete the event and all related records
        await prisma.ticket.deleteMany({
          where: { order: { eventId: input.eventId } },
        });
        await prisma.order.deleteMany({
          where: { eventId: input.eventId },
        });
        await prisma.ticketType.deleteMany({
          where: { eventId: input.eventId },
        });
        await prisma.event.delete({
          where: { id: input.eventId },
        });

        return {
          data: {
            status: 'ok',
            message: `Event "${event.title}" has been permanently deleted.`,
          },
          clientAction: {
            type: 'SHOW_TOAST',
            payload: { message: `"${event.title}" has been deleted`, type: 'success' },
          },
        };
      } catch {
        return { data: { error: 'Failed to delete the event.' } };
      }
    }

    default:
      return { data: { error: `Unknown tool: ${name}` } };
  }
}
