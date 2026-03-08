'use client';

import { useState, useRef, useCallback } from 'react';

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (dataUri: string) => void;
  maxSizeMB?: number;
  className?: string;
}

export default function ImageUpload({
  currentImage,
  onImageChange,
  maxSizeMB = 2,
  className = '',
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setError('');

      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, GIF, or WebP).');
        return;
      }

      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`Picture file size too large — please use an image under ${maxSizeMB}MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        onImageChange(reader.result as string);
      };
      reader.onerror = () => {
        setError('Failed to read file. Please try again.');
      };
      reader.readAsDataURL(file);
    },
    [maxSizeMB, onImageChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          dragOver
            ? 'border-[#0d3b66] bg-[#e8f0f8]'
            : 'border-gray-300 hover:border-[#0d3b66]/50 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {currentImage && currentImage.startsWith('data:') ? (
          <div className="space-y-3">
            <div className="relative w-full h-40 rounded-lg overflow-hidden">
              <img
                src={currentImage}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-sm text-black">Click or drag a new image to replace</p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="w-12 h-12 mx-auto text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-medium text-black">
              Drop an image here, or click to select
            </p>
            <p className="text-xs text-gray-500">
              JPEG, PNG, GIF or WebP. Max {maxSizeMB}MB.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
