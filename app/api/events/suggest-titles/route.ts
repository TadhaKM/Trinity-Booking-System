/**
 * POST /api/events/suggest-titles
 *
 * Returns 3 event title suggestions.
 * - If `title` is empty (or < 3 chars): generate ideas based on the society name/category.
 * - If `title` is provided: return 2–3 refined alternatives.
 *
 * Style learning: if `organiserId` is supplied, fetches the organiser's past event
 * titles and uses them as few-shot examples so suggestions match their naming style.
 */
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { isAiDisabled, addApiUsage } from '@/lib/demo-spend';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured.' }, { status: 500 });
  }
  if (await isAiDisabled()) {
    return NextResponse.json(
      { error: 'AI is currently unavailable — demo credit exhausted.' },
      { status: 503 }
    );
  }

  const body = await request.json();
  const title: string       = (body.title        ?? '').trim();
  const societyName: string = (body.societyName  ?? '').trim();
  const category: string    = (body.category     ?? '').trim();
  const organiserId: string = (body.organiserId  ?? '').trim();

  // Fetch the organiser's past titles for style learning
  let pastTitles: string[] = [];
  if (organiserId) {
    try {
      const pastEvents = await prisma.event.findMany({
        where: { organiserId },
        select: { title: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
      pastTitles = pastEvents.map((e) => e.title);
    } catch { /* non-fatal */ }
  }

  const styleContext = pastTitles.length >= 2
    ? `\n\nHere are examples of how this organiser has titled their past events (use these to match their naming style and tone):\n${pastTitles.map((t) => `- "${t}"`).join('\n')}`
    : '';

  let prompt: string;

  if (title.length >= 3) {
    // Refinement mode
    prompt = `You are helping a Trinity College Dublin society organiser name their event.

Current working title: "${title}"
${societyName ? `Society: ${societyName}` : ''}${category ? `\nCategory: ${category}` : ''}${styleContext}

Suggest exactly 3 alternative event title options that are more engaging, clear, or creative than the current title. Each title should be concise (2–7 words), suitable for a TCD student audience.

Respond with ONLY a JSON array of 3 strings. No explanation, no markdown, no other text. Example: ["Title One", "Title Two", "Title Three"]`;
  } else {
    // Discovery mode — generate ideas from scratch based on society
    if (!societyName) {
      return NextResponse.json({ suggestions: [] });
    }
    prompt = `You are helping a Trinity College Dublin society organiser come up with event ideas.

Society: ${societyName}${category ? `\nCategory: ${category}` : ''}${styleContext}

Suggest exactly 3 distinct, realistic event title ideas this society could run. Titles should be concise (2–7 words), engaging, and suitable for TCD students. Vary the types (e.g. a social, a workshop, a performance/competition).

Respond with ONLY a JSON array of 3 strings. No explanation, no markdown, no other text. Example: ["Event One", "Event Two", "Event Three"]`;
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    });

    await addApiUsage(response.usage.input_tokens, response.usage.output_tokens);

    const raw = response.content.find((b) => b.type === 'text')?.text?.trim() ?? '[]';

    // Parse JSON array safely
    const match = raw.match(/\[[\s\S]*?\]/);
    const suggestions: string[] = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
  } catch (err) {
    console.error('[suggest-titles]', err);
    return NextResponse.json({ suggestions: [] });
  }
}
