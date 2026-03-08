'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

interface EventImageGalleryProps {
  images: string[];
  title: string;
}

const IMG_SIZES = '(max-width: 768px) 100vw, 50vw';

/* ─── Lightbox ───────────────────────────────────────────────────────────────── */

function Lightbox({
  images,
  startIndex,
  title,
  onClose,
}: {
  images: string[];
  startIndex: number;
  title: string;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);

  const prev = useCallback(
    () => setCurrent((i) => (i - 1 + images.length) % images.length),
    [images.length]
  );
  const next = useCallback(
    () => setCurrent((i) => (i + 1) % images.length),
    [images.length]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  // Prevent body scroll while lightbox is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Image gallery: ${title}`}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4">
        <span className="text-white/70 text-sm font-medium select-none">
          {current + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
          aria-label="Close lightbox"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image */}
      <div
        className="relative w-full max-w-5xl mx-auto px-16"
        style={{ height: 'min(75vh, 720px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={images[current]}
          alt={`${title} — image ${current + 1}`}
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />
      </div>

      {/* Prev / Next arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition text-white"
            aria-label="Previous image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition text-white"
            aria-label="Next image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {images.length > 1 && images.length <= 12 && (
        <div className="absolute bottom-5 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setCurrent(i);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Gallery ───────────────────────────────────────────────────────────── */

export default function EventImageGallery({ images, title }: EventImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);

  /* Single image */
  if (images.length === 1) {
    return (
      <>
        <div
          className="relative w-full h-72 sm:h-96 rounded-[2rem] overflow-hidden cursor-pointer group"
          onClick={() => openLightbox(0)}
        >
          <Image
            src={images[0]}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes={IMG_SIZES}
            priority
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full p-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </div>
        </div>

        {lightboxIndex !== null && (
          <Lightbox images={images} startIndex={lightboxIndex} title={title} onClose={closeLightbox} />
        )}
      </>
    );
  }

  /* Multi-image grid */
  // Show main image + up to 4 thumbnails (indices 1–4)
  const thumbnails = images.slice(1, 5); // max 4
  const extraCount = images.length - 5; // images beyond the 5 shown

  return (
    <>
      <div className="grid grid-cols-[3fr_2fr] gap-2 rounded-[2rem] overflow-hidden h-72 sm:h-96">
        {/* Main/hero image */}
        <div
          className="relative cursor-pointer group"
          onClick={() => openLightbox(0)}
        >
          <Image
            src={images[0]}
            alt={`${title} — main image`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes={IMG_SIZES}
            priority
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        </div>

        {/* Thumbnail grid */}
        <div
          className={`grid gap-2 ${
            thumbnails.length === 1
              ? 'grid-cols-1'
              : thumbnails.length === 2
              ? 'grid-rows-2'
              : 'grid-cols-2 grid-rows-2'
          }`}
        >
          {thumbnails.map((src, i) => {
            const globalIndex = i + 1;
            const isLast = i === thumbnails.length - 1 && extraCount > 0;
            return (
              <div
                key={src}
                className="relative cursor-pointer group overflow-hidden"
                onClick={() => openLightbox(globalIndex)}
              >
                <Image
                  src={src}
                  alt={`${title} — image ${globalIndex + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  sizes={IMG_SIZES}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200" />

                {/* "+N more" overlay on last visible thumbnail */}
                {isLast && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-white font-bold text-lg select-none">
                      +{extraCount + 1} more
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox images={images} startIndex={lightboxIndex} title={title} onClose={closeLightbox} />
      )}
    </>
  );
}
