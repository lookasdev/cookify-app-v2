from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class RegisterIn(BaseModel):
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    created_at: datetime


class TokenOut(BaseModel):
    access: str


class ProfileOut(BaseModel):
    id: str
    email: str


class UserInDB(BaseModel):
    id: str
    email: str
    hashed_password: str
    created_at: datetime


class RecipeSearchIn(BaseModel):
    ingredients: list[str]


class Ingredient(BaseModel):
    name: str
    measure: str


class Recipe(BaseModel):
    id: str
    title: str
    image: str
    cuisine: str
    meal_type: str
    tags: list[str]
    ingredients: list[Ingredient]
    instructions: list[str]
    match_count: int = 0
    total_searched: int = 0


class AIRecipeRequest(BaseModel):
    ingredients: list[str]
    filters: dict | None = None


class AIRecipe(BaseModel):
    id: str
    title: str
    image: str
    cuisine: str
    meal_type: str
    tags: list[str]
    ingredients: list[Ingredient]
    instructions: list[str]
    time_minutes: int | None = None
    servings: int | None = None
    difficulty: str | None = None
    nutrition_summary: str | None = None
    source: str = "AI"
    is_ai_generated: bool = True


class AIRecipeResponse(BaseModel):
    items: list[AIRecipe]


class RecipeSearchOut(BaseModel):
    items: list[Recipe]


class SaveRecipeIn(BaseModel):
    title: str
    image: str | None = None
    source: str = "TheMealDB"
    # Full recipe details
    cuisine: str | None = None
    meal_type: str | None = None
    tags: list[str] = []
    ingredients: list[Ingredient] = []
    instructions: list[str] = []
    # AI-specific fields
    time_minutes: int | None = None
    servings: int | None = None
    difficulty: str | None = None
    nutrition_summary: str | None = None
    is_ai_generated: bool = False


class SavedRecipe(BaseModel):
    id: str
    recipe_id: str
    title: str
    image: str | None = None
    source: str
    created_at: datetime
    # Full recipe details for viewing
    cuisine: str | None = None
    meal_type: str | None = None
    tags: list[str] = []
    ingredients: list[Ingredient] = []
    instructions: list[str] = []
    # AI-specific fields
    time_minutes: int | None = None
    servings: int | None = None
    difficulty: str | None = None
    nutrition_summary: str | None = None
    is_ai_generated: bool = False


class SavedRecipeOut(BaseModel):
    items: list[SavedRecipe]


class OkResponse(BaseModel):
    ok: bool = True


# Pantry models
class PantryItemIn(BaseModel):
    name: str
    quantity: str = ""
    expiry_date: datetime | None = None


class PantryItemOut(BaseModel):
    id: str
    name: str
    quantity: str
    expiry_date: datetime | None = None
    added_at: datetime


class PantryListOut(BaseModel):
    items: list[PantryItemOut]
