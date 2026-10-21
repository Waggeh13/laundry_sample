import { useEffect, useMemo, useRef, useState } from 'react';
import './CustomerSearchSelect.css';

function CustomerSearchSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select customer',
  disabled = false,
  loading = false,
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value]
  );

  // Keep the input label in sync with the selected customer when closed.
  useEffect(() => {
    if (!open) {
      setQuery(selected?.label || '');
    }
  }, [selected, open, value]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || (selected && query === selected.label)) {
      return options;
    }
    return options.filter((option) => {
      const haystack = [
        option.label,
        option.name,
        option.phone,
        option.username,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [options, query, selected]);

  const handleSelect = (optionValue) => {
    onChange?.(optionValue);
    setOpen(false);
    inputRef.current?.blur();
  };

  const emptyLabel = loading
    ? 'Loading customers…'
    : options.length === 0
      ? 'No customers available'
      : 'No matching customers';

  return (
    <div className="customer-search-select" ref={wrapRef}>
      <div className="customer-search-select-control">
        <input
          ref={inputRef}
          type="text"
          className="customer-search-select-input"
          value={query}
          disabled={disabled || loading}
          placeholder={loading ? 'Loading customers…' : placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="customer-search-listbox"
          onFocus={() => {
            if (!disabled && !loading) setOpen(true);
          }}
          onClick={() => {
            if (!disabled && !loading) setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            // Typing a new query clears the committed selection until a pick.
            if (value) onChange?.('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setQuery(selected?.label || '');
              inputRef.current?.blur();
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filtered.length === 1) {
                handleSelect(filtered[0].value);
              }
            }
          }}
          required={!value}
        />
        <button
          type="button"
          className="customer-search-select-toggle"
          tabIndex={-1}
          disabled={disabled || loading}
          aria-label={open ? 'Close customer list' : 'Open customer list'}
          onClick={() => {
            if (disabled || loading) return;
            setOpen((current) => !current);
            if (!open) inputRef.current?.focus();
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open ? (
        <ul
          id="customer-search-listbox"
          className="customer-search-select-list"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="customer-search-select-empty">{emptyLabel}</li>
          ) : (
            filtered.map((option) => {
              const isActive = String(option.value) === String(value);
              return (
                <li key={option.value} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={`customer-search-select-option${
                      isActive ? ' is-active' : ''
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span className="customer-search-select-option-name">
                      {option.label}
                    </span>
                    {option.phone ? (
                      <span className="customer-search-select-option-meta">
                        {option.phone}
                        {option.phoneNeedsCorrection ? ' · needs phone fix' : ''}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

export default CustomerSearchSelect;
