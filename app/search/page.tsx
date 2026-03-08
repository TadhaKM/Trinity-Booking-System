'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { Event, Society } from '@/lib/types';
import { formatDate, formatPrice } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0569b9]" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

type SortOption = 'date' | 'price-asc' | 'price-desc' | 'newest';
type FilterOption = 'all' | 'today' | 'this-week' | 'free';

interface AdvancedFilters {
  minPrice: number | null;
  maxPrice: number | null;
  dateFrom: string;
  dateTo: string;
  societyId: string;
  tags: string[];
}

const CATEGORIES = ['All', 'Arts & Culture', 'Music', 'Academic', 'Sports & Fitness', 'Debate & Speaking', 'Social'];

const SORT_LABELS: Record<SortOption, string> = {
  date: 'Date',
  'price-asc': 'Price ↑',
  'price-desc': 'Price ↓',
  newest: 'Newest',
};

const FILTER_LABELS: Record<FilterOption, string> = {
  all: 'All',
  today: 'Today',
  'this-week': 'This Week',
  free: 'Free',
};

function applyClientSort(events: Event[], sort: SortOption): Event[] {
  const copy = [...events];
  switch (sort) {
    case 'date': return copy.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    case 'price-asc': return copy.sort((a, b) => {
      const ap = a.ticketTypes.length ? Math.min(...a.ticketTypes.map((t) => t.price)) : 0;
      const bp = b.ticketTypes.length ? Math.min(...b.ticketTypes.map((t) => t.price)) : 0;
      return ap - bp;
    });
    case 'price-desc': return copy.sort((a, b) => {
      const ap = a.ticketTypes.length ? Math.min(...a.ticketTypes.map((t) => t.price)) : 0;
      const bp = b.ticketTypes.length ? Math.min(...b.ticketTypes.map((t) => t.price)) : 0;
      return bp - ap;
    });
    case 'newest': return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    default: return copy;
  }
}

function applyClientFilter(events: Event[], filter: FilterOption): Event[] {
  const now = new Date();
  switch (filter) {
    case 'today': {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 86400_000);
      return events.filter((e) => new Date(e.startDate) >= todayStart && new Date(e.startDate) < todayEnd);
    }
    case 'this-week': {
      const weekEnd = new Date(now.getTime() + 7 * 86400_000);
      return events.filter((e) => new Date(e.startDate) >= now && new Date(e.startDate) <= weekEnd);
    }
    case 'free': return events.filter((e) => e.ticketTypes.some((t) => t.price === 0));
    default: return events;
  }
}

function applyAdvancedFilters(events: Event[], filters: AdvancedFilters): Event[] {
  const { minPrice, maxPrice, dateFrom, dateTo, societyId, tags } = filters;
  return events.filter((e) => {
    const cheapest = e.ticketTypes.length
      ? Math.min(...e.ticketTypes.map((t) => t.price))
      : Infinity;
    if (minPrice != null && cheapest < minPrice) return false;
    if (maxPrice != null && cheapest > maxPrice) return false;
    if (dateFrom && new Date(e.startDate) < new Date(dateFrom)) return false;
    if (dateTo && new Date(e.startDate) > new Date(dateTo)) return false;
    if (societyId && e.society?.id !== societyId) return false;
    if (tags.length > 0 && !tags.some((tag) => e.tags.includes(tag))) return false;
    return true;
  });
}

function countActiveAdvancedFilters(filters: AdvancedFilters): number {
  let count = 0;
  if (filters.minPrice != null) count++;
  if (filters.maxPrice != null) count++;
  if (filters.dateFrom) count++;
  if (filters.dateTo) count++;
  if (filters.societyId) count++;
  count += filters.tags.length;
  return count;
}

function SaveButton({ eventId }: { eventId: string }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/events/${eventId}/save?userId=${user.id}`)
      .then((r) => r.json())
      .then((d) => setSaved(d.saved))
      .catch(() => {});
  }, [user, eventId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    setBusy(true);
    try {
      if (saved) {
        await fetch(`/api/events/${eventId}/save?userId=${user.id}`, { method: 'DELETE' });
        setSaved(false);
      } else {
        await fetch(`/api/events/${eventId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        setSaved(true);
      }
    } finally { setBusy(false); }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10"
      title={saved ? 'Unsave' : 'Save'}
    >
      <svg
        className={`w-4 h-4 transition-colors ${saved ? 'text-[#0569b9]' : 'text-gray-400'}`}
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  );
}

function EventCard({ event }: { event: Event }) {
  const minPrice = event.ticketTypes.length
    ? Math.min(...event.ticketTypes.map((t) => t.price))
    : null;

  return (
    <Link href={`/events/${event.id}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm shadow-gray-200/60 border border-gray-100 hover:shadow-md transition-shadow">
        <div className="relative h-48 bg-slate-100">
          {event.imageUrl.startsWith('data:') ? (
            <img src={event.imageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-[#0A2E6E]">
            {event.category}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h3 className="text-base font-bold text-white line-clamp-1">{event.title}</h3>
          </div>
          <SaveButton eventId={event.id} />
        </div>
        <div className="p-4">
          {event.society && (
            <p className="text-xs text-[#0569b9] font-semibold mb-1.5">{event.society.name}</p>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{formatDate(event.startDate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold text-[#0A2E6E]">
              {minPrice === null ? '' : minPrice === 0 ? 'Free' : `from ${formatPrice(minPrice)}`}
            </span>
            <div className="w-7 h-7 rounded-full bg-[#0569b9] flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const categoryParam = searchParams.get('category');

  // Core state
  const [events, setEvents] = useState<Event[]>([]);
  const [followedEvents, setFollowedEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || '');
  const [sort, setSort] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'date');
  const [filter, setFilter] = useState<FilterOption>((searchParams.get('filter') as FilterOption) || 'all');
  const [loading, setLoading] = useState(true);

  // Advanced filter state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minPrice, setMinPrice] = useState<number | null>(
    searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null
  );
  const [maxPrice, setMaxPrice] = useState<number | null>(
    searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [societyId, setSocietyId] = useState(searchParams.get('societyId') || '');
  const [tagInput, setTagInput] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>(
    searchParams.get('tags') ? searchParams.get('tags')!.split(',').filter(Boolean) : []
  );

  // Societies for dropdown
  const [societies, setSocieties] = useState<Society[]>([]);

  // Typeahead
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch societies for the dropdown
  useEffect(() => {
    fetch('/api/societies')
      .then((r) => r.json())
      .then((data) => setSocieties(Array.isArray(data) ? data : []))
      .catch(() => setSocieties([]));
  }, []);

  // Fetch events
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (selectedCategory) params.append('category', selectedCategory);
    fetch(`/api/search?${params}`)
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [searchQuery, selectedCategory]);

  // Personalised: events from followed societies
  useEffect(() => {
    if (!user || searchQuery || selectedCategory) { setFollowedEvents([]); return; }
    fetch(`/api/users/${user.id}/weekly-updates`)
      .then((r) => r.json())
      .then((data: any[]) => {
        const evs = data.flatMap((d) => d.events ?? []);
        setFollowedEvents(evs);
      })
      .catch(() => setFollowedEvents([]));
  }, [user, searchQuery, selectedCategory]);

  // Typeahead suggestions
  useEffect(() => {
    if (searchQuery.length < 2 || events.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = events
      .map((e) => e.title)
      .filter((title) => title.toLowerCase().includes(q))
      .slice(0, 5);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [searchQuery, events]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        searchInputRef.current && !searchInputRef.current.contains(e.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (sort !== 'date') params.set('sort', sort);
    if (filter !== 'all') params.set('filter', filter);
    if (minPrice != null) params.set('minPrice', String(minPrice));
    if (maxPrice != null) params.set('maxPrice', String(maxPrice));
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (societyId) params.set('societyId', societyId);
    if (activeTags.length > 0) params.set('tags', activeTags.join(','));
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, selectedCategory, sort, filter, minPrice, maxPrice, dateFrom, dateTo, societyId, activeTags]);

  const advancedFilters: AdvancedFilters = { minPrice, maxPrice, dateFrom, dateTo, societyId, tags: activeTags };
  const activeFilterCount = countActiveAdvancedFilters(advancedFilters);

  const clearAllAdvanced = () => {
    setMinPrice(null);
    setMaxPrice(null);
    setDateFrom('');
    setDateTo('');
    setSocietyId('');
    setActiveTags([]);
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!activeTags.includes(newTag) && activeTags.length < 5) {
        setActiveTags([...activeTags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setActiveTags(activeTags.filter((t) => t !== tag));
  };

  const displayed = applyAdvancedFilters(
    applyClientFilter(applyClientSort(events, sort), filter),
    advancedFilters
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#0A2E6E] mb-5">Search Events</h1>

        {/* Search Bar + Typeahead */}
        <div className="relative mb-3">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search events, societies, or locations..."
            className="w-full px-5 py-3.5 pl-12 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 text-[#0A2E6E] placeholder:text-gray-400 shadow-sm"
            autoComplete="off"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          {/* Typeahead dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg border border-gray-100 z-20 overflow-hidden"
            >
              {suggestions.map((title, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearchQuery(title);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-5 py-2.5 text-sm text-[#0A2E6E] hover:bg-[#EFF2F7] flex items-center gap-2.5 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters toggle button */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              showAdvanced
                ? 'bg-[#0569b9] text-white border-[#0569b9] shadow-md shadow-[#0569b9]/20'
                : 'bg-white text-[#0A2E6E] border-gray-200 hover:border-[#0569b9]/40'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm3 6a1 1 0 011-1h10a1 1 0 010 2H7a1 1 0 01-1-1zm3 6a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                showAdvanced ? 'bg-white text-[#0569b9]' : 'bg-[#0569b9] text-white'
              }`}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Advanced filter panel */}
        {showAdvanced && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mt-2 mb-4 border border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Price range */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Price Range</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                    <input
                      type="number"
                      min={0}
                      value={minPrice ?? ''}
                      onChange={(e) => setMinPrice(e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="Min"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm text-[#0A2E6E] focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30"
                    />
                  </div>
                  <span className="text-gray-300 text-sm">–</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                    <input
                      type="number"
                      min={0}
                      value={maxPrice ?? ''}
                      onChange={(e) => setMaxPrice(e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="Max"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm text-[#0A2E6E] focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30"
                    />
                  </div>
                  {(minPrice != null || maxPrice != null) && (
                    <button
                      onClick={() => { setMinPrice(null); setMaxPrice(null); }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                      title="Reset price"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Date range */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-[#0A2E6E] focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30"
                  />
                  <span className="text-gray-300 text-sm">–</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-[#0A2E6E] focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30"
                  />
                </div>
              </div>

              {/* Society dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Society</label>
                <select
                  value={societyId}
                  onChange={(e) => setSocietyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-[#0A2E6E] focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 bg-white"
                >
                  <option value="">All societies</option>
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Tags input */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Tags <span className="font-normal text-gray-400">(press Enter to add, max 5)</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {activeTags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-[#0569b9]/10 text-[#0569b9] px-2 py-1 rounded-full text-xs flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-[#0A2E6E] transition-colors"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {activeTags.length < 5 && (
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Type a tag and press Enter..."
                      className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-[#0A2E6E] focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 placeholder:text-gray-400"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  onClick={clearAllAdvanced}
                  className="text-sm font-semibold text-gray-500 hover:text-[#0569b9] transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === 'All' ? '' : cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                (cat === 'All' && !selectedCategory) || selectedCategory === cat
                  ? 'bg-[#0569b9] text-white shadow-md shadow-[#0569b9]/20'
                  : 'bg-[#EFF2F7] text-[#0A2E6E] hover:bg-[#0569b9]/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort + Time Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs font-semibold text-gray-400">Sort:</span>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`text-xs font-semibold px-2 py-1 rounded-lg transition ${sort === s ? 'bg-[#0569b9] text-white' : 'text-gray-500 hover:text-[#0569b9]'}`}
              >
                {SORT_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs font-semibold text-gray-400">Filter:</span>
            {(Object.keys(FILTER_LABELS) as FilterOption[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as FilterOption)}
                className={`text-xs font-semibold px-2 py-1 rounded-lg transition ${filter === f ? 'bg-[#0569b9] text-white' : 'text-gray-500 hover:text-[#0569b9]'}`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Personalised section */}
      {followedEvents.length > 0 && !searchQuery && !selectedCategory && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-[#0A2E6E] mb-4">From societies you follow</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {followedEvents.slice(0, 3).map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
          <hr className="mt-8 mb-6 border-gray-100" />
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0569b9]" />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No events found"
          description="Try adjusting your search, category, or filters."
        />
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-5">
            {displayed.length} event{displayed.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {displayed.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
