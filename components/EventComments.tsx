'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface CommentUser {
  id: string;
  name: string;
}

interface Comment {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  isHidden: boolean;
  parentId: string | null;
  user: CommentUser;
  replies?: Comment[];
}

interface EventCommentsProps {
  eventId: string;
  organiserId?: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m} minute${m !== 1 ? 's' : ''} ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h} hour${h !== 1 ? 's' : ''} ago`;
  }
  if (diff < 2592000) {
    const d = Math.floor(diff / 86400);
    return `${d} day${d !== 1 ? 's' : ''} ago`;
  }
  if (diff < 31536000) {
    const mo = Math.floor(diff / 2592000);
    return `${mo} month${mo !== 1 ? 's' : ''} ago`;
  }
  const y = Math.floor(diff / 31536000);
  return `${y} year${y !== 1 ? 's' : ''} ago`;
}

const AVATAR_COLORS = [
  'bg-[#0569b9]',
  'bg-[#0A2E6E]',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-teal-500',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div
      className={`${dim} ${avatarColor(name)} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 select-none`}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 bg-gray-200 rounded-full" />
            <div className="h-3 w-full bg-gray-200 rounded-full" />
            <div className="h-3 w-2/3 bg-gray-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Single comment row ─────────────────────────────────────────────────────── */

function CommentRow({
  comment,
  organiserId,
  currentUserId,
  isOrganiser: viewerIsOrganiser,
  onDelete,
  onReply,
  replyingToId,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  submitting,
  depth,
}: {
  comment: Comment;
  organiserId?: string;
  currentUserId?: string;
  isOrganiser: boolean;
  onDelete: (id: string) => void;
  onReply: (id: string | null) => void;
  replyingToId: string | null;
  replyText: string;
  onReplyTextChange: (v: string) => void;
  onSubmitReply: (parentId: string) => void;
  submitting: boolean;
  depth: number;
}) {
  const [showAllReplies, setShowAllReplies] = useState(false);
  const MAX_VISIBLE_REPLIES = 3;

  const isHidden = comment.isHidden;
  const canDelete =
    currentUserId === comment.userId || viewerIsOrganiser;
  const isAuthorOrganiser = organiserId && comment.userId === organiserId;

  const replies = comment.replies ?? [];
  const visibleReplies = showAllReplies ? replies : replies.slice(0, MAX_VISIBLE_REPLIES);
  const hiddenCount = replies.length - MAX_VISIBLE_REPLIES;

  return (
    <div className={depth > 0 ? 'ml-10 mt-3' : ''}>
      <div className="flex gap-3">
        <Avatar name={isHidden ? '?' : comment.user.name} size={depth > 0 ? 'sm' : 'md'} />
        <div className="flex-1 min-w-0">
          {isHidden && !viewerIsOrganiser ? (
            <p className="text-gray-400 italic text-sm">[comment removed]</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="font-semibold text-[#0A2E6E] text-sm">
                  {comment.user.name}
                </span>
                {isAuthorOrganiser && (
                  <span className="px-2 py-0.5 rounded-full bg-[#0569b9]/10 text-[#0569b9] text-xs font-semibold">
                    Organiser
                  </span>
                )}
                {isHidden && viewerIsOrganiser && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
                    Hidden
                  </span>
                )}
                <span className="text-gray-400 text-xs">{timeAgo(comment.createdAt)}</span>
              </div>

              <p className="text-gray-700 text-sm leading-relaxed break-words">{comment.body}</p>

              <div className="flex items-center gap-4 mt-1.5">
                {currentUserId && depth === 0 && (
                  <button
                    onClick={() =>
                      onReply(replyingToId === comment.id ? null : comment.id)
                    }
                    className="text-xs text-gray-500 hover:text-[#0569b9] font-medium transition-colors"
                  >
                    Reply
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </>
          )}

          {/* Inline reply form */}
          {replyingToId === comment.id && (
            <div className="mt-3 space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                placeholder={`Reply to ${comment.user.name}…`}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0569b9]/40 focus:border-[#0569b9] resize-none text-gray-800 placeholder:text-gray-400 bg-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onSubmitReply(comment.id)}
                  disabled={submitting || replyText.trim().length < 1}
                  className="px-4 py-1.5 bg-[#0569b9] text-white text-xs font-semibold rounded-xl hover:bg-[#0A2E6E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Posting…' : 'Post reply'}
                </button>
                <button
                  onClick={() => onReply(null)}
                  className="px-4 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-1">
          {visibleReplies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              organiserId={organiserId}
              currentUserId={currentUserId}
              isOrganiser={viewerIsOrganiser}
              onDelete={onDelete}
              onReply={onReply}
              replyingToId={replyingToId}
              replyText={replyText}
              onReplyTextChange={onReplyTextChange}
              onSubmitReply={onSubmitReply}
              submitting={submitting}
              depth={depth + 1}
            />
          ))}
          {!showAllReplies && hiddenCount > 0 && (
            <button
              onClick={() => setShowAllReplies(true)}
              className="ml-10 mt-2 text-xs text-[#0569b9] hover:underline font-medium"
            >
              Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */

export default function EventComments({ eventId, organiserId }: EventCommentsProps) {
  const user = useAuthStore((state) => state.user);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/comments`);
      if (!res.ok) throw new Error('Failed to load comments');
      const data = await res.json();
      setComments(Array.isArray(data) ? data : (data.comments ?? []));
    } catch {
      setError('Could not load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Reset reply text when target changes
  useEffect(() => {
    setReplyText('');
  }, [replyingTo]);

  const handlePost = async () => {
    if (!user || newComment.trim().length < 1) return;
    setSubmitting(true);

    // Optimistic add
    const optimistic: Comment = {
      id: `optimistic-${Date.now()}`,
      userId: user.id,
      body: newComment.trim(),
      createdAt: new Date().toISOString(),
      isHidden: false,
      parentId: null,
      user: { id: user.id, name: user.name },
      replies: [],
    };
    setComments((prev) => [optimistic, ...prev]);
    setNewComment('');

    try {
      await fetch(`/api/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, body: optimistic.body }),
      });
      // Re-fetch to get server-confirmed data
      await fetchComments();
    } catch {
      // Roll back optimistic if failed
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      setError('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!user || replyText.trim().length < 1) return;
    setSubmitting(true);

    // Optimistic reply
    const optimistic: Comment = {
      id: `optimistic-reply-${Date.now()}`,
      userId: user.id,
      body: replyText.trim(),
      createdAt: new Date().toISOString(),
      isHidden: false,
      parentId,
      user: { id: user.id, name: user.name },
      replies: [],
    };
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies ?? []), optimistic] }
          : c
      )
    );
    setReplyingTo(null);
    setReplyText('');

    try {
      await fetch(`/api/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, body: optimistic.body, parentId }),
      });
      await fetchComments();
    } catch {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== optimistic.id) }
            : c
        )
      );
      setError('Failed to post reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;
    // Optimistic removal: mark as hidden
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) return { ...c, isHidden: true };
        return {
          ...c,
          replies: (c.replies ?? []).map((r) =>
            r.id === commentId ? { ...r, isHidden: true } : r
          ),
        };
      })
    );
    try {
      await fetch(`/api/events/${eventId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch {
      // Restore on failure
      await fetchComments();
    }
  };

  const topLevel = comments.filter((c) => !c.parentId);
  const viewerIsOrganiser = !!(user && organiserId && user.id === organiserId);

  return (
    <section className="font-[Manrope,sans-serif]">
      <h2 className="text-xl font-bold text-[#0A2E6E] mb-5">
        Comments{topLevel.length > 0 && ` (${topLevel.length})`}
      </h2>

      {/* Compose box */}
      <div className="mb-6">
        {user ? (
          <div className="flex gap-3">
            <Avatar name={user.name} />
            <div className="flex-1 space-y-2">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                rows={3}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0569b9]/40 focus:border-[#0569b9] resize-none text-gray-800 placeholder:text-gray-400 bg-white shadow-sm"
              />
              <div className="flex justify-end">
                <button
                  onClick={handlePost}
                  disabled={submitting || newComment.trim().length < 1}
                  className="px-5 py-2 bg-[#0569b9] text-white text-sm font-semibold rounded-xl hover:bg-[#0A2E6E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 bg-[#EFF2F7] rounded-2xl text-sm text-gray-600">
            <Link
              href="/login"
              className="text-[#0569b9] font-semibold hover:underline"
            >
              Log in
            </Link>{' '}
            to comment on this event.
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && <CommentSkeleton />}

      {/* Empty state */}
      {!loading && !error && topLevel.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <svg
            className="w-10 h-10 mx-auto mb-3 opacity-40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="font-medium">No comments yet. Be the first to ask a question!</p>
        </div>
      )}

      {/* Comment list */}
      {!loading && topLevel.length > 0 && (
        <div className="space-y-5">
          {topLevel.map((comment) => (
            <div
              key={comment.id}
              className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100"
            >
              <CommentRow
                comment={comment}
                organiserId={organiserId}
                currentUserId={user?.id}
                isOrganiser={viewerIsOrganiser}
                onDelete={handleDelete}
                onReply={setReplyingTo}
                replyingToId={replyingTo}
                replyText={replyText}
                onReplyTextChange={setReplyText}
                onSubmitReply={handleReplySubmit}
                submitting={submitting}
                depth={0}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
