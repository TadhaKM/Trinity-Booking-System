'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Society } from '@/lib/types';

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
        }),
      });

      if (res.ok) {
        const data = await res.json();
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
              <select
                id="societyId"
                value={formData.societyId}
                onChange={(e) => {
                  setFormData({ ...formData, societyId: e.target.value });
                  if (errors.societyId) setErrors({ ...errors, societyId: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
                  errors.societyId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a society</option>
                {societies.map((society) => (
                  <option key={society.id} value={society.id}>
                    {society.name}
                  </option>
                ))}
              </select>
              {errors.societyId && (
                <p className="mt-1 text-sm text-red-600">{errors.societyId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500"
              >
                <option>Arts & Culture</option>
                <option>Music</option>
                <option>Academic</option>
                <option>Sports & Fitness</option>
                <option>Debate & Speaking</option>
                <option>Social</option>
              </select>
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
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500"
                placeholder="https://example.com/image.jpg"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter a URL for your event image. Leave blank for default image.
              </p>
              {formData.imageUrl && (
                <div className="mt-3">
                  <p className="text-sm text-black mb-2">Preview:</p>
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={formData.imageUrl}
                      alt="Event preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
                      }}
                    />
                  </div>
                </div>
              )}
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
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => {
                setFormData({ ...formData, location: e.target.value });
                if (errors.location) setErrors({ ...errors, location: '' });
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Exam Hall, Trinity College"
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
