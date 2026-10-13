import React, { useEffect, useRef, useState } from 'react';

export interface ExportMenuOption {
  label: string;
  description?: string;
  onSelect: () => void;
}

interface ExportMenuProps {
  options: ExportMenuOption[];
  /** Content rendered inside the trigger button (icon + label). */
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
  /** Class names for the trigger button. */
  className?: string;
  /** Which edge the popover aligns to. Defaults to right. */
  align?: 'left' | 'right';
  /** Extra classes for the wrapping div (e.g. responsive visibility). */
  containerClassName?: string;
}

/**
 * A small dropdown button used by every Excel / Print trigger so the user can
 * choose between exporting with or without the Standard / Check column.
 */
export const ExportMenu: React.FC<ExportMenuProps> = ({
  options,
  children,
  disabled = false,
  title,
  className,
  align = 'right',
  containerClassName,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className={`relative${containerClassName ? ` ${containerClassName}` : ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        title={title}
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {children}
      </button>

      {open && !disabled && (
        <div
          role="menu"
          className={`absolute z-50 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-1.5 text-gray-800 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Standard / Check column
          </p>
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                option.onSelect();
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none transition-colors"
            >
              <span className="block text-xs font-bold text-gray-800">{option.label}</span>
              {option.description && (
                <span className="block text-[10px] text-gray-500 mt-0.5">{option.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
