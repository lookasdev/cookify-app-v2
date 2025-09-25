# Cookify

A mobile-first recipes and pantry app with FastAPI backend and React frontend.

## Features (Implemented)

- Authentication & Profile
  - Register/Login with JWT (HS256), protected profile
  - Tech: FastAPI, python-jose, passlib (bcrypt), React/TS
- Recipes
  - Search by ingredients (multi-ingredient relevance), partial-match warning when none match all
  - AI recipe generation (Gemini) with structured JSON
  - Save/Unsave recipes per user
  - Tech: TheMealDB (httpx), google-generativeai (gemini-1.5-flash), MongoDB (Motor)
- Ingredients
  - Full ingredients directory from TheMealDB
  - Grouped by category (uses API type + inference), starts-with search
  - Checkboxes auto-fill Recipes input
  - Add/Remove to Pantry with Save/Saved confirmation
- Pantry
  - Server-backed pantry: add from Ingredients, edit quantity and expiry
  - Sorting: items missing quantity/expiry first; then by earliest expiry
  - Starts-with pantry search
  - Tech: FastAPI endpoints + MongoDB pantry collection (unique index userId+name)
- Saved Recipes (Profile)
  - List and search in saved items (title/tags/cuisine/meal type/source)
  - Expand for full details; lazy-load missing details for older items from TheMealDB
- Navigation & Access
  - Logged-out navbar: Login/Register, Recipes, About only
  - Save disabled when logged out; protected tabs hidden/guarded
- About & Guidance
  - About tab with user flow and tech details
  - Login page prompt describing extra features (Pantry, saving, sync)

## User Flow

1. Login/Register to enable saving and Pantry sync
2. Ingredients: search (starts-with), check to auto-fill Recipes, Save/Saved to toggle Pantry items
3. Recipes: search via TheMealDB (relevance by ingredient matches). If no full match, a banner shows and partial matches are listed first. Optionally generate recipes with AI
4. Pantry: manage items (quantity, expiry), prioritized sorting, live search
5. Profile: view/search saved recipes, expand for details, remove if needed

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: FastAPI, httpx, google-generativeai, python-jose, passlib, python-dotenv
- Database: MongoDB (Motor async), indexes on users/email, saved_recipes (userId+recipeId), pantry (userId+name)
- External APIs: TheMealDB, Google Gemini (gemini-1.5-flash)

## Quick Start

### Backend Setup

1. cd backend
2. pip install -r requirements.txt
3. Create .env (see env.example) and set:
```
MONGODB_URI=...
MONGODB_DB=auth_app
JWT_SECRET=...
JWT_EXPIRES_MIN=30
CORS_ORIGIN=http://localhost:5173
GEMINI_API_KEY=...
```
4. python main.py (http://localhost:8000)

### Frontend Setup

1. cd frontend
2. npm install
3. Create .env and set:
```
VITE_API_URL=http://localhost:8000
```
4. npm run dev (http://localhost:5173)

## API Endpoints (Key)

- Auth: POST /auth/register, POST /auth/login, GET /auth/me
- Health: GET /health
- Recipes: POST /recipes/search, POST /recipes/ai
- Saved: POST /recipes/{id}/save, GET /users/me/saved, DELETE /users/me/saved/{id}
- Pantry: GET /users/me/pantry, POST /users/me/pantry (upsert), DELETE /users/me/pantry/{name}

## Project Structure

```
backend/
  main.py        # FastAPI app & routes (auth, recipes, pantry)
  models.py      # Pydantic models (auth, recipes, pantry)
  auth.py        # JWT + password hashing
  database.py    # MongoDB (Motor) + indexes
  requirements.txt
frontend/
  src/
    components/
      LoginForm.tsx
      ProfileCard.tsx
      Recipes.tsx
      Ingredients.tsx
      Pantry.tsx
      About.tsx
    App.tsx
    App.css
    api.ts
    main.tsx
README.md
```

## Security Notes

- Passwords hashed with bcrypt
- JWT expiry configurable (default 30m)
- CORS configured per env
- Unique DB indexes: users.email, saved_recipes(userId,recipeId), pantry(userId,name)

## Notes

- TheMealDB free plan doesn’t support multi-ingredient filtering; we merge per-ingredient results and rank by matches
- AI requires GEMINI_API_KEY and uses gemini-1.5-flash
