'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate, formatPrice } from '@/lib/utils';

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

const CATEGORIES = [
  'All',
  'Arts & Culture',
  'Academic',
  'Music',
  'Sports & Fitness',
  'Debate & Speaking',
  'Social',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Arts & Culture': '🎨',
  Academic: '📚',
  Music: '🎵',
  'Sports & Fitness': '⚽',
  'Debate & Speaking': '🎤',
  Social: '🌍',
};

export default function SocietiesPage() {
  const user = useAuthStore((state) => state.user);
  const [societies, setSocieties] = useState<SocietyWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchSocieties = async () => {
      try {
        const url = user ? `/api/societies?userId=${user.id}` : '/api/societies';
        const res = await fetch(url);
        const data = await res.json();
        setSocieties(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching societies:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSocieties();
  }, [user]);

  const filtered = useMemo(() => {
    return societies.filter((s) => {
      const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
      const matchesSearch =
        search.trim() === '' ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [societies, activeCategory, search]);

  const handleFollow = async (societyId: string) => {
    if (!user) return;
    setSocieties((prev) =>
      prev.map((s) =>
        s.id === societyId
          ? {
              ...s,
              isFollowing: !s.isFollowing,
              followerCount: s.isFollowing ? s.followerCount - 1 : s.followerCount + 1,
            }
          : s
      )
    );
    try {
      await fetch(`/api/societies/${societyId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch {
      // Revert on failure
      setSocieties((prev) =>
        prev.map((s) =>
          s.id === societyId
            ? {
                ...s,
                isFollowing: !s.isFollowing,
                followerCount: s.isFollowing ? s.followerCount - 1 : s.followerCount + 1,
              }
            : s
        )
      );
    }
  };

  const handleLike = async (societyId: string, postId: string) => {
    if (!user) return;
    setSocieties((prev) =>
      prev.map((s) =>
        s.id === societyId && s.featuredPost?.id === postId
          ? {
              ...s,
              featuredPost: {
                ...s.featuredPost!,
                isLiked: !s.featuredPost!.isLiked,
                likeCount: s.featuredPost!.isLiked
                  ? s.featuredPost!.likeCount - 1
                  : s.featuredPost!.likeCount + 1,
              },
            }
          : s
      )
    );
    try {
      await fetch(`/api/societies/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch {
      // Revert on failure
      setSocieties((prev) =>
        prev.map((s) =>
          s.id === societyId && s.featuredPost?.id === postId
            ? {
                ...s,
                featuredPost: {
                  ...s.featuredPost!,
                  isLiked: !s.featuredPost!.isLiked,
                  likeCount: s.featuredPost!.isLiked
                    ? s.featuredPost!.likeCount - 1
                    : s.featuredPost!.likeCount + 1,
                },
              }
            : s
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 rounded-full border-4 border-[#0E73B9]/20 border-t-[#0E73B9] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0E73B9] text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-1 text-white">TCD Societies</h1>
          <p className="text-white/80 text-sm">
            {societies.length} societies · Follow your favourites and stay up to date
          </p>

          {/* Search */}
          <div className="mt-5 relative max-w-xl">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search societies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      {/* Category pills */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border border-black ${
                activeCategory === cat
                  ? 'bg-[#0E73B9] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'All' ? 'All' : `${CATEGORY_ICONS[cat] ?? ''} ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {/* Societies grid */}
      <div className="max-w-xl mx-auto px-4 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium">No societies found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filtered.map((society) => (
              <SocietyCard
                key={society.id}
                society={society}
                user={user}
                onFollow={handleFollow}
                onLike={handleLike}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Society Card ───────────────────────────────────────────────────────────────

function SocietyCard({
  society,
  user,
  onFollow,
  onLike,
}: {
  society: SocietyWithContent;
  user: any;
  onFollow: (id: string) => void;
  onLike: (societyId: string, postId: string) => void;
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
    <div className="bg-white rounded-2xl shadow-sm border-2 border-black overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Society cover photo */}
      <div className="relative h-36 w-full">
        <Image
          src={society.imageUrl}
          alt={society.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Category badge */}
        <span className="absolute top-2 right-2 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
          {CATEGORY_ICONS[society.category] ?? ''} {society.category}
        </span>
      </div>

      {/* Society name + follower row */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
            {society.name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {society.followerCount.toLocaleString()} follower{society.followerCount !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Follow button */}
        {user ? (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              society.isFollowing
                ? 'border-gray-300 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                : 'border-[#0E73B9] text-[#0E73B9] hover:bg-[#0E73B9] hover:text-white'
            }`}
          >
            {followLoading ? '...' : society.isFollowing ? 'Following' : 'Follow'}
          </button>
        ) : (
          <Link
            href="/login"
            title="Sign in to follow"
            className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-400 cursor-pointer hover:bg-gray-50"
          >
            Follow
          </Link>
        )}
      </div>

      {/* Promotional post OR upcoming event */}
      {society.featuredPost ? (
        <div className="px-4 pb-3 flex-1 flex flex-col">
          {/* Post image */}
          <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2">
            <Image
              src={society.featuredPost.imageUrl}
              alt="Promotional post"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
          {/* Caption */}
          <p className="text-xs text-gray-700 leading-relaxed line-clamp-2 mb-2">
            {society.featuredPost.caption}
          </p>
          {/* Like row */}
          <div className="flex items-center gap-1">
            {user ? (
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                  society.featuredPost.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill={society.featuredPost.isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {society.featuredPost.likeCount}
              </button>
            ) : (
              <Link
                href="/login"
                title="Sign in to like"
                className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-400"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {society.featuredPost.likeCount}
              </Link>
            )}
          </div>
        </div>
      ) : society.upcomingEvent ? (
        /* No post — show upcoming event instead */
        <div className="px-4 pb-3 flex-1">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-500 font-medium mb-0.5 uppercase tracking-wide">
              Upcoming Event
            </p>
            <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">
              {society.upcomingEvent.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(society.upcomingEvent.startDate).toLocaleDateString('en-IE', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}{' '}
              · {society.upcomingEvent.location}
            </p>
            <p className="text-xs text-[#0E73B9] font-medium mt-1">
              {society.upcomingEvent.lowestPrice === 0
                ? 'Free'
                : `From €${society.upcomingEvent.lowestPrice.toFixed(2)}`}
              {' · '}
              {society.upcomingEvent.ticketsLeft} left
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-3 flex-1">
          <p className="text-xs text-gray-400 italic">No upcoming events</p>
        </div>
      )}

      {/* Footer — View Society */}
      <div className="px-4 pb-4 mt-auto">
        <Link
          href={`/societies/${society.id}`}
          className="block text-center text-xs font-medium text-[#0E73B9] hover:text-[#0a5a94] py-2 border border-[#0E73B9]/30 rounded-xl hover:bg-blue-50 transition-colors"
        >
          View Society →
        </Link>
      </div>
    </div>
  );
}
