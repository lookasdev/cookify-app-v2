import os
import httpx
import json
import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from bson import ObjectId
import google.generativeai as genai

from models import (
    RegisterIn, LoginIn, UserPublic, TokenOut, ProfileOut, UserInDB,
    RecipeSearchIn, RecipeSearchOut, Recipe, Ingredient,
    SaveRecipeIn, SavedRecipe, SavedRecipeOut, OkResponse,
    AIRecipeRequest, AIRecipe, AIRecipeResponse,
    PantryItemIn, PantryItemOut, PantryListOut
)
from database import users_collection, saved_recipes_collection, create_indexes, ping_database, pantry_collection
from auth import verify_password, get_password_hash, create_access_token, verify_token

load_dotenv()

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    gemini_model = None

# Initialize FastAPI app
app = FastAPI(title="Auth App API", version="1.0.0")

# CORS configuration
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        CORS_ORIGIN,
        "https://incredible-sundae-e9647d.netlify.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserInDB:
    """Get current user from JWT token"""
    token = credentials.credentials
    user_id = verify_token(token)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Find user in database
    try:
        user_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format"
        )
    
    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserInDB(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        hashed_password=user_doc["hashed_password"],
        created_at=user_doc["created_at"]
    )


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("🚀 Starting Auth App API...")
    
    # Test database connection
    if await ping_database():
        # Create indexes
        await create_indexes()
        print("✅ Backend ready!")
    else:
        print("❌ Failed to connect to database")


@app.get("/")
async def root():
    """Friendly root endpoint"""
    return {"ok": True, "app": "Cookify"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/debug/users")
async def debug_users():
    """Debug endpoint to check users in database"""
    users = []
    async for user in users_collection.find({}):
        users.append({
            "id": str(user["_id"]),
            "email": user["email"],
            "created_at": user["created_at"]
        })
    return {"users": users, "count": len(users)}


@app.post("/auth/register", response_model=UserPublic)
async def register(user_data: RegisterIn):
    """Register a new user"""
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user document
    user_doc = {
        "email": user_data.email,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }
    
    try:
        # Insert user
        result = await users_collection.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        return UserPublic(
            id=user_id,
            email=user_data.email,
            created_at=user_doc["created_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )


@app.post("/auth/login", response_model=TokenOut)
async def login(credentials: LoginIn):
    """Login user and return JWT token"""
    # Find user by email
    user_doc = await users_collection.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create JWT token
    user_id = str(user_doc["_id"])
    access_token = create_access_token(data={"sub": user_id})
    
    return TokenOut(access=access_token)


@app.get("/auth/me", response_model=ProfileOut)
async def get_profile(current_user: UserInDB = Depends(get_current_user)):
    """Get current user profile"""
    return ProfileOut(
        id=current_user.id,
        email=current_user.email
    )


# Pantry Endpoints
@app.get("/users/me/pantry", response_model=PantryListOut)
async def list_pantry(current_user: UserInDB = Depends(get_current_user)):
    items = []
    async for doc in pantry_collection.find({"userId": ObjectId(current_user.id)}).sort("expiryDate", 1):
        items.append(PantryItemOut(
            id=str(doc["_id"]),
            name=doc["name"],
            quantity=doc.get("quantity", ""),
            expiry_date=doc.get("expiryDate"),
            added_at=doc.get("addedAt", datetime.utcnow())
        ))
    return PantryListOut(items=items)


@app.post("/users/me/pantry", response_model=PantryItemOut)
async def upsert_pantry_item(item: PantryItemIn, current_user: UserInDB = Depends(get_current_user)):
    doc = {
        "userId": ObjectId(current_user.id),
        "name": item.name,
        "quantity": item.quantity,
        "expiryDate": item.expiry_date,
        "addedAt": datetime.utcnow(),
    }
    # Upsert by (userId, name)
    res = await pantry_collection.find_one_and_update(
        {"userId": ObjectId(current_user.id), "name": item.name},
        {"$set": doc, "$setOnInsert": {"createdAt": datetime.utcnow()}},
        upsert=True,
        return_document=True
    )
    if not res:
        # Fetch again after upsert
        res = await pantry_collection.find_one({"userId": ObjectId(current_user.id), "name": item.name})
    return PantryItemOut(
        id=str(res["_id"]),
        name=res["name"],
        quantity=res.get("quantity", ""),
        expiry_date=res.get("expiryDate"),
        added_at=res.get("addedAt", datetime.utcnow())
    )


@app.delete("/users/me/pantry/{name}", response_model=OkResponse)
async def delete_pantry_item(name: str, current_user: UserInDB = Depends(get_current_user)):
    result = await pantry_collection.delete_one({
        "userId": ObjectId(current_user.id),
        "name": name
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pantry item not found")
    return OkResponse(ok=True)


@app.post("/recipes/search", response_model=RecipeSearchOut)
async def search_recipes(search_data: RecipeSearchIn):
    """Search for recipes by ingredients using TheMealDB API"""
    # TODO: Add filters for cuisine and category
    # TODO: Add pagination support
    # TODO: Add caching for better performance
    # Normalize and validate ingredients
    ingredients = [ingredient.strip().lower() for ingredient in search_data.ingredients if ingredient.strip()]
    
    if not ingredients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one ingredient is required"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            # Search for each ingredient individually and combine results
            # Note: TheMealDB's multiple ingredient filter is premium-only,
            # so we search each ingredient separately and merge unique results
            all_meals = {}
            
            for ingredient in ingredients:
                search_url = f"https://www.themealdb.com/api/json/v1/1/filter.php?i={ingredient}"
                search_response = await client.get(search_url)
                search_response.raise_for_status()
                search_data = search_response.json()
                
                if search_data.get("meals"):
                    for meal in search_data["meals"]:
                        meal_id = meal["idMeal"]
                        if meal_id not in all_meals:
                            all_meals[meal_id] = meal
            
            if not all_meals:
                return RecipeSearchOut(items=[])
            
            # Fetch detailed information for each unique meal
            recipes = []
            for meal_id, meal in all_meals.items():
                detail_url = f"https://www.themealdb.com/api/json/v1/1/lookup.php?i={meal_id}"
                
                detail_response = await client.get(detail_url)
                detail_response.raise_for_status()
                detail_data = detail_response.json()
                
                if detail_data.get("meals"):
                    recipe_detail = detail_data["meals"][0]
                    recipe = await _map_recipe_from_themealdb(recipe_detail)
                    
                    # Calculate match count for this recipe
                    recipe_ingredients_text = ' '.join([ing.name.lower() for ing in recipe.ingredients])
                    matching_count = sum(1 for ing in ingredients if ing.lower() in recipe_ingredients_text)
                    
                    # Add match information to the recipe
                    recipe.match_count = matching_count
                    recipe.total_searched = len(ingredients)
                    
                    recipes.append(recipe)
            
            # Sort recipes by relevance (recipes with more matching ingredients first)
            recipes.sort(key=lambda recipe: recipe.match_count, reverse=True)
            
            return RecipeSearchOut(items=recipes)
            
    except httpx.HTTPError as e:
        print(f"TheMealDB API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recipe service temporarily unavailable"
        )
    except Exception as e:
        print(f"Recipe search error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search recipes: {str(e)}"
        )


async def _map_recipe_from_themealdb(meal_data: dict) -> Recipe:
    """Map TheMealDB data to our Recipe model"""
    # Extract ingredients and measures
    ingredients = []
    for i in range(1, 21):  # TheMealDB has up to 20 ingredients
        ingredient_key = f"strIngredient{i}"
        measure_key = f"strMeasure{i}"
        
        ingredient_name = meal_data.get(ingredient_key)
        measure = meal_data.get(measure_key)
        
        # Handle None values safely
        if ingredient_name and ingredient_name.strip():
            ingredient_name = ingredient_name.strip()
            measure = measure.strip() if measure else ""
            ingredients.append(Ingredient(name=ingredient_name, measure=measure))
    
    # Extract instructions and split by sentences
    instructions_text = meal_data.get("strInstructions") or ""
    instructions = [instr.strip() for instr in instructions_text.split('.') if instr.strip()]
    
    # Extract tags
    tags_text = meal_data.get("strTags") or ""
    tags = [tag.strip() for tag in tags_text.split(',') if tag.strip()] if tags_text else []
    
    return Recipe(
        id=f"mealdb_{meal_data['idMeal']}",
        title=meal_data.get("strMeal") or "Unknown Recipe",
        image=meal_data.get("strMealThumb") or "",
        cuisine=meal_data.get("strArea") or "Unknown",
        meal_type=meal_data.get("strCategory") or "Unknown",
        tags=tags,
        ingredients=ingredients,
        instructions=instructions
    )


@app.post("/recipes/{recipe_id}/save", response_model=OkResponse)
async def save_recipe(recipe_id: str, save_data: SaveRecipeIn, current_user: UserInDB = Depends(get_current_user)):
    """Save a recipe to user's favorites"""
    # TODO: Add pagination for saved recipes
    # TODO: Add syncing saved state across tabs
    try:
        # Upsert saved recipe (create or update) with full details
        saved_recipe_doc = {
            "userId": ObjectId(current_user.id),
            "recipeId": recipe_id,
            "title": save_data.title,
            "image": save_data.image,
            "source": save_data.source,
            "createdAt": datetime.utcnow(),
            # Full recipe details
            "cuisine": save_data.cuisine,
            "meal_type": save_data.meal_type,
            "tags": save_data.tags,
            "ingredients": [{"name": ing.name, "measure": ing.measure} for ing in save_data.ingredients],
            "instructions": save_data.instructions,
            # AI-specific fields
            "time_minutes": save_data.time_minutes,
            "servings": save_data.servings,
            "difficulty": save_data.difficulty,
            "nutrition_summary": save_data.nutrition_summary,
            "is_ai_generated": save_data.is_ai_generated
        }
        
        # Use upsert to handle duplicates gracefully
        await saved_recipes_collection.update_one(
            {"userId": ObjectId(current_user.id), "recipeId": recipe_id},
            {"$set": saved_recipe_doc},
            upsert=True
        )
        
        return OkResponse(ok=True)
        
    except Exception as e:
        print(f"Error saving recipe: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save recipe"
        )


@app.get("/users/me/saved", response_model=SavedRecipeOut)
async def get_saved_recipes(current_user: UserInDB = Depends(get_current_user)):
    """Get user's saved recipes, newest first"""
    try:
        saved_recipes = []
        async for doc in saved_recipes_collection.find(
            {"userId": ObjectId(current_user.id)}
        ).sort("createdAt", -1):
            # Parse ingredients from stored format
            ingredients = []
            for ing in doc.get("ingredients", []):
                ingredients.append(Ingredient(
                    name=ing.get("name", ""),
                    measure=ing.get("measure", "")
                ))
            
            saved_recipes.append(SavedRecipe(
                id=str(doc["_id"]),
                recipe_id=doc["recipeId"],
                title=doc["title"],
                image=doc.get("image"),
                source=doc["source"],
                created_at=doc["createdAt"],
                # Full recipe details
                cuisine=doc.get("cuisine"),
                meal_type=doc.get("meal_type"),
                tags=doc.get("tags", []),
                ingredients=ingredients,
                instructions=doc.get("instructions", []),
                # AI-specific fields
                time_minutes=doc.get("time_minutes"),
                servings=doc.get("servings"),
                difficulty=doc.get("difficulty"),
                nutrition_summary=doc.get("nutrition_summary"),
                is_ai_generated=doc.get("is_ai_generated", False)
            ))
        
        return SavedRecipeOut(items=saved_recipes)
        
    except Exception as e:
        print(f"Error fetching saved recipes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch saved recipes"
        )


@app.delete("/users/me/saved/{recipe_id}", response_model=OkResponse)
async def delete_saved_recipe(recipe_id: str, current_user: UserInDB = Depends(get_current_user)):
    """Remove a recipe from user's favorites"""
    try:
        result = await saved_recipes_collection.delete_one({
            "userId": ObjectId(current_user.id),
            "recipeId": recipe_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved recipe not found"
            )
        
        return OkResponse(ok=True)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting saved recipe: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete saved recipe"
        )


@app.post("/recipes/ai", response_model=AIRecipeResponse)
async def generate_ai_recipes(request: AIRecipeRequest):
    """Generate recipes using AI (Gemini) based on ingredients"""
    if not gemini_model:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service not configured"
        )
    
    # Normalize and validate ingredients
    ingredients = [ingredient.strip().lower() for ingredient in request.ingredients if ingredient.strip()]
    
    if not ingredients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one ingredient is required"
        )
    
    try:
        # Create prompt for Gemini
        ingredients_str = ", ".join(ingredients)
        prompt = f"""
        Generate 3 creative and delicious recipes using these ingredients: {ingredients_str}
        
        Return the response as a JSON array with this exact structure:
        [
            {{
                "title": "Recipe Name",
                "cuisine": "Cuisine Type",
                "meal_type": "Meal Category",
                "tags": ["tag1", "tag2"],
                "ingredients": [
                    {{"name": "ingredient name", "measure": "quantity and unit"}},
                    {{"name": "ingredient name", "measure": "quantity and unit"}}
                ],
                "instructions": [
                    "Step 1 instruction",
                    "Step 2 instruction"
                ],
                "time_minutes": 30,
                "servings": 4,
                "difficulty": "Easy/Medium/Hard",
                "nutrition_summary": "Brief nutrition info"
            }}
        ]
        
        Make sure to:
        - Use the provided ingredients as the main components
        - Add common pantry ingredients as needed
        - Include realistic cooking times and serving sizes
        - Provide clear, step-by-step instructions
        - Make recipes creative and appealing
        - Return ONLY the JSON array, no other text
        """
        
        # Generate recipes with Gemini
        response = gemini_model.generate_content(prompt)
        ai_response = response.text.strip()
        
        # Parse JSON response
        try:
            recipes_data = json.loads(ai_response)
        except json.JSONDecodeError:
            # Try to extract JSON from response if it's wrapped in markdown
            if "```json" in ai_response:
                json_start = ai_response.find("```json") + 7
                json_end = ai_response.find("```", json_start)
                if json_end > json_start:
                    ai_response = ai_response[json_start:json_end].strip()
                    recipes_data = json.loads(ai_response)
                else:
                    raise json.JSONDecodeError("No JSON found", ai_response, 0)
            else:
                raise json.JSONDecodeError("Invalid JSON format", ai_response, 0)
        
        # Convert to AIRecipe objects
        ai_recipes = []
        for recipe_data in recipes_data:
            # Parse ingredients
            ingredients_list = []
            for ing in recipe_data.get("ingredients", []):
                ingredients_list.append(Ingredient(
                    name=ing.get("name", ""),
                    measure=ing.get("measure", "")
                ))
            
            # Create AI recipe
            ai_recipe = AIRecipe(
                id=f"ai_{uuid.uuid4().hex[:8]}",
                title=recipe_data.get("title", "AI Generated Recipe"),
                image="",  # AI recipes don't have images
                cuisine=recipe_data.get("cuisine", "International"),
                meal_type=recipe_data.get("meal_type", "Main Course"),
                tags=recipe_data.get("tags", []),
                ingredients=ingredients_list,
                instructions=recipe_data.get("instructions", []),
                time_minutes=recipe_data.get("time_minutes"),
                servings=recipe_data.get("servings"),
                difficulty=recipe_data.get("difficulty"),
                nutrition_summary=recipe_data.get("nutrition_summary")
            )
            ai_recipes.append(ai_recipe)
        
        return AIRecipeResponse(items=ai_recipes)
        
    except Exception as e:
        print(f"AI recipe generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI recipes"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
