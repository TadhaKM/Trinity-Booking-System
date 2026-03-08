'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';

// ─── Leaderboard types ────────────────────────────────────────────────────────

interface LeaderboardEntry {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  followerCount: number;
  ticketsThisMonth: number;
  isFollowing: boolean;
}

type LeaderboardTab = 'followers' | 'tickets';

// ─── Rank badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: 'bg-amber-400 text-amber-900 shadow-amber-200 shadow-md',
    2: 'bg-slate-300 text-slate-700 shadow-slate-100 shadow-md',
    3: 'bg-orange-300 text-orange-800 shadow-orange-100 shadow-md',
  };
  const base = 'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black';
  return (
    <span className={`${base} ${styles[rank] ?? 'bg-slate-100 text-slate-400'}`}>
      {rank}
    </span>
  );
}

// ─── Leaderboard skeleton ─────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-4 animate-pulse">
          <div className="w-7 h-7 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-200 rounded-full w-2/3" />
            <div className="h-3 bg-slate-100 rounded-full w-1/3" />
          </div>
          <div className="h-3 bg-slate-200 rounded-full w-16" />
          <div className="h-8 bg-slate-100 rounded-full w-20" />
        </div>
      ))}
    </div>
  );
}

// ─── Leaderboard section ──────────────────────────────────────────────────────

interface TrendingSocietiesProps {
  user: { id: string; name: string; email: string; isOrganiser: boolean } | null;
  mainSocieties: SocietyWithContent[];
  onFollowToggle: (id: string) => void;
}

function TrendingSocieties({ user, mainSocieties, onFollowToggle }: TrendingSocietiesProps) {
  const [tab, setTab] = useState<LeaderboardTab>('followers');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = user
      ? `/api/societies/leaderboard?tab=${tab}&userId=${user.id}`
      : `/api/societies/leaderboard?tab=${tab}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEntries(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tab, user]);

  // Sync isFollowing state with main societies list so optimistic updates propagate
  const syncedEntries = useMemo(() => {
    return entries.map((e) => {
      const match = mainSocieties.find((s) => s.id === e.id);
      return match ? { ...e, isFollowing: match.isFollowing } : e;
    });
  }, [entries, mainSocieties]);

  const handleFollow = async (societyId: string) => {
    if (!user || followLoading) return;
    setFollowLoading(societyId);
    onFollowToggle(societyId);
    setEntries((prev) =>
      prev.map((e) =>
        e.id === societyId
          ? { ...e, isFollowing: !e.isFollowing, followerCount: e.isFollowing ? e.followerCount - 1 : e.followerCount + 1 }
          : e
      )
    );
    try {
      await fetch(`/api/societies/${societyId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch {
      // Revert on error
      onFollowToggle(societyId);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === societyId
            ? { ...e, isFollowing: !e.isFollowing, followerCount: e.isFollowing ? e.followerCount - 1 : e.followerCount + 1 }
            : e
        )
      );
    } finally {
      setFollowLoading(null);
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
      {/* Heading + tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold text-[#0A2E6E] mb-4 sm:mb-0">Trending Societies</h2>
        <div className="flex gap-1 bg-slate-100 rounded-full p-1 self-start sm:self-auto">
          <button
            onClick={() => setTab('followers')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              tab === 'followers'
                ? 'bg-white text-[#0A2E6E] shadow-sm'
                : 'text-slate-500 hover:text-[#0A2E6E]'
            }`}
          >
            Most Followed
          </button>
          <button
            onClick={() => setTab('tickets')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              tab === 'tickets'
                ? 'bg-white text-[#0A2E6E] shadow-sm'
                : 'text-slate-500 hover:text-[#0A2E6E]'
            }`}
          >
            Top This Month
          </button>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <LeaderboardSkeleton />
      ) : syncedEntries.length === 0 ? (
        <div className="bg-white rounded-2xl px-6 py-8 text-center text-slate-400 text-sm">
          No data available yet.
        </div>
      ) : (
        <div className="space-y-3">
          {syncedEntries.map((entry, i) => {
            const rank = i + 1;
            const stat =
              tab === 'followers'
                ? `${entry.followerCount.toLocaleString()} follower${entry.followerCount !== 1 ? 's' : ''}`
                : `${entry.ticketsThisMonth.toLocaleString()} ticket${entry.ticketsThisMonth !== 1 ? 's' : ''} this month`;

            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-slate-100 hover:border-[#0A2E6E]/15 hover:shadow-md transition-all duration-200"
              >
                <RankBadge rank={rank} />

                {/* Society image */}
                <div className="flex-shrink-0 relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100">
                  <Image
                    src={entry.imageUrl}
                    alt={entry.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>

                {/* Name + category */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0A2E6E] truncate">{entry.name}</p>
                  <p className="text-xs text-slate-400 font-medium truncate">{entry.category}</p>
                </div>

                {/* Stat */}
                <p className="hidden sm:block text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {stat}
                </p>

                {/* Follow button */}
                {user ? (
                  <button
                    onClick={() => handleFollow(entry.id)}
                    disabled={followLoading === entry.id}
                    className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full border-2 transition-all duration-300 ${
                      entry.isFollowing
                        ? 'border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50'
                        : 'border-[#0A2E6E] text-[#0A2E6E] hover:bg-[#0A2E6E] hover:text-white'
                    }`}
                  >
                    {followLoading === entry.id ? '...' : entry.isFollowing ? 'Following' : 'Follow'}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full border-2 border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300"
                  >
                    Follow
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface FeaturedPost {
  id: string;
  imageUrl: string;
  caption: string;
  isPinned: boolean;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  startDate: string;
  location: string;
  imageUrl: string;
  lowestPrice: number;
  ticketsLeft: number;
}

interface SocietyWithContent {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  followerCount: number;
  isFollowing: boolean;
  featuredPost: FeaturedPost | null;
  upcomingEvent: UpcomingEvent | null;
}

const CATEGORIES = ['All', 'Arts & Culture', 'Academic', 'Music', 'Sports & Fitness', 'Debate & Speaking', 'Social'];
const CATEGORY_ICONS: Record<string, string> = {
  'Arts & Culture': '🎨', Academic: '📚', Music: '🎵', 'Sports & Fitness': '⚽', 'Debate & Speaking': '🎤', Social: '🌍',
};

export default function SocietiesPage() {
  const user = useAuthStore((state) => state.user);
  const [societies, setSocieties] = useState<SocietyWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(user ? `/api/societies?userId=${user.id}` : '/api/societies');
        const data = await res.json();
        setSocieties(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching societies:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    setTimeout(() => setMounted(true), 50);
  }, [user]);

  const filtered = useMemo(() => {
    return societies.filter((s) => activeCategory === 'All' || s.category === activeCategory);
  }, [societies, activeCategory]);

  const handleFollow = async (societyId: string) => {
    if (!user) return;
    setSocieties((prev) => prev.map((s) => s.id === societyId ? { ...s, isFollowing: !s.isFollowing, followerCount: s.isFollowing ? s.followerCount - 1 : s.followerCount + 1 } : s));
    try {
      await fetch(`/api/societies/${societyId}/follow`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
    } catch {
      setSocieties((prev) => prev.map((s) => s.id === societyId ? { ...s, isFollowing: !s.isFollowing, followerCount: s.isFollowing ? s.followerCount - 1 : s.followerCount + 1 } : s));
    }
  };

  const handleLike = async (societyId: string, postId: string) => {
    if (!user) return;
    setSocieties((prev) => prev.map((s) => s.id === societyId && s.featuredPost?.id === postId ? { ...s, featuredPost: { ...s.featuredPost!, isLiked: !s.featuredPost!.isLiked, likeCount: s.featuredPost!.isLiked ? s.featuredPost!.likeCount - 1 : s.featuredPost!.likeCount + 1 } } : s));
    try {
      await fetch(`/api/societies/posts/${postId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) });
    } catch {
      setSocieties((prev) => prev.map((s) => s.id === societyId && s.featuredPost?.id === postId ? { ...s, featuredPost: { ...s.featuredPost!, isLiked: !s.featuredPost!.isLiked, likeCount: s.featuredPost!.isLiked ? s.featuredPost!.likeCount - 1 : s.featuredPost!.likeCount + 1 } } : s));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="societies-loading">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#A8EDEA]/30 border-t-[#1A6FEF] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFF2F7]" data-testid="societies-page">
      {/* ─── HEADER ───────────────────────────────── */}
      <div className="bg-[#0A2E6E] relative overflow-hidden" data-testid="societies-header">
        <div className="absolute inset-0 noise-overlay" />
        {/* Decorative elements */}
        <div className="absolute top-8 right-12 w-48 h-48 border border-white/5 rounded-full" />
        <div className="absolute bottom-4 left-8 w-24 h-24 border border-[#59D4C8]/10 rounded-2xl rotate-12" />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-[#59D4C8] rounded-full opacity-30" />
        <div className="absolute bottom-8 right-16 w-1.5 h-1.5 bg-[#F5A623] rounded-full opacity-40" />

        <div className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div>
            <div className="inline-flex items-center gap-2 bg-white/8 text-white/70 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-4 border border-white/10">
              <svg className="w-3.5 h-3.5 text-[#59D4C8]" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
              Community
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight" data-testid="societies-title">
              TCD Societies
            </h1>
            <p className="text-white/40 mt-2 text-lg">
              {societies.length} societies &middot; Follow your favourites and stay up to date
            </p>
          </div>
        </div>
      </div>

      {/* ─── CATEGORY PILLS ──────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/50" data-testid="categories-filter">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex gap-2 overflow-x-auto hide-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              data-testid={`category-pill-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-[#0A2E6E] text-white shadow-md shadow-[#0A2E6E]/15'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-[#0A2E6E]'
              }`}
            >
              {cat === 'All' ? 'All' : `${CATEGORY_ICONS[cat] ?? ''} ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TRENDING LEADERBOARD ────────────────── */}
      <TrendingSocieties user={user} mainSocieties={societies} onFollowToggle={handleFollow} />

      {/* ─── SOCIETIES GRID ──────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {filtered.length === 0 ? (
          <div className="text-center py-20" data-testid="no-societies">
            <div className="w-20 h-20 bg-[#0A2E6E]/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-[#0A2E6E]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <p className="text-xl font-bold text-[#0A2E6E]">No societies found</p>
            <p className="text-slate-500 mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="societies-grid">
            {filtered.map((society, i) => (
              <SocietyCard key={society.id} society={society} user={user} onFollow={handleFollow} onLike={handleLike} index={i} mounted={mounted} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SocietyCard({ society, user, onFollow, onLike, index, mounted }: {
  society: SocietyWithContent;
  user: any;
  onFollow: (id: string) => void;
  onLike: (societyId: string, postId: string) => void;
  index: number;
  mounted: boolean;
}) {
  const [followLoading, setFollowLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const handleFollow = async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    await onFollow(society.id);
    setFollowLoading(false);
  };

  const handleLike = async () => {
    if (!user || !society.featuredPost || likeLoading) return;
    setLikeLoading(true);
    await onLike(society.id, society.featuredPost.id);
    setLikeLoading(false);
  };

  return (
    <div
      className={`group bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover-lift transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${100 + index * 60}ms` }}
      data-testid={`society-card-${index}`}
    >
      {/* Cover Image */}
      <div className="relative h-40 w-full overflow-hidden">
        <Image src={society.imageUrl} alt={society.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        <div className="absolute inset-0 bg-[#0A2E6E]/30 group-hover:bg-[#0A2E6E]/20 transition-colors duration-500" />
        <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#0A2E6E] text-xs font-bold px-2.5 py-1 rounded-full shadow-sm" data-testid={`society-category-${index}`}>
          {CATEGORY_ICONS[society.category] ?? ''} {society.category}
        </span>
      </div>

      {/* Info Row */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-[#0A2E6E] text-base leading-tight truncate" data-testid={`society-name-${index}`}>{society.name}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {society.followerCount.toLocaleString()} follower{society.followerCount !== 1 ? 's' : ''}
          </p>
        </div>
        {user ? (
          <button onClick={handleFollow} disabled={followLoading} data-testid={`society-follow-${index}`} className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full border-2 transition-all duration-300 ${society.isFollowing ? 'border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50' : 'border-[#0A2E6E] text-[#0A2E6E] hover:bg-[#0A2E6E] hover:text-white'}`}>
            {followLoading ? '...' : society.isFollowing ? 'Following' : 'Follow'}
          </button>
        ) : (
          <Link href="/login" className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full border-2 border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300">Follow</Link>
        )}
      </div>

      {/* Content Area */}
      {society.featuredPost ? (
        <div className="px-5 pb-4">
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-3">
            <Image src={society.featuredPost.imageUrl} alt="Post" fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
          </div>
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mb-3">{society.featuredPost.caption}</p>
          <div className="flex items-center gap-1">
            {user ? (
              <button onClick={handleLike} disabled={likeLoading} data-testid={`society-like-${index}`} className={`flex items-center gap-1.5 text-sm font-semibold transition-all duration-300 px-3 py-1.5 rounded-full ${society.featuredPost.isLiked ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-400 hover:bg-red-50'}`}>
                <svg className="w-4 h-4" fill={society.featuredPost.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {society.featuredPost.likeCount}
              </button>
            ) : (
              <Link href="/login" className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-slate-400 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {society.featuredPost.likeCount}
              </Link>
            )}
          </div>
        </div>
      ) : society.upcomingEvent ? (
        <div className="px-5 pb-4">
          <div className="bg-[#0A2E6E]/5 rounded-xl p-4 border border-[#0A2E6E]/8">
            <p className="text-xs text-[#1A6FEF] font-bold uppercase tracking-wider mb-1.5">Upcoming Event</p>
            <p className="text-sm font-bold text-[#0A2E6E] leading-tight line-clamp-2">{society.upcomingEvent.title}</p>
            <p className="text-xs text-slate-500 mt-1.5">
              {new Date(society.upcomingEvent.startDate).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })} &middot; {society.upcomingEvent.location}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-bold text-[#0A2E6E]">{society.upcomingEvent.lowestPrice === 0 ? 'Free' : `From €${society.upcomingEvent.lowestPrice.toFixed(2)}`}</span>
              <span className="text-xs text-slate-400">&middot;</span>
              <span className="text-xs text-[#F5A623] font-semibold">{society.upcomingEvent.ticketsLeft} left</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-4">
          <p className="text-sm text-slate-400 italic">No upcoming events</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 pb-5 mt-auto">
        <Link href={`/societies/${society.id}`} data-testid={`society-view-${index}`} className="block text-center text-sm font-bold text-[#0A2E6E] py-2.5 border-2 border-[#0A2E6E]/15 rounded-xl hover:bg-[#0A2E6E] hover:text-white hover:border-[#0A2E6E] transition-all duration-300">
          View Society
        </Link>
      </div>
    </div>
  );
}
