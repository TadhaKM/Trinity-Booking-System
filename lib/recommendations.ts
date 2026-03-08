/**
 * Recommendation engine — transparent heuristics, no ML.
 *
 * Strategies:
 *  1. Followed-society events   — from societies the user follows
 *  2. Category affinity         — categories the user has booked/saved
 *  3. Trending                  — most-saved + most-booked this week
 *  4. Similar events            — same category/tags as a given event
 */

import { prisma } from '@/lib/db';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Events from societies the user follows, excluding already-booked/past events. */
export async function getFollowedSocietyEvents(
  userId: string,
  limit = 6
) {
  const following = await prisma.societyFollower.findMany({
    where: { userId },
    select: { societyId: true },
  });
  if (!following.length) return [];

  const bookedEventIds = (
    await prisma.order.findMany({ where: { userId }, select: { eventId: true } })
  ).map((o) => o.eventId);

  return prisma.event.findMany({
    where: {
      societyId: { in: following.map((f) => f.societyId) },
      startDate: { gte: new Date() },
      id: { notIn: bookedEventIds },
      isPublished: true,
      isCancelled: false,
    },
    include: {
      society: { select: { id: true, name: true } },
      ticketTypes: { select: { id: true, price: true, available: true } },
    },
    orderBy: { startDate: 'asc' },
    take: limit,
  });
}

/** Events in categories the user has interacted with (booked or saved). */
export async function getCategoryAffinityEvents(
  userId: string,
  limit = 6
) {
  // Gather categories from past bookings and saves
  const [orders, saves] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: { event: { select: { category: true } } },
    }),
    prisma.savedEvent.findMany({
      where: { userId },
      include: { event: { select: { category: true } } },
    }),
  ]);

  const categoryCounts: Record<string, number> = {};
  for (const o of orders) categoryCounts[o.event.category] = (categoryCounts[o.event.category] || 0) + 2;
  for (const s of saves) categoryCounts[s.event.category] = (categoryCounts[s.event.category] || 0) + 1;

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  if (!topCategories.length) return [];

  const bookedIds = orders.map((o) => o.eventId);
  const savedIds = saves.map((s) => s.eventId);
  const exclude = [...new Set([...bookedIds, ...savedIds])];

  return prisma.event.findMany({
    where: {
      category: { in: topCategories },
      startDate: { gte: new Date() },
      id: { notIn: exclude },
      isPublished: true,
      isCancelled: false,
    },
    include: {
      society: { select: { id: true, name: true } },
      ticketTypes: { select: { id: true, price: true, available: true } },
    },
    orderBy: { startDate: 'asc' },
    take: limit,
  });
}

/** Trending events: most saves + most orders in the past week. */
export async function getTrendingEvents(limit = 8) {
  const since = new Date(Date.now() - ONE_WEEK_MS);

  const [saveCounts, orderCounts] = await Promise.all([
    prisma.savedEvent.groupBy({
      by: ['eventId'],
      where: { createdAt: { gte: since } },
      _count: { eventId: true },
      orderBy: { _count: { eventId: 'desc' } },
      take: 20,
    }),
    prisma.order.groupBy({
      by: ['eventId'],
      where: { createdAt: { gte: since }, status: 'CONFIRMED' },
      _count: { eventId: true },
      orderBy: { _count: { eventId: 'desc' } },
      take: 20,
    }),
  ]);

  const scoreMap: Record<string, number> = {};
  for (const s of saveCounts) scoreMap[s.eventId] = (scoreMap[s.eventId] || 0) + s._count.eventId;
  for (const o of orderCounts) scoreMap[o.eventId] = (scoreMap[o.eventId] || 0) + o._count.eventId * 2;

  const topIds = Object.entries(scoreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (!topIds.length) return [];

  const events = await prisma.event.findMany({
    where: {
      id: { in: topIds },
      startDate: { gte: new Date() },
      isPublished: true,
      isCancelled: false,
    },
    include: {
      society: { select: { id: true, name: true } },
      ticketTypes: { select: { id: true, price: true, available: true } },
    },
  });

  // Return in score order
  return topIds
    .map((id) => events.find((e) => e.id === id))
    .filter(Boolean) as typeof events;
}

/** Events similar to a given event (same category + overlapping tags). */
export async function getSimilarEvents(eventId: string, limit = 4) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return [];

  let tags: string[] = [];
  try { tags = JSON.parse(event.tags || '[]'); } catch {}

  const candidates = await prisma.event.findMany({
    where: {
      id: { not: eventId },
      category: event.category,
      startDate: { gte: new Date() },
      isPublished: true,
      isCancelled: false,
    },
    include: {
      society: { select: { id: true, name: true } },
      ticketTypes: { select: { id: true, price: true, available: true } },
    },
    take: 20,
  });

  // Score by tag overlap
  const scored = candidates.map((c) => {
    let cTags: string[] = [];
    try { cTags = JSON.parse(c.tags || '[]'); } catch {}
    const overlap = tags.filter((t) => cTags.includes(t)).length;
    return { event: c, score: overlap };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.event);
}

/** Society leaderboard by follower count (descending). */
export async function getSocietyLeaderboard(limit = 5) {
  const counts = await prisma.societyFollower.groupBy({
    by: ['societyId'],
    _count: { societyId: true },
    orderBy: { _count: { societyId: 'desc' } },
    take: limit,
  });

  const societies = await prisma.society.findMany({
    where: { id: { in: counts.map((c) => c.societyId) } },
    include: { _count: { select: { followers: true, events: true } } },
  });

  return counts
    .map((c) => {
      const s = societies.find((soc) => soc.id === c.societyId);
      return s ? { ...s, followerCount: c._count.societyId } : null;
    })
    .filter(Boolean);
}

/** Societies with most ticket sales this month. */
export async function getTopTicketSocieties(limit = 5) {
  const since = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: 'CONFIRMED' },
    include: { event: { select: { societyId: true } } },
  });

  const societyRevenue: Record<string, number> = {};
  for (const o of orders) {
    societyRevenue[o.event.societyId] = (societyRevenue[o.event.societyId] || 0) + 1;
  }

  const topIds = Object.entries(societyRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (!topIds.length) return [];

  const societies = await prisma.society.findMany({
    where: { id: { in: topIds } },
    include: { _count: { select: { followers: true, events: true } } },
  });

  return topIds
    .map((id) => {
      const s = societies.find((soc) => soc.id === id);
      return s ? { ...s, ticketsSoldThisMonth: societyRevenue[id] } : null;
    })
    .filter(Boolean);
}
