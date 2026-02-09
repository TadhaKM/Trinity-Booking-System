import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import toast from 'react-hot-toast';
import { ChatAction, EventDraft } from './chat-store';

interface ExecutorContext {
  router: AppRouterInstance;
  setEventDraft: (draft: EventDraft | null) => void;
}

export function executeAction(action: ChatAction, ctx: ExecutorContext) {
  switch (action.type) {
    case 'NAVIGATE':
      if (action.payload.path) {
        ctx.router.push(action.payload.path);
      }
      break;

    case 'FILL_FORM':
      if (action.payload.formType === 'create-event') {
        ctx.setEventDraft(action.payload.data as EventDraft);
        ctx.router.push('/organiser/create-event');
      } else if (action.payload.formType === 'edit-event' && action.payload.eventId) {
        ctx.router.push(`/organiser/edit-event/${action.payload.eventId}`);
      }
      break;

    case 'SHOW_TOAST': {
      const toastType = action.payload.type || 'success';
      const message = action.payload.message || '';
      if (toastType === 'error') toast.error(message);
      else if (toastType === 'info') toast(message);
      else toast.success(message);
      break;
    }

    case 'OPEN_MODAL':
      // Future: trigger modal state if needed
      break;
  }
}
