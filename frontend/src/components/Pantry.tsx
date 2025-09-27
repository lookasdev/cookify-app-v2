import React, { useEffect, useMemo, useState } from 'react';
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

function getExpiryStatus(expiryDate?: string): 'expired' | 'near' | 'ok' | 'none' {
  if (!expiryDate) return 'none';
  const ts = parseDate(expiryDate);
  if (ts === null) return 'none';
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (ts < now - 1 * dayMs) return 'expired'; // expired (grace for time zones)
  if (ts <= now + 3 * dayMs) return 'near'; // within 3 days
  return 'ok';
}

export const Pantry: React.FC<PantryProps> = ({ items, onUpdate, onRemove }) => {
  const [query, setQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { quantity: string; expiryDate?: string }>>({});

  // Sync drafts when items change (e.g., after save or fetch)
  useEffect(() => {
    setDrafts(prev => {
      const next: Record<string, { quantity: string; expiryDate?: string }> = { ...prev };
      for (const it of items) {
        next[it.name] = {
          quantity: it.quantity || '',
          expiryDate: it.expiryDate || undefined,
        };
      }
      // Remove drafts for items no longer present
      Object.keys(next).forEach(k => {
        if (!items.find(i => i.name === k)) delete next[k];
      });
      return next;
    });
  }, [items]);

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
            <div key={item.name} className="pantry-item-compact">
              <div className="pantry-item-header">
                <div className="pantry-item-name">
                  <span className="item-name">{item.name}</span>
                  {(() => {
                    const status = getExpiryStatus(item.expiryDate);
                    if (status === 'expired') {
                      return <span className="status-badge expired">Expired</span>;
                    }
                    if (status === 'near') {
                      return <span className="status-badge expiring">Expiring soon</span>;
                    }
                    return null;
                  })()}
                </div>
                <button className="remove-button-compact" onClick={() => onRemove(item.name)} title="Remove">
                  ✕
                </button>
              </div>
              
              <div className="pantry-item-fields">
                <div className="field-group">
                  <input
                    type="text"
                    className="quantity-input"
                    value={drafts[item.name]?.quantity ?? ''}
                    onChange={(e) => setDrafts(d => ({
                      ...d,
                      [item.name]: { ...(d[item.name] || { quantity: '', expiryDate: item.expiryDate }), quantity: e.target.value },
                    }))}
                    placeholder="Quantity (e.g., 2 packs, 500g)"
                  />
                  <input
                    type="date"
                    className="date-input"
                    value={drafts[item.name]?.expiryDate || ''}
                    onChange={(e) => setDrafts(d => ({
                      ...d,
                      [item.name]: { ...(d[item.name] || { quantity: item.quantity || '' }), expiryDate: e.target.value || undefined },
                    }))}
                  />
                </div>
                
                {(() => {
                  const draft = drafts[item.name] || { quantity: item.quantity || '', expiryDate: item.expiryDate };
                  const unchanged = (draft.quantity || '') === (item.quantity || '') && (draft.expiryDate || '') === (item.expiryDate || '');
                  if (unchanged) return null;
                  return (
                    <button
                      type="button"
                      className="update-button-compact"
                      onClick={async () => {
                        await onUpdate(item.name, { quantity: draft.quantity, expiryDate: draft.expiryDate });
                      }}
                      title="Save changes"
                    >
                      Update
                    </button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 