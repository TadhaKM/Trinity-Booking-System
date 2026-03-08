'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useChatStore } from '@/lib/chat-store';
import { Society } from '@/lib/types';
import ComboBox from '@/components/ComboBox';
import ImageUpload from '@/components/ImageUpload';

interface TicketTypeForm {
  name: string;
  price: number;
  quantity: number;
}

interface ConflictEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
}

export default function CreateEventPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const eventDraft = useChatStore((s) => s.eventDraft);
  const setEventDraft = useChatStore((s) => s.setEventDraft);
  const addChatMessage = useChatStore((s) => s.addMessage);

  const [societies, setSocieties] = useState<Society[]>([]);
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    societyId: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    category: 'Arts & Culture',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    tags: '',
    venueCapacity: '' as string | number,
  });

  const [ticketTypes, setTicketTypes] = useState<TicketTypeForm[]>([
    { name: 'General Admission', price: 0, quantity: 100 },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!user.isOrganiser) {
      router.push('/');
      return;
    }

    const fetchSocieties = async () => {
      try {
        const res = await fetch(`/api/organiser/${user.id}/societies`);
        const data = await res.json();
        setSocieties(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching societies:', error);
      }
    };

    fetchSocieties();
  }, [user, router]);

  // Pre-fill form from chatbot event draft
  useEffect(() => {
    if (eventDraft) {
      setFormData((prev) => ({
        ...prev,
        title: eventDraft.title || prev.title,
        description: eventDraft.description || prev.description,
        societyId: eventDraft.societyId || prev.societyId,
        startDate: eventDraft.startDate || prev.startDate,
        startTime: eventDraft.startTime || prev.startTime,
        endDate: eventDraft.endDate || prev.endDate,
        endTime: eventDraft.endTime || prev.endTime,
        location: eventDraft.location || prev.location,
        category: eventDraft.category || prev.category,
        tags: eventDraft.tags || prev.tags,
      }));
      if (eventDraft.ticketTypes && eventDraft.ticketTypes.length > 0) {
        setTicketTypes(eventDraft.ticketTypes);
      }
      setEventDraft(null);
    }
  }, [eventDraft, setEventDraft]);

  const checkConflicts = async () => {
    if (!formData.startDate || !formData.startTime || !formData.location) {
      return;
    }

    setCheckingConflicts(true);
    try {
      const startDateTime = `${formData.startDate}T${formData.startTime}`;
      const endDateTime = formData.endDate && formData.endTime
        ? `${formData.endDate}T${formData.endTime}`
        : startDateTime;

      const res = await fetch('/api/events/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDateTime,
          endDate: endDateTime,
          location: formData.location,
        }),
      });

      const data = await res.json();
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingConflicts(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      checkConflicts();
    }, 500);

    return () => clearTimeout(debounce);
  }, [formData.startDate, formData.startTime, formData.endDate, formData.endTime, formData.location]);

  const handleAddTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
      { name: '', price: 0, quantity: 0 },
    ]);
  };

  const handleRemoveTicketType = (index: number) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const handleTicketTypeChange = (
    index: number,
    field: keyof TicketTypeForm,
    value: string | number
  ) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    setTicketTypes(updated);
  };

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Event title must be at least 3 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Event description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Please provide a more detailed description (at least 20 characters)';
    }

    // Society validation
    if (!formData.societyId) {
      newErrors.societyId = 'Please select a society for this event';
    }

    // Date and time validation
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`);
      const now = new Date();
      if (startDateTime < now) {
        newErrors.startDate = 'Start date and time must be in the future';
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    // End date/time validation (if provided)
    if (formData.endDate && formData.startDate) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime || '23:59'}`);
      if (endDateTime <= startDateTime) {
        newErrors.endDate = 'End date/time must be after the start date/time';
      }
    }

    if (formData.endDate && !formData.endTime) {
      newErrors.endTime = 'Please specify an end time when you set an end date';
    }

    if (formData.endTime && !formData.endDate) {
      newErrors.endDate = 'Please specify an end date when you set an end time';
    }

    // Location validation
    if (!formData.location.trim()) {
      newErrors.location = 'Event location is required';
    }

    // Ticket types validation
    ticketTypes.forEach((tt, index) => {
      if (!tt.name.trim()) {
        newErrors[`ticketType_${index}_name`] = 'Ticket type name is required';
      }
      if (tt.quantity <= 0) {
        newErrors[`ticketType_${index}_quantity`] = 'Quantity must be at least 1';
      }
      if (tt.price < 0) {
        newErrors[`ticketType_${index}_price`] = 'Price cannot be negative';
      }
    });

    if (ticketTypes.length === 0) {
      newErrors.ticketTypes = 'At least one ticket type is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      // Scroll to the first error
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);
    try {
      const startDateTime = `${formData.startDate}T${formData.startTime}`;
      const endDateTime = formData.endDate && formData.endTime
        ? `${formData.endDate}T${formData.endTime}`
        : startDateTime;

      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startDate: startDateTime,
          endDate: endDateTime,
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
          ticketTypes,
          organiserId: user.id,
          venueCapacity: formData.venueCapacity ? Number(formData.venueCapacity) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        addChatMessage({
          role: 'assistant',
          content: `Your event **"${formData.title}"** has been created successfully! You can view it on the event page.`,
          actions: [{ type: 'NAVIGATE', payload: { path: `/events/${data.id}` } }],
        });
        router.push(`/events/${data.id}`);
      } else {
        const errorData = await res.json();
        setErrors({
          submit: errorData.error || 'Failed to create event. Please check your information and try again.'
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      setErrors({
        submit: 'An unexpected error occurred while creating the event. Please try again.'
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8 text-black">Create New Event</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-red-800">Please fix the following errors:</h3>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-black">
                Event Title *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (errors.title) setErrors({ ...errors, title: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter event title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) setErrors({ ...errors, description: '' });
                }}
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe your event"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">
                Society *
              </label>
              <ComboBox
                id="societyId"
                value={formData.societyId}
                onChange={(value) => {
                  setFormData({ ...formData, societyId: value });
                  if (errors.societyId) setErrors({ ...errors, societyId: '' });
                }}
                options={societies.map((s) => ({ label: s.name, value: s.id }))}
                placeholder="Search or type a society name..."
                error={errors.societyId}
                allowCustom
              />
              {errors.societyId && (
                <p className="mt-1 text-sm text-red-600">{errors.societyId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">
                Category *
              </label>
              <ComboBox
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
                options={[
                  { label: 'Arts & Culture', value: 'Arts & Culture' },
                  { label: 'Music', value: 'Music' },
                  { label: 'Academic', value: 'Academic' },
                  { label: 'Sports & Fitness', value: 'Sports & Fitness' },
                  { label: 'Debate & Speaking', value: 'Debate & Speaking' },
                  { label: 'Social', value: 'Social' },
                ]}
                placeholder="Search or type a category..."
                allowCustom
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500"
                placeholder="e.g., music, concert, live"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">
                Event Image/Thumbnail
              </label>
              <ImageUpload
                currentImage={formData.imageUrl || undefined}
                onImageChange={(dataUri) => setFormData({ ...formData, imageUrl: dataUri })}
                maxSizeMB={2}
              />
              <div className="mt-3">
                <p className="text-sm font-medium text-black mb-2">Or enter URL:</p>
                <input
                  type="url"
                  value={formData.imageUrl.startsWith('data:') ? '' : formData.imageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium text-black mb-2">Quick select:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Concert', url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800' },
                    { label: 'Academic', url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800' },
                    { label: 'Sports', url: 'https://images.unsplash.com/photo-1461896836934-49b71db6e8fa?w=800' },
                    { label: 'Social', url: 'https://images.unsplash.com/photo-1529543544277-815a6419f089?w=800' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: preset.url })}
                      className="px-3 py-1 text-xs bg-[#e8f0f8] text-[#0d3b66] rounded-full hover:bg-[#d0e2f0] transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Date, Time & Location */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Date, Time & Location</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-black">
                Start Date *
              </label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => {
                  setFormData({ ...formData, startDate: e.target.value });
                  if (errors.startDate) setErrors({ ...errors, startDate: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">
                Start Time *
              </label>
              <input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => {
                  setFormData({ ...formData, startTime: e.target.value });
                  if (errors.startTime) setErrors({ ...errors, startTime: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
                  errors.startTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startTime && (
                <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">End Date</label>
              <input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => {
                  setFormData({ ...formData, endDate: e.target.value });
                  if (errors.endDate) setErrors({ ...errors, endDate: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">End Time</label>
              <input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => {
                  setFormData({ ...formData, endTime: e.target.value });
                  if (errors.endTime) setErrors({ ...errors, endTime: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
                  errors.endTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endTime && (
                <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2 text-black">
              Location *
            </label>
            <ComboBox
              id="location"
              value={formData.location}
              onChange={(value) => {
                setFormData({ ...formData, location: value });
                if (errors.location) setErrors({ ...errors, location: '' });
              }}
              options={[
                { label: 'Arts Building', value: 'Arts Building' },
                { label: 'Berkeley Library', value: 'Berkeley Library' },
                { label: 'Biomedical Sciences Institute', value: 'Biomedical Sciences Institute' },
                { label: 'Burke Theatre', value: 'Burke Theatre' },
                { label: 'Business School (Tangent)', value: 'Business School (Tangent)' },
                { label: 'Chapel', value: 'Chapel' },
                { label: 'Chemistry Building', value: 'Chemistry Building' },
                { label: 'College Green', value: 'College Green' },
                { label: 'College Park', value: 'College Park' },
                { label: 'Computer Science Building (O\'Reilly Institute)', value: "Computer Science Building (O'Reilly Institute)" },
                { label: 'Dining Hall', value: 'Dining Hall' },
                { label: 'Douglas Hyde Gallery', value: 'Douglas Hyde Gallery' },
                { label: 'Edmund Burke Theatre', value: 'Edmund Burke Theatre' },
                { label: 'Exam Hall', value: 'Exam Hall' },
                { label: 'Fitzgerald Building', value: 'Fitzgerald Building' },
                { label: 'Front Square', value: 'Front Square' },
                { label: 'GMB (Graduates Memorial Building)', value: 'GMB (Graduates Memorial Building)' },
                { label: 'Global Room', value: 'Global Room' },
                { label: 'Hamilton Building', value: 'Hamilton Building' },
                { label: 'House 6', value: 'House 6' },
                { label: 'JM Synge Theatre', value: 'JM Synge Theatre' },
                { label: 'Joly Theatre', value: 'Joly Theatre' },
                { label: 'Lecky Library', value: 'Lecky Library' },
                { label: 'Lloyd Building', value: 'Lloyd Building' },
                { label: 'Long Room Hub', value: 'Long Room Hub' },
                { label: 'Luce Hall', value: 'Luce Hall' },
                { label: 'MacNeill Theatre', value: 'MacNeill Theatre' },
                { label: 'Moyne Institute', value: 'Moyne Institute' },
                { label: 'Museum Building', value: 'Museum Building' },
                { label: 'New Square', value: 'New Square' },
                { label: 'Old Library', value: 'Old Library' },
                { label: 'Pav (Pavilion Bar)', value: 'Pav (Pavilion Bar)' },
                { label: 'Printing House', value: 'Printing House' },
                { label: 'Provost\'s House', value: "Provost's House" },
                { label: 'Public Theatre', value: 'Public Theatre' },
                { label: 'Regent House', value: 'Regent House' },
                { label: 'Rubrics', value: 'Rubrics' },
                { label: 'SAMI (Science & Art Museum Ireland)', value: 'SAMI (Science & Art Museum Ireland)' },
                { label: 'Samuel Beckett Theatre', value: 'Samuel Beckett Theatre' },
                { label: 'Science Gallery', value: 'Science Gallery' },
                { label: 'Sports Centre', value: 'Sports Centre' },
                { label: 'Student Centre (House 6)', value: 'Student Centre (House 6)' },
                { label: 'Swift Theatre', value: 'Swift Theatre' },
                { label: 'Tennis Pavilion', value: 'Tennis Pavilion' },
                { label: 'The Phil (Room)', value: 'The Phil (Room)' },
                { label: 'Ussher Library', value: 'Ussher Library' },
                { label: 'Watts Building', value: 'Watts Building' },
              ]}
              placeholder="Search or type a venue..."
              error={errors.location}
              allowCustom
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location}</p>
            )}
          </div>

          {/* Conflict Detection */}
          {checkingConflicts && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">Checking for conflicts...</p>
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">
                Scheduling Conflicts Detected
              </h3>
              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="text-sm text-yellow-700">
                    <strong>{conflict.title}</strong> at {conflict.location}
                    <br />
                    {new Date(conflict.startDate).toLocaleString()} -{' '}
                    {new Date(conflict.endDate).toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Venue Capacity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-black mb-4">Venue Capacity</h2>
          <div className="max-w-xs">
            <label className="block text-sm font-medium mb-2 text-black">
              Maximum Attendees <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              min={1}
              max={100000}
              value={formData.venueCapacity}
              onChange={(e) => setFormData({ ...formData, venueCapacity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0569b9] text-black"
              placeholder="e.g. 500"
            />
            <p className="mt-1 text-xs text-gray-500">
              If set, total ticket quantity cannot exceed this number. Shown as an occupancy percentage on the event page.
            </p>
            {formData.venueCapacity && ticketTypes.reduce((s, t) => s + t.quantity, 0) > Number(formData.venueCapacity) && (
              <p className="mt-2 text-sm text-red-600 font-medium">
                Warning: total ticket quantity ({ticketTypes.reduce((s, t) => s + t.quantity, 0)}) exceeds venue capacity ({formData.venueCapacity}).
              </p>
            )}
          </div>
        </div>

        {/* Ticket Types */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-black">Ticket Types</h2>
            <button
              type="button"
              onClick={handleAddTicketType}
              className="bg-[#0d3b66] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#0a2f52] transition"
            >
              Add Ticket Type
            </button>
          </div>

          {errors.ticketTypes && (
            <p className="mb-4 text-sm text-red-600">{errors.ticketTypes}</p>
          )}

          <div className="space-y-4">
            {ticketTypes.map((ticketType, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  errors[`ticketType_${index}_name`] || errors[`ticketType_${index}_quantity`] || errors[`ticketType_${index}_price`]
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2 text-black">
                      Name *
                    </label>
                    <input
                      id={`ticketType_${index}_name`}
                      type="text"
                      value={ticketType.name}
                      onChange={(e) => {
                        handleTicketTypeChange(index, 'name', e.target.value);
                        if (errors[`ticketType_${index}_name`]) {
                          const newErrors = { ...errors };
                          delete newErrors[`ticketType_${index}_name`];
                          setErrors(newErrors);
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
                        errors[`ticketType_${index}_name`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., General Admission"
                    />
                    {errors[`ticketType_${index}_name`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`ticketType_${index}_name`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-black">
                      Price (EUR) *
                    </label>
                    <input
                      id={`ticketType_${index}_price`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={ticketType.price}
                      onChange={(e) => {
                        handleTicketTypeChange(index, 'price', parseFloat(e.target.value) || 0);
                        if (errors[`ticketType_${index}_price`]) {
                          const newErrors = { ...errors };
                          delete newErrors[`ticketType_${index}_price`];
                          setErrors(newErrors);
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
                        errors[`ticketType_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[`ticketType_${index}_price`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`ticketType_${index}_price`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-black">
                      Quantity *
                    </label>
                    <input
                      id={`ticketType_${index}_quantity`}
                      type="number"
                      min="1"
                      value={ticketType.quantity}
                      onChange={(e) => {
                        handleTicketTypeChange(index, 'quantity', parseInt(e.target.value) || 0);
                        if (errors[`ticketType_${index}_quantity`]) {
                          const newErrors = { ...errors };
                          delete newErrors[`ticketType_${index}_quantity`];
                          setErrors(newErrors);
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
                        errors[`ticketType_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[`ticketType_${index}_quantity`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`ticketType_${index}_quantity`]}</p>
                    )}
                  </div>
                </div>

                {ticketTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTicketType(index)}
                    className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-200 text-black py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#0d3b66] text-white py-3 rounded-lg font-semibold hover:bg-[#0a2f52] transition disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
