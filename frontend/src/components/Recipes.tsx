import React, { useState } from 'react';
import { api, Recipe, AIRecipe } from '../api';

interface RecipesProps {
  isLoggedIn: boolean;
  savedRecipeIds: Set<string>;
  onSaveRecipe: (recipe: Recipe | AIRecipe) => Promise<void>;
  onUnsaveRecipe: (recipeId: string) => Promise<void>;
  ingredientsValue: string;
  onIngredientsChange: (value: string) => void;
}

export const Recipes: React.FC<RecipesProps> = ({ 
  isLoggedIn, 
  savedRecipeIds, 
  onSaveRecipe, 
  onUnsaveRecipe,
  ingredientsValue,
  onIngredientsChange,
}) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [aiRecipes, setAiRecipes] = useState<AIRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [error, setError] = useState('');
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [savingRecipe, setSavingRecipe] = useState<string | null>(null);
  const [noFullMatchWarning, setNoFullMatchWarning] = useState<string | null>(null);

  const parseIngredients = () =>
    ingredientsValue
      .split(',')
      .map(ing => ing.trim().toLowerCase())
      .filter(ing => ing.length > 0);

  const computeNoFullMatch = (items: Recipe[], searched: string[]) => {
    if (searched.length < 2) return null;
    const hasFull = items.some(r => r.match_count >= searched.length);
    return hasFull ? null : `No recipes contain all ${searched.length} ingredients. Showing partial matches sorted by relevance.`;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setNoFullMatchWarning(null);

    const ingredientsList = parseIngredients();

    if (ingredientsList.length === 0) {
      setError('Add at least 1 ingredient');
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.searchRecipes({ ingredients: ingredientsList });
      setRecipes(response.items);
      setAiRecipes([]);
      setNoFullMatchWarning(computeNoFullMatch(response.items, ingredientsList));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search recipes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    setError('');
    setNoFullMatchWarning(null);

    const ingredientsList = parseIngredients();

    if (ingredientsList.length === 0) {
      setError('Add at least 1 ingredient');
      setIsGeneratingAI(false);
      return;
    }

    try {
      const response = await api.generateAIRecipes({ ingredients: ingredientsList });
      setAiRecipes(response.items);
      setRecipes([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI recipes');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const toggleExpanded = (recipeId: string) => {
    setExpandedRecipe(expandedRecipe === recipeId ? null : recipeId);
  };

  const handleSaveRecipe = async (recipe: Recipe | AIRecipe) => {
    if (!isLoggedIn) return;
    
    setSavingRecipe(recipe.id);
    try {
      await onSaveRecipe(recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSavingRecipe(null);
    }
  };

  const handleUnsaveRecipe = async (recipe: Recipe | AIRecipe) => {
    if (!isLoggedIn) return;
    
    setSavingRecipe(recipe.id);
    try {
      await onUnsaveRecipe(recipe.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsave recipe');
    } finally {
      setSavingRecipe(null);
    }
  };

  return (
    <div className="recipes">
      <h2>Find Recipes</h2>
      
      <form onSubmit={handleSearch} className="search-form">
        <div className="form-group">
          <label htmlFor="ingredients">Ingredients (comma-separated):</label>
          <input
            type="text"
            id="ingredients"
            value={ingredientsValue}
            onChange={(e) => onIngredientsChange(e.target.value)}
            placeholder="e.g., chicken, rice, vegetables"
            disabled={isLoading}
          />
        </div>
        
        <div className="search-buttons">
          <button type="submit" disabled={isLoading || !ingredientsValue.trim()}>
            {isLoading ? 'Searching...' : 'Search Recipes'}
          </button>
          
          <button 
            type="button" 
            onClick={handleGenerateAI}
            disabled={isGeneratingAI || !ingredientsValue.trim()}
            className="ai-button"
          >
            {isGeneratingAI ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {noFullMatchWarning && recipes.length > 0 && (
        <div className="warning-message" role="status">
          {noFullMatchWarning}
        </div>
      )}

      {!isLoading && !isGeneratingAI && recipes.length === 0 && aiRecipes.length === 0 && ingredientsValue && (
        <div className="empty-state">
          No recipes found. Try different ingredients or generate with AI.
        </div>
      )}

      {!isLoading && !isGeneratingAI && !ingredientsValue && (
        <div className="empty-state">
          Add at least 1 ingredient to search for recipes.
        </div>
      )}

      {/* TheMealDB Results */}
      {recipes.length > 0 && (
        <div className="results-section">
          <h3 className="results-header">🍽️ TheMealDB Recipes</h3>
          <div className="recipes-list">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="recipe-card">
                <div className="recipe-header">
                  <img 
                    src={recipe.image} 
                    alt={recipe.title}
                    className="recipe-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
                    }}
                  />
                  <div className="recipe-info">
                    <h3 className="recipe-title">{recipe.title}</h3>
                    <div className="recipe-meta">
                      <span className="cuisine">🌍 {recipe.cuisine}</span>
                      <span className="meal-type">🍽️ {recipe.meal_type}</span>
                      <span className="match-count">
                        🎯 {recipe.match_count}/{recipe.total_searched} ingredients
                      </span>
                    </div>
                    {recipe.tags.length > 0 && (
                      <div className="recipe-tags">
                        {recipe.tags.map((tag, index) => (
                          <span key={index} className="tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="recipe-actions">
                  <button 
                    className="expand-button"
                    onClick={() => toggleExpanded(recipe.id)}
                  >
                    {expandedRecipe === recipe.id ? 'Hide Details' : 'Show Details'}
                  </button>
                  
                  {isLoggedIn ? (
                    savedRecipeIds.has(recipe.id) ? (
                      <button 
                        className="unsave-button"
                        onClick={() => handleUnsaveRecipe(recipe)}
                        disabled={savingRecipe === recipe.id}
                      >
                        {savingRecipe === recipe.id ? 'Unsaving...' : 'Saved ✓'}
                      </button>
                    ) : (
                      <button 
                        className="save-button"
                        onClick={() => handleSaveRecipe(recipe)}
                        disabled={savingRecipe === recipe.id}
                      >
                        {savingRecipe === recipe.id ? 'Saving...' : 'Save'}
                      </button>
                    )
                  ) : (
                    <div className="login-tooltip" title="Login to save recipes">
                      <button className="save-button disabled" disabled>
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {expandedRecipe === recipe.id && (
                  <div className="recipe-details">
                    <div className="ingredients-section">
                      <h4>Ingredients:</h4>
                      <ul className="ingredients-list">
                        {recipe.ingredients.map((ingredient, index) => (
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
                        {recipe.instructions.map((instruction, index) => (
                          <li key={index}>{instruction}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Generated Results */}
      {aiRecipes.length > 0 && (
        <div className="results-section">
          <h3 className="results-header">🤖 AI Generated Recipes</h3>
          <div className="recipes-list">
            {aiRecipes.map((recipe) => (
              <div key={recipe.id} className="recipe-card ai-recipe">
                <div className="recipe-header">
                  <div className="ai-placeholder">
                    <span className="ai-icon">🤖</span>
                  </div>
                  <div className="recipe-info">
                    <h3 className="recipe-title">{recipe.title}</h3>
                    <div className="recipe-meta">
                      <span className="cuisine">🌍 {recipe.cuisine}</span>
                      <span className="meal-type">🍽️ {recipe.meal_type}</span>
                      {recipe.time_minutes && (
                        <span className="time">⏱️ {recipe.time_minutes} min</span>
                      )}
                      {recipe.servings && (
                        <span className="servings">👥 {recipe.servings} servings</span>
                      )}
                      {recipe.difficulty && (
                        <span className="difficulty">⭐ {recipe.difficulty}</span>
                      )}
                    </div>
                    {recipe.tags.length > 0 && (
                      <div className="recipe-tags">
                        {recipe.tags.map((tag, index) => (
                          <span key={index} className="tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="recipe-actions">
                  <button 
                    className="expand-button"
                    onClick={() => toggleExpanded(recipe.id)}
                  >
                    {expandedRecipe === recipe.id ? 'Hide Details' : 'Show Details'}
                  </button>
                  
                  {isLoggedIn ? (
                    savedRecipeIds.has(recipe.id) ? (
                      <button 
                        className="unsave-button"
                        onClick={() => handleUnsaveRecipe(recipe)}
                        disabled={savingRecipe === recipe.id}
                      >
                        {savingRecipe === recipe.id ? 'Unsaving...' : 'Saved ✓'}
                      </button>
                    ) : (
                      <button 
                        className="save-button"
                        onClick={() => handleSaveRecipe(recipe)}
                        disabled={savingRecipe === recipe.id}
                      >
                        {savingRecipe === recipe.id ? 'Saving...' : 'Save'}
                      </button>
                    )
                  ) : (
                    <div className="login-tooltip" title="Login to save recipes">
                      <button className="save-button disabled" disabled>
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {expandedRecipe === recipe.id && (
                  <div className="recipe-details">
                    {recipe.nutrition_summary && (
                      <div className="nutrition-section">
                        <h4>Nutrition:</h4>
                        <p>{recipe.nutrition_summary}</p>
                      </div>
                    )}
                    
                    <div className="ingredients-section">
                      <h4>Ingredients:</h4>
                      <ul className="ingredients-list">
                        {recipe.ingredients.map((ingredient, index) => (
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
                        {recipe.instructions.map((instruction, index) => (
                          <li key={index}>{instruction}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
