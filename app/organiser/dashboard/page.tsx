'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice } from '@/lib/utils';

interface DashboardStats {
  totalRevenue: number;
  totalTicketsSold: number;
  upcomingEvents: number;
  totalEvents: number;
}

interface EventStats {
  id: string;
  title: string;
  startDate: string;
  ticketsSold: number;
  revenue: number;
  capacity: number;
}

interface Society {
  id: string;
  name: string;
}

interface Post {
  id: string;
  societyId: string;
  societyName: string;
  imageUrl: string;
  caption: string;
  isPinned: boolean;
  likeCount: number;
  event: { id: string; title: string } | null;
  createdAt: string;
}

export default function OrganiserDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'events' | 'posts'>('events');

  // Events state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [organiserSocieties, setOrganiserSocieties] = useState<Society[]>([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({
    societyId: '',
    eventId: '',
    caption: '',
    imageUrl: '',
    imagePreview: '',
  });
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [societyEvents, setSocietyEvents] = useState<{ id: string; title: string }[]>([]);
  const [pinning, setPinning] = useState<string | null>(null);

  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!user) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}?organiserId=${user.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEventStats((prev) => prev.filter((e) => e.id !== eventId));
        if (stats) {
          setStats({ ...stats, totalEvents: stats.totalEvents - 1 });
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete event');
      }
    } catch {
      alert('Failed to delete event');
    } finally {
      setDeletingId(null);
    }
  };

  // Load dashboard stats + events
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!user.isOrganiser) {
      router.push('/');
      return;
    }

    const fetchDashboard = async () => {
      try {
        const res = await fetch(`/api/organiser/${user.id}/dashboard`);
        const data = await res.json();
        setStats(data.stats);
        setEventStats(data.events);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user, router]);

  // Load posts when Posts tab is opened
  useEffect(() => {
    if (activeTab !== 'posts' || !user) return;
    loadPosts();
  }, [activeTab, user]);

  const loadPosts = async () => {
    if (!user) return;
    setPostsLoading(true);
    try {
      // Get societies this organiser manages (from their events)
      const res = await fetch(`/api/organiser/${user.id}/societies`);
      const societiesData: Society[] = await res.json();
      setOrganiserSocieties(societiesData);

      // Fetch posts for each society
      const allPosts: Post[] = [];
      for (const society of societiesData) {
        const pRes = await fetch(`/api/societies/${society.id}/posts`);
        const pData = await pRes.json();
        if (Array.isArray(pData)) {
          allPosts.push(
            ...pData.map((p: any) => ({ ...p, societyName: society.name }))
          );
        }
      }
      // Sort: pinned first, then newest
      allPosts.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setPosts(allPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  // Load events for selected society in post form
  useEffect(() => {
    if (!postForm.societyId) { setSocietyEvents([]); return; }
    fetch(`/api/societies/${postForm.societyId}/events`)
      .then((r) => r.json())
      .then((data) => {
        setSocietyEvents(Array.isArray(data) ? data.map((e: any) => ({ id: e.id, title: e.title })) : []);
      })
      .catch(() => setSocietyEvents([]));
  }, [postForm.societyId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPostForm((f) => ({ ...f, imageUrl: result, imagePreview: result }));
    };
    reader.readAsDataURL(file);
  };

  const handlePostSubmit = async () => {
    if (!user || !postForm.societyId || !postForm.imageUrl || !postForm.caption.trim()) return;
    setPostSubmitting(true);
    try {
      const res = await fetch(`/api/societies/${postForm.societyId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organiserId: user.id,
          imageUrl: postForm.imageUrl,
          caption: postForm.caption.trim(),
          eventId: postForm.eventId || undefined,
        }),
      });
      if (res.ok) {
        setPostForm({ societyId: '', eventId: '', caption: '', imageUrl: '', imagePreview: '' });
        setShowPostForm(false);
        await loadPosts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create post');
      }
    } catch {
      alert('Failed to create post');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handlePinToggle = async (post: Post) => {
    if (!user || pinning) return;
    setPinning(post.id);
    try {
      const res = await fetch(`/api/societies/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organiserId: user.id, isPinned: !post.isPinned }),
      });
      if (res.ok) {
        await loadPosts();
      }
    } catch {
      alert('Failed to update post');
    } finally {
      setPinning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <p className="text-black">Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-black">Organiser Dashboard</h1>
          <p className="text-black">Manage your events and society posts</p>
        </div>
        <Link
          href="/organiser/create-event"
          className="bg-[#0d3b66] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0a2f52] transition"
        >
          Create Event
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Revenue', value: formatPrice(stats.totalRevenue), color: 'text-green-500', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Tickets Sold', value: stats.totalTicketsSold, color: 'text-blue-500', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
          { label: 'Upcoming Events', value: stats.upcomingEvents, color: 'text-purple-500', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { label: 'Total Events', value: stats.totalEvents, color: 'text-orange-500', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-black">{stat.label}</h3>
              <svg className={`w-8 h-8 ${stat.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
            </div>
            <p className="text-3xl font-bold text-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {(['events', 'posts'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-[#0E73B9] text-[#0E73B9]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'events' ? '📅 Events' : '📸 Posts'}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Events Tab ── */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-black">Event Performance</h2>
          </div>
          {eventStats.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-black mb-4">No events created yet</p>
              <Link href="/organiser/create-event" className="inline-block bg-[#0d3b66] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#0a2f52] transition">
                Create Your First Event
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Event Name', 'Date', 'Tickets Sold', 'Capacity', 'Revenue', 'Fill Rate', 'Actions'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eventStats.map((event) => {
                    const fillRate = (event.ticketsSold / event.capacity) * 100;
                    return (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link href={`/events/${event.id}`} className="text-[#0d3b66] hover:text-[#1a5a96] font-medium">
                            {event.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-black text-sm">
                          {new Date(event.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-black">{event.ticketsSold}</td>
                        <td className="px-6 py-4 text-black">{event.capacity}</td>
                        <td className="px-6 py-4 text-black font-semibold">{formatPrice(event.revenue)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${fillRate >= 80 ? 'bg-green-500' : fillRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(fillRate, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-black w-12">{fillRate.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Link href={`/organiser/edit-event/${event.id}`} className="text-[#0d3b66] hover:text-[#0a2f52] font-medium text-sm">Edit</Link>
                            <button
                              onClick={() => handleDeleteEvent(event.id, event.title)}
                              disabled={deletingId === event.id}
                              className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                            >
                              {deletingId === event.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Posts Tab ── */}
      {activeTab === 'posts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-black">Society Posts</h2>
            <button
              onClick={() => setShowPostForm((v) => !v)}
              className="bg-[#0E73B9] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0a5a94] transition"
            >
              {showPostForm ? 'Cancel' : '+ New Post'}
            </button>
          </div>

          {/* New post form */}
          {showPostForm && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Create Promotional Post</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Society select */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Society *</label>
                  <select
                    value={postForm.societyId}
                    onChange={(e) => setPostForm((f) => ({ ...f, societyId: e.target.value, eventId: '' }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0E73B9]"
                  >
                    <option value="">Select society…</option>
                    {organiserSocieties.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Event select */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Link to Event (optional)</label>
                  <select
                    value={postForm.eventId}
                    onChange={(e) => setPostForm((f) => ({ ...f, eventId: e.target.value }))}
                    disabled={!postForm.societyId}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0E73B9] disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">No event</option>
                    {societyEvents.map((e) => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>

                {/* Image upload */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Post Image * (max 5 MB)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#0E73B9]/10 file:text-[#0E73B9] hover:file:bg-[#0E73B9]/20"
                  />
                  {postForm.imagePreview && (
                    <div className="mt-2 relative h-40 w-40 rounded-lg overflow-hidden">
                      <Image src={postForm.imagePreview} alt="Preview" fill className="object-cover" />
                    </div>
                  )}
                </div>

                {/* Caption */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Caption * <span className="text-gray-400">({postForm.caption.length}/500)</span>
                  </label>
                  <textarea
                    value={postForm.caption}
                    onChange={(e) => setPostForm((f) => ({ ...f, caption: e.target.value.slice(0, 500) }))}
                    rows={3}
                    placeholder="Write a compelling caption for your post…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0E73B9] resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={handlePostSubmit}
                  disabled={postSubmitting || !postForm.societyId || !postForm.imageUrl || !postForm.caption.trim()}
                  className="bg-[#0E73B9] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#0a5a94] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {postSubmitting ? 'Posting…' : 'Publish Post'}
                </button>
              </div>
            </div>
          )}

          {/* Posts grid */}
          {postsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0E73B9]" />
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <p className="text-gray-500 mb-3">No posts yet</p>
              <p className="text-sm text-gray-400">Create a promotional post to showcase your events on the Societies page.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Post image */}
                  <div className="relative aspect-square">
                    <Image src={post.imageUrl} alt="Post" fill className="object-cover" />
                    {post.isPinned && (
                      <span className="absolute top-2 left-2 bg-[#0E73B9] text-white text-xs px-2 py-0.5 rounded-full">
                        📌 Featured
                      </span>
                    )}
                  </div>
                  {/* Post details */}
                  <div className="p-3">
                    <p className="text-xs font-semibold text-[#0E73B9] mb-0.5">{post.societyName}</p>
                    {post.event && (
                      <p className="text-xs text-gray-400 mb-1">🎟 {post.event.title}</p>
                    )}
                    <p className="text-xs text-gray-700 line-clamp-2 mb-2">{post.caption}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">❤️ {post.likeCount} likes</span>
                      <button
                        onClick={() => handlePinToggle(post)}
                        disabled={pinning === post.id}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                          post.isPinned
                            ? 'bg-[#0E73B9]/10 text-[#0E73B9] hover:bg-red-50 hover:text-red-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-[#0E73B9]/10 hover:text-[#0E73B9]'
                        }`}
                      >
                        {pinning === post.id ? '…' : post.isPinned ? 'Unpin' : 'Pin as Featured'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
