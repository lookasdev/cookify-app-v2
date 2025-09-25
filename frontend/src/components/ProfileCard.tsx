import React, { useState, useEffect } from 'react';
import { api, ProfileResponse, SavedRecipe, Ingredient } from '../api';

interface ProfileCardProps {
  onLogout: () => void;
  savedRecipes: SavedRecipe[];
  onUnsaveRecipe: (recipeId: string) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ onLogout, savedRecipes, onUnsaveRecipe }) => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [detailsById, setDetailsById] = useState<Record<string, { ingredients: Ingredient[]; instructions: string[]; tags?: string[] }>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileData = await api.getProfile();
        setProfile(profileData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
        if (err instanceof Error && err.message.includes('Invalid authentication')) {
          onLogout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [onLogout]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  const parseMealDbDetails = (meal: any): { ingredients: Ingredient[]; instructions: string[]; tags: string[] } => {
    const ingredients: Ingredient[] = [];
    for (let i = 1; i <= 20; i++) {
      const name = (meal[`strIngredient${i}`] || '').trim();
      const measure = (meal[`strMeasure${i}`] || '').trim();
      if (name) ingredients.push({ name, measure });
    }
    const instructionsText = meal.strInstructions || '';
    const instructions = instructionsText
      .split('.')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    const tags = (meal.strTags || '')
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);
    return { ingredients, instructions, tags };
  };

  const fetchMissingDetails = async (recipe: SavedRecipe) => {
    if (recipe.source !== 'TheMealDB') return;
    const isMissing = (!recipe.ingredients || recipe.ingredients.length === 0) || (!recipe.instructions || recipe.instructions.length === 0);
    if (!isMissing) return;
    if (!recipe.recipe_id?.startsWith('mealdb_')) return;
    const mealId = recipe.recipe_id.replace('mealdb_', '');
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(mealId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const meal = data?.meals?.[0];
      if (!meal) return;
      const mapped = parseMealDbDetails(meal);
      setDetailsById(prev => ({ ...prev, [recipe.id]: mapped }));
    } catch {
      // ignore
    }
  };

  const toggleExpanded = async (recipeId: string) => {
    const next = expandedRecipe === recipeId ? null : recipeId;
    setExpandedRecipe(next);
    if (next) {
      const recipe = savedRecipes.find(r => r.id === recipeId);
      if (recipe) {
        await fetchMissingDetails(recipe);
      }
    }
  };

  const filteredSaved = savedRecipes.filter((recipe) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      recipe.title,
      recipe.source,
      recipe.cuisine || '',
      recipe.meal_type || '',
      ...(recipe.tags || []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  if (isLoading) {
    return (
      <div className="profile-card">
        <div className="profile-header">
          <h2>Profile</h2>
        </div>
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-card">
        <div className="profile-header">
          <h2>Profile</h2>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <div className="profile-header">
        <h2>Profile</h2>
      </div>
      
      {profile && (
        <div className="profile-info">
          <div className="profile-field">
            <label>ID:</label>
            <span>{profile.id}</span>
          </div>
          <div className="profile-field">
            <label>Email:</label>
            <span>{profile.email}</span>
          </div>
        </div>
      )}

      <button onClick={handleLogout} className="logout-btn" style={{ marginBottom: '1rem' }}>Logout</button>

      <div className="saved-recipes-section">
        <h3>Saved Recipes</h3>

        <div className="search-form" style={{ marginBottom: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="saved-query">Search saved:</label>
            <input
              type="text"
              id="saved-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., pasta, chicken, italian, #quick"
            />
          </div>
        </div>

        {filteredSaved.length === 0 ? (
          <div className="empty-saved">No saved recipes match your search.</div>
        ) : (
          <div className="saved-recipes-list">
            {filteredSaved.map((recipe) => {
              const loaded = detailsById[recipe.id];
              const ingredients = (loaded?.ingredients?.length ? loaded.ingredients : recipe.ingredients) || [];
              const instructions = (loaded?.instructions?.length ? loaded.instructions : recipe.instructions) || [];
              const tags = (loaded?.tags && loaded.tags.length > 0 ? loaded.tags : recipe.tags) || [];
              return (
                <div key={recipe.id} className={`saved-recipe-item ${recipe.is_ai_generated ? 'ai-recipe' : ''}`}>
                  <div className="saved-recipe-header">
                    {recipe.is_ai_generated ? (
                      <div className="ai-placeholder-small">
                        <span className="ai-icon">🤖</span>
                      </div>
                    ) : (
                      <img 
                        src={recipe.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iMjAiIHk9IjIwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='} 
                        alt={recipe.title}
                        className="saved-recipe-image"
                      />
                    )}
                    <div className="saved-recipe-info">
                      <div className="saved-recipe-title">{recipe.title}</div>
                      <div className="saved-recipe-meta">
                        <span className="source">{recipe.source}</span>
                        {recipe.cuisine && <span className="cuisine">🌍 {recipe.cuisine}</span>}
                        {recipe.meal_type && <span className="meal-type">🍽️ {recipe.meal_type}</span>}
                        {recipe.time_minutes && <span className="time">⏱️ {recipe.time_minutes} min</span>}
                        {recipe.servings && <span className="servings">👥 {recipe.servings} servings</span>}
                      </div>
                    </div>
                    <button 
                      className="expand-button-small"
                      onClick={() => toggleExpanded(recipe.id)}
                    >
                      {expandedRecipe === recipe.id ? '−' : '+'}
                    </button>
                  </div>

                  {expandedRecipe === recipe.id && (
                    <div className="saved-recipe-details">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                        <button
                          className="unsave-button"
                          onClick={() => onUnsaveRecipe(recipe.recipe_id)}
                        >
                          Remove
                        </button>
                      </div>
                      {recipe.nutrition_summary && (
                        <div className="nutrition-section">
                          <h4>Nutrition:</h4>
                          <p>{recipe.nutrition_summary}</p>
                        </div>
                      )}
                      
                      {tags.length > 0 && (
                        <div className="tags-section">
                          <h4>Tags:</h4>
                          <div className="recipe-tags">
                            {tags.map((tag, index) => (
                              <span key={index} className="tag">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="ingredients-section">
                        <h4>Ingredients:</h4>
                        <ul className="ingredients-list">
                          {ingredients.map((ingredient, index) => (
                            <li key={index}>
                              <span className="measure">{ingredient.measure}</span>
                              <span className="ingredient-name">{ingredient.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="instructions-section">
                        <h4>Instructions:</h4>
                        <ol className="instructions-list">
                          {instructions.map((instruction, index) => (
                            <li key={index}>{instruction}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
