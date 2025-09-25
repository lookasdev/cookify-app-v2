import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv

load_dotenv()

# Database configuration
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "auth_app")

# Create MongoDB client
client = AsyncIOMotorClient(MONGODB_URI)
db = client[MONGODB_DB]

# Collections
users_collection = db.users
saved_recipes_collection = db.saved_recipes
pantry_collection = db.pantry


async def create_indexes():
    """Create necessary indexes for the database"""
    try:
        # Create unique index on email field
        await users_collection.create_index("email", unique=True)
        
        # Create indexes for saved_recipes collection
        # Create compound unique index for userId and recipeId
        await saved_recipes_collection.create_index(
            [("userId", 1), ("recipeId", 1)], 
            unique=True
        )
        # Create single field indexes
        await saved_recipes_collection.create_index("userId")
        await saved_recipes_collection.create_index([("createdAt", -1)])  # For sorting by newest first

        # Pantry indexes: unique by (userId, name)
        await pantry_collection.create_index([
            ("userId", 1), ("name", 1)
        ], unique=True)
        await pantry_collection.create_index("userId")
        await pantry_collection.create_index([("expiryDate", 1)])
        
        print("✅ Database indexes created successfully")
    except Exception as e:
        print(f"❌ Error creating indexes: {e}")
        # Print more details for debugging
        import traceback
        traceback.print_exc()


async def ping_database():
    """Test database connection"""
    try:
        # Ping the database
        await client.admin.command('ping')
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


async def close_database():
    """Close database connection"""
    client.close()
