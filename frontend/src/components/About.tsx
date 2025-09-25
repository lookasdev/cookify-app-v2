import React from 'react';

export const About: React.FC = () => {
  return (
    <div className="about">
      <h2>About Cookify</h2>
      <p className="about-text">
        Cookify helps you discover recipes from your ingredients using TheMealDB, generate creative ideas with AI (Gemini), and manage your kitchen with a personal Pantry. Save favorites to your profile and revisit them anytime.
      </p>

      <div className="results-header">User Flow</div>
      <ol className="about-steps">
        <li>
          <strong>Login/Register</strong>: Create an account to save recipes and sync your Pantry.
        </li>
        <li>
          <strong>Ingredients</strong>: Browse all ingredients, search (starts-with), check items to auto-fill the Recipes search, or click <em>Save/Saved</em> to toggle items in your Pantry.
        </li>
        <li>
          <strong>Recipes</strong>:
          - Search TheMealDB for real recipes matched by your ingredients (multi-ingredient relevance sorting).
          - If no recipe contains all searched ingredients, a banner warns you and shows best partial matches first.
          - Or use <em>Generate with AI</em> for AI-crafted ideas.
        </li>
        <li>
          <strong>Pantry</strong>: View your ingredients, add quantity and expiry. Items missing quantity/expiry are shown first so you can complete them. Data is saved to your account (MongoDB).
        </li>
        <li>
          <strong>Profile</strong>: See your saved recipes, search within them (title/tags/cuisine/meal type/source), expand for full details, and remove if needed.
        </li>
      </ol>

      <details className="about-tech">
        <summary className="ingredients-group-title">Technical Details</summary>
        <ul className="ingredients-listing" style={{ gridTemplateColumns: '1fr' }}>
          <li><strong>Frontend</strong>: React, Vite, TypeScript</li>
          <li><strong>Backend</strong>: FastAPI (Python)</li>
          <li><strong>Database</strong>: MongoDB (Motor async driver)</li>
          <li><strong>Auth</strong>: JWT (HS256), bcrypt (passlib)</li>
          <li><strong>Recipes API</strong>: TheMealDB</li>
          <li><strong>AI</strong>: Google Gemini (gemini-1.5-flash)</li>
          <li><strong>Features</strong>: Ingredients directory with starts-with search; Pantry with server persistence, quantity & expiry, prioritized sorting; Saved recipes search; Partial-match warning in search.</li>
          <li><strong>Env/CORS</strong>: dotenv, CORS middleware</li>
        </ul>
      </details>

      <div className="about-notes">
        <p>
          Tip: Multi-ingredient searches rank recipes by how many of your ingredients they include. If none match all, you’ll see a notice and partial matches sorted by relevance.
        </p>
      </div>
    </div>
  );
}; 