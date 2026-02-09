import Anthropic from '@anthropic-ai/sdk';

export const chatTools: Anthropic.Tool[] = [
  {
    name: 'navigate',
    description: 'Navigate the user to a specific page in the application.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The URL path, e.g. "/search", "/events/abc123", "/organiser/dashboard"',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_events',
    description: 'Search for upcoming events by keyword and/or category. Returns matching events with details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search keyword (matches title, description, tags, society name)' },
        category: { type: 'string', description: 'Event category filter' },
      },
    },
  },
  {
    name: 'search_societies',
    description: 'Search for societies/clubs by name or category.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search keyword for society name' },
      },
    },
  },
  {
    name: 'fetch_event',
    description: 'Fetch full details about a specific event by its ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        eventId: { type: 'string', description: 'The event ID to look up' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'fetch_society',
    description: 'Fetch details about a specific society by its ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        societyId: { type: 'string', description: 'The society ID to look up' },
      },
      required: ['societyId'],
    },
  },
  {
    name: 'fetch_organiser_stats',
    description: 'Fetch dashboard statistics for the current organiser (their events, ticket sales, etc). Only available to organisers.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'prepare_event_draft',
    description: 'Prepare event creation data to pre-fill the create-event form. Use this after collecting all required fields from the organiser. The user will still need to review and submit the form.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Event title' },
        description: { type: 'string', description: 'Event description' },
        societyId: { type: 'string', description: 'Society ID (must be one the organiser manages)' },
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        startTime: { type: 'string', description: 'Start time in HH:mm format' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        endTime: { type: 'string', description: 'End time in HH:mm format' },
        location: { type: 'string', description: 'Venue/location name' },
        category: { type: 'string', description: 'Event category' },
        tags: { type: 'string', description: 'Comma-separated tags' },
        ticketTypes: {
          type: 'array',
          description: 'Array of ticket types',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
              quantity: { type: 'number' },
            },
            required: ['name', 'price', 'quantity'],
          },
        },
      },
      required: ['title', 'societyId'],
    },
  },
  {
    name: 'prepare_event_edit',
    description: 'Prepare changes for an existing event. Shows what will change for user confirmation. The user must review and confirm on the edit page.',
    input_schema: {
      type: 'object' as const,
      properties: {
        eventId: { type: 'string', description: 'The event ID to edit' },
        changes: {
          type: 'object',
          description: 'Key-value pairs of fields to update (e.g. { "title": "New Title", "location": "New Venue" })',
        },
      },
      required: ['eventId', 'changes'],
    },
  },
  {
    name: 'delete_event',
    description: 'Permanently delete an event from the database. Only use this AFTER the user has explicitly confirmed they want to delete. This action cannot be undone.',
    input_schema: {
      type: 'object' as const,
      properties: {
        eventId: { type: 'string', description: 'The event ID to delete' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'show_toast',
    description: 'Show a brief notification toast to the user.',
    input_schema: {
      type: 'object' as const,
      properties: {
        message: { type: 'string', description: 'Toast message text' },
        type: { type: 'string', enum: ['success', 'error', 'info'], description: 'Toast style' },
      },
      required: ['message'],
    },
  },
];

const ORGANISER_ONLY_TOOLS = [
  'prepare_event_draft',
  'prepare_event_edit',
  'delete_event',
  'fetch_organiser_stats',
];

export function filterToolsByRole(role: string): Anthropic.Tool[] {
  if (role === 'admin' || role === 'organiser') return chatTools;
  return chatTools.filter((t) => !ORGANISER_ONLY_TOOLS.includes(t.name));
}
