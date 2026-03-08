'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useChatStore, ChatAction } from '@/lib/chat-store';
import { executeAction } from '@/lib/chat-action-executor';

export default function ChatWidget() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    messages,
    isOpen,
    isLoading,
    setOpen,
    setLoading,
    addMessage,
    clearMessages,
    setEventDraft,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const DEMO_MSG_LIMIT = 8;

  const getGuestCount = (): number => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem('guest-chat-count') || '0', 10);
  };

  // Count how many user messages have been sent this session
  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  const demoLimitReached = !!user && userMsgCount >= DEMO_MSG_LIMIT;
  const demoMsgsLeft = user ? Math.max(0, DEMO_MSG_LIMIT - userMsgCount) : null;

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || isLoading) return;

    // Guest rate limiting (client-side)
    if (!user) {
      const count = getGuestCount();
      if (count >= 5) {
        addMessage({
          role: 'assistant',
          content:
            "You've reached the guest message limit. Please sign in or create an account to keep chatting!",
          actions: [{ type: 'NAVIGATE', payload: { path: '/login' } }],
        });
        return;
      }
      localStorage.setItem('guest-chat-count', String(count + 1));
    }

    // Demo limit (client-side guard, server also enforces)
    if (demoLimitReached) return;

    addMessage({ role: 'user', content: text });
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: text },
          ],
          userId: user?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addMessage({
          role: 'assistant',
          content: data.error || 'Sorry, something went wrong. Please try again.',
        });
        return;
      }

      addMessage({
        role: 'assistant',
        content: data.message,
        actions: data.actions,
      });

      // Execute returned actions
      if (data.actions && Array.isArray(data.actions)) {
        for (const action of data.actions as ChatAction[]) {
          executeAction(action, { router, setEventDraft });
        }
      }
    } catch {
      addMessage({
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!mounted) return null;

  // FAB button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#0E73B9] text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center"
        aria-label="Open chat"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {user && demoLimitReached && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold" title="Demo limit reached">
            !
          </span>
        )}
        {user && !demoLimitReached && userMsgCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#0A2E6E] rounded-full text-xs flex items-center justify-center font-bold" title={`${DEMO_MSG_LIMIT - userMsgCount} demo messages left`}>
            {DEMO_MSG_LIMIT - userMsgCount}
          </span>
        )}
      </button>
    );
  }

  // Chat panel when open
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="bg-[#0E73B9] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm">TCD Tickets Assistant</h3>
            <p className="text-xs text-white/70">
              {user ? `Hi, ${user.name.split(' ')[0]}` : 'Ask me anything'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-1.5 hover:bg-white/20 rounded-lg transition text-white/70 hover:text-white"
              title="Clear chat"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-slate-900">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-[#0E73B9]/10 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-[#0E73B9]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Welcome to TCD Tickets!
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Ask about events, societies, or get help navigating the site.
            </p>
            {!user && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                Guest: {5 - getGuestCount()} messages remaining
              </p>
            )}
            {user && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                Demo: {DEMO_MSG_LIMIT} AI messages included
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {[
                'What events are coming up?',
                'Search music events',
                'Help me find a society',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="text-xs px-3 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full text-gray-600 dark:text-[#93c5fd] hover:bg-[#0569b9] dark:hover:bg-[#0569b9] hover:text-white dark:hover:text-white hover:border-[#0569b9] dark:hover:border-[#0569b9] transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#0569b9] text-white rounded-2xl rounded-br-md'
                  : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 dark:border-slate-600'
              }`}
            >
              <MessageContent content={msg.content} />

              {/* Render action buttons for navigate actions */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.actions.map((action, i) => (
                    <ActionButton
                      key={i}
                      action={action}
                      onClick={() =>
                        executeAction(action, { router, setEventDraft })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100 dark:border-slate-600">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-gray-400 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Guest limit warning */}
      {!user && getGuestCount() >= 4 && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2 flex-shrink-0">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>
            {5 - getGuestCount() <= 0
              ? 'Message limit reached.'
              : `${5 - getGuestCount()} guest message${5 - getGuestCount() === 1 ? '' : 's'} left.`}{' '}
            <button
              onClick={() => router.push('/login')}
              className="underline font-medium hover:text-amber-900"
            >
              Sign in
            </button>{' '}
            for unlimited chat.
          </span>
        </div>
      )}

      {/* Demo limit — logged-in user countdown / lockout */}
      {user && demoMsgsLeft !== null && demoMsgsLeft <= 3 && (
        <div className={`px-3 py-2 border-t text-xs flex items-center gap-2 flex-shrink-0 ${
          demoLimitReached
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
        }`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>
            {demoLimitReached
              ? 'Demo limit reached — that\'s all for this demo!'
              : `${demoMsgsLeft} demo message${demoMsgsLeft === 1 ? '' : 's'} left.`}
          </span>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-slate-700 px-3 py-2.5 flex gap-2 items-center bg-white dark:bg-slate-800 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={demoLimitReached ? 'Demo message limit reached' : 'Type a message...'}
          disabled={isLoading || demoLimitReached}
          className="flex-1 text-sm px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0569b9]/30 focus:border-[#0569b9] text-black dark:text-slate-100 dark:bg-slate-700 placeholder:text-gray-400 dark:placeholder:text-slate-500 disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim() || demoLimitReached}
          className="w-9 h-9 rounded-full bg-[#0E73B9] text-white flex items-center justify-center hover:bg-[#0b5d94] transition disabled:opacity-40 disabled:hover:bg-[#0E73B9] flex-shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Simple markdown-lite renderer for assistant messages
function MessageContent({ content }: { content: string }) {
  // Split by newlines, render bold (**text**) and links
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;

        // Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={i} className="flex gap-1.5 items-start">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-current flex-shrink-0" />
              <span>{renderInline(line.trim().slice(2))}</span>
            </div>
          );
        }

        // Numbered lists
        const numMatch = line.trim().match(/^(\d+)[.)]\s/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-1.5 items-start">
              <span className="font-medium flex-shrink-0">{numMatch[1]}.</span>
              <span>{renderInline(line.trim().slice(numMatch[0].length))}</span>
            </div>
          );
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function ActionButton({
  action,
  onClick,
}: {
  action: ChatAction;
  onClick: () => void;
}) {
  let label = '';
  switch (action.type) {
    case 'NAVIGATE':
      label = `Go to ${action.payload.label || 'page'}`;
      break;
    case 'FILL_FORM':
      label =
        action.payload.formType === 'create-event'
          ? 'Open Create Event Form'
          : 'Open Edit Form';
      break;
    case 'SHOW_TOAST':
      return null; // Toasts auto-execute, no button needed
    default:
      return null;
  }

  return (
    <button
      onClick={onClick}
      className="text-xs px-2.5 py-1 bg-[#0E73B9]/10 text-[#0E73B9] rounded-full hover:bg-[#0E73B9] hover:text-white transition font-medium"
    >
      {label}
    </button>
  );
}
