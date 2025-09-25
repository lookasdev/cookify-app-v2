import React, { useMemo, useState } from 'react';
import type { PantryItem } from '../App';

interface PantryProps {
  items: PantryItem[];
  onUpdate: (name: string, updates: Partial<PantryItem>) => void;
  onRemove: (name: string) => void;
}

function parseDate(d?: string): number | null {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : t;
}

export const Pantry: React.FC<PantryProps> = ({ items, onUpdate, onRemove }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it => it.name.toLowerCase().startsWith(q));
  }, [items, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aNeedsInfo = !a.expiryDate || !(a.quantity && a.quantity.trim().length > 0);
      const bNeedsInfo = !b.expiryDate || !(b.quantity && b.quantity.trim().length > 0);
      if (aNeedsInfo !== bNeedsInfo) return aNeedsInfo ? -1 : 1; // missing info first

      // Both same info state. If both need info, sort by name
      if (aNeedsInfo && bNeedsInfo) return a.name.localeCompare(b.name);

      // Otherwise, both have expiry and quantity → sort by earliest expiry, then name
      const da = parseDate(a.expiryDate);
      const db = parseDate(b.expiryDate);
      if (da !== null && db !== null && da !== db) return da - db;
      return a.name.localeCompare(b.name);
    });
  }, [filtered]);

  return (
    <div className="pantry">
      <h2>Your Pantry</h2>

      <div className="search-form" style={{ marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="pantry-query">Search pantry:</label>
          <input
            type="text"
            id="pantry-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., salt, chicken"
          />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">No pantry items yet. Add from the Ingredients tab.</div>
      ) : (
        <div className="pantry-list">
          {sorted.map(item => (
            <div key={item.name} className="pantry-item">
              <div className="pantry-header">
                <div className="pantry-name">{item.name}</div>
                <button className="remove-button-small" onClick={() => onRemove(item.name)} title="Remove">
                  ✕
                </button>
              </div>
              <div className="pantry-fields">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={(e) => onUpdate(item.name, { quantity: e.target.value })}
                    placeholder="e.g., 2 packs, 500 g"
                  />
                </div>
                <div className="form-group">
                  <label>Expiry date</label>
                  <input
                    type="date"
                    value={item.expiryDate || ''}
                    onChange={(e) => onUpdate(item.name, { expiryDate: e.target.value || undefined })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 