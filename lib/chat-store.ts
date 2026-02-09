import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ChatAction {
  type: 'NAVIGATE' | 'FILL_FORM' | 'SHOW_TOAST' | 'OPEN_MODAL';
  payload: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatAction[];
  timestamp: number;
}

export interface EventDraft {
  title?: string;
  description?: string;
  societyId?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  category?: string;
  tags?: string;
  ticketTypes?: { name: string; price: number; quantity: number }[];
}

interface ChatStore {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  eventDraft: EventDraft | null;

  setOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setEventDraft: (draft: EventDraft | null) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      isOpen: false,
      isLoading: false,
      eventDraft: null,

      setOpen: (open) => set({ isOpen: open }),
      setLoading: (loading) => set({ isLoading: loading }),

      addMessage: (msg) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...msg,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: Date.now(),
            },
          ],
        })),

      clearMessages: () => set({ messages: [] }),
      setEventDraft: (draft) => set({ eventDraft: draft }),
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages,
        eventDraft: state.eventDraft,
      }),
    }
  )
);
