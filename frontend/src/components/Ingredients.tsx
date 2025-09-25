import React, { useEffect, useMemo, useState } from 'react';

interface MealDbIngredient {
  idIngredient: string;
  strIngredient: string;
  strDescription: string | null;
  strType: string | null;
}

interface IngredientsProps {
  onSelect?: (ingredient: string) => void;
  onSelectionChange?: (ingredients: string[]) => void;
  onAddToPantry?: (ingredient: string) => void | Promise<void>;
  onRemoveFromPantry?: (ingredient: string) => void | Promise<void>;
  pantryNames?: Set<string>;
}

const COMMON_CATEGORY_ORDER = [
  'Vegetable',
  'Fruit',
  'Meat',
  'Seafood',
  'Dairy',
  'Grain',
  'Pasta',
  'Legume',
  'Herb',
  'Spice',
  'Condiment',
  'Sauce',
  'Oil',
  'Sweetener',
  'Nut',
  'Seed',
  'Baking',
  'Beverage',
  'Other',
];

function inferCategory(name: string, desc?: string | null): string {
  const n = name.toLowerCase();
  const d = (desc || '').toLowerCase();

  // Vegetables
  if (/onion|garlic|pepper|tomato|potato|carrot|celery|cabbage|broccoli|spinach|lettuce|kale|cucumber|zucchini|eggplant|mushroom/.test(n)) return 'Vegetable';
  // Fruits
  if (/apple|banana|orange|lemon|lime|berry|grape|pineapple|mango|peach|pear|cherry|plum|apricot|kiwi|watermelon|melon|avocado/.test(n)) return 'Fruit';
  // Meats
  if (/chicken|beef|pork|lamb|turkey|bacon|ham|sausage|prosciutto|salami|duck/.test(n)) return 'Meat';
  // Seafood
  if (/shrimp|prawn|fish|salmon|tuna|cod|anchovy|sardine|mussel|clam|oyster|crab|lobster|scallop/.test(n)) return 'Seafood';
  // Dairy
  if (/milk|cheese|butter|yogurt|cream|parmesan|mozzarella|ricotta|cheddar|gouda|cream cheese/.test(n)) return 'Dairy';
  // Grains/Pasta/Legumes
  if (/rice|quinoa|oat|barley|bulgur|couscous|bread|flour|tortilla/.test(n)) return 'Grain';
  if (/spaghetti|penne|macaroni|noodle|pasta|lasagna/.test(n)) return 'Pasta';
  if (/bean|lentil|chickpea|pea/.test(n)) return 'Legume';
  // Herbs/Spices
  if (/basil|parsley|cilantro|coriander|mint|rosemary|thyme|sage|dill|oregano|chive/.test(n)) return 'Herb';
  if (/cumin|paprika|turmeric|cinnamon|nutmeg|clove|cardamom|peppercorn|chili|cayenne|curry powder|spice/.test(n)) return 'Spice';
  // Condiments/Sauces
  if (/ketchup|mustard|mayonnaise|mayo|relish|vinegar|soy sauce|fish sauce|oyster sauce|sriracha|hot sauce|bbq|barbecue/.test(n)) return 'Condiment';
  if (/sauce|paste|pesto|marinara|alfredo|tomato sauce|gravy/.test(n)) return 'Sauce';
  // Oils & sweeteners
  if (/oil|olive oil|sesame oil|canola|sunflower|ghee|shortening/.test(n)) return 'Oil';
  if (/sugar|honey|syrup|molasses|sweetener|stevia|agave/.test(n)) return 'Sweetener';
  // Nuts & seeds
  if (/almond|walnut|pecan|cashew|hazelnut|peanut|pistachio/.test(n)) return 'Nut';
  if (/sesame|chia|flax|pumpkin seed|sunflower seed/.test(n)) return 'Seed';
  // Baking
  if (/baking powder|baking soda|yeast|cocoa|chocolate|vanilla extract|cornstarch|starch|gelatin|panko|breadcrumbs/.test(n)) return 'Baking';
  // Beverages
  if (/water|wine|beer|broth|stock|coffee|tea|juice/.test(n)) return 'Beverage';

  // Use description hints
  if (/herb/.test(d)) return 'Herb';
  if (/spice/.test(d)) return 'Spice';

  return 'Other';
}

export const Ingredients: React.FC<IngredientsProps> = ({ onSelect, onSelectionChange, onAddToPantry, onRemoveFromPantry, pantryNames }) => {
  const [items, setItems] = useState<MealDbIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const fetchIngredients = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?i=list');
        if (!res.ok) throw new Error(`Failed to fetch ingredients (${res.status})`);
        const data = await res.json();
        const meals: MealDbIngredient[] = data?.meals ?? [];
        setItems(meals);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load ingredients');
      } finally {
        setLoading(false);
      }
    };
    fetchIngredients();
  }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it => {
      const name = it.strIngredient?.toLowerCase() || '';
      return name.startsWith(q);
    });
  }, [items, query]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const it of filteredItems) {
      const name = it.strIngredient?.trim();
      if (!name) continue;
      const rawType = it.strType?.trim() || '';
      const type = rawType || inferCategory(name, it.strDescription);
      const normType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      if (!groups.has(normType)) groups.set(normType, []);
      groups.get(normType)!.push(name);
    }

    for (const [, arr] of groups) {
      arr.sort((a, b) => a.localeCompare(b));
    }

    const presentKeys = Array.from(groups.keys());
    const orderedKeys: string[] = [];
    for (const key of COMMON_CATEGORY_ORDER) {
      if (presentKeys.includes(key)) orderedKeys.push(key);
    }
    const remaining = presentKeys
      .filter(k => !orderedKeys.includes(k))
      .sort((a, b) => a.localeCompare(b));

    const finalOrder = [...orderedKeys, ...remaining];
    return finalOrder.map((cat) => [cat, groups.get(cat)!] as const);
  }, [filteredItems]);

  const toggle = (name: string) => {
    setSelected(prev => {
      const has = prev.includes(name);
      const next = has ? prev.filter(n => n !== name) : [...prev, name];
      if (onSelect && !has) onSelect(name);
      if (onSelectionChange) onSelectionChange(next);
      return next;
    });
  };

  const handlePantryToggle = async (name: string) => {
    if (!onAddToPantry || !onRemoveFromPantry) return;
    setPending(name);
    try {
      const inPantry = pantryNames?.has(name.toLowerCase());
      if (inPantry) {
        await onRemoveFromPantry(name);
      } else {
        await onAddToPantry(name);
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="ingredients">
      <h2>Ingredients Directory</h2>

      <div className="search-form" style={{ marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="ingredient-query">Search ingredients:</label>
          <input
            type="text"
            id="ingredient-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., chicken, basil, pasta"
            disabled={loading}
          />
        </div>
      </div>

      {loading && <div className="loading">Loading ingredients...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && groupedByCategory.length === 0 && (
        <div className="empty-state">No ingredients match your search.</div>
      )}

      {!loading && !error && groupedByCategory.length > 0 && (
        <div className="ingredients-groups">
          {groupedByCategory.map(([category, names]) => (
            <details key={category} className="ingredients-group">
              <summary className="ingredients-group-title">{category} ({names.length})</summary>
              <ul className="ingredients-listing">
                {names.map(name => {
                  const inPantry = pantryNames?.has(name.toLowerCase());
                  return (
                    <li key={name} className="ingredient-row">
                      <div className="ingredient-option" style={{ justifyContent: 'space-between' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={selected.includes(name)}
                            onChange={() => toggle(name)}
                            title="Add to search"
                          />
                          <span>{name}</span>
                        </label>
                        {onAddToPantry && (
                          <button
                            className={inPantry ? 'unsave-button' : 'save-button'}
                            type="button"
                            onClick={() => handlePantryToggle(name)}
                            disabled={pending === name}
                            title={inPantry ? 'Remove from Pantry' : 'Add to Pantry'}
                          >
                            {pending === name ? (inPantry ? 'Removing...' : 'Adding...') : inPantry ? 'Saved ✓' : 'Save'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="selected-ingredients">
          <div className="results-header">Selected ({selected.length})</div>
          <div className="selected-list">
            {selected.map(name => (
              <span key={name} className="tag">#{name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 