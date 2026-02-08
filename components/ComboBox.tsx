'use client';

import { useState, useRef, useEffect } from 'react';

interface ComboBoxOption {
  label: string;
  value: string;
}

interface ComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboBoxOption[];
  placeholder?: string;
  error?: string;
  id?: string;
  allowCustom?: boolean;
}

export default function ComboBox({
  value,
  onChange,
  options,
  placeholder = 'Search...',
  error,
  id,
  allowCustom = false,
}: ComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync input value with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If not allowing custom and value doesn't match an option, revert
        if (!allowCustom) {
          const match = options.find(
            (o) => o.label.toLowerCase() === inputValue.toLowerCase()
          );
          if (!match) {
            setInputValue(value);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [allowCustom, inputValue, options, value]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (option: ComboBoxOption) => {
    setInputValue(option.label);
    onChange(option.value);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    setHighlightIndex(-1);

    if (allowCustom) {
      onChange(val);
    } else {
      // Check for exact match
      const match = options.find(
        (o) => o.label.toLowerCase() === val.toLowerCase()
      );
      onChange(match ? match.value : '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && filtered[highlightIndex]) {
        handleSelect(filtered[highlightIndex]);
      } else if (allowCustom) {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d3b66] text-black placeholder:text-gray-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
      />

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          role="listbox"
        >
          {filtered.map((option, idx) => (
            <li
              key={option.value}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`px-4 py-2 cursor-pointer text-sm text-black ${
                idx === highlightIndex
                  ? 'bg-[#e8f0f8] text-[#0d3b66]'
                  : 'hover:bg-gray-50'
              }`}
              role="option"
              aria-selected={idx === highlightIndex}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}

      {isOpen && filtered.length === 0 && inputValue && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm text-gray-500">
            {allowCustom
              ? `"${inputValue}" will be used as a custom value`
              : 'No matches found. Try a different search.'}
          </p>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
