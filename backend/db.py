import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = _client[os.environ["DB_NAME"]]


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.sessions.create_index("token_hash")
    await db.sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.auth_otps.create_index("email")
    await db.auth_otps.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.products.create_index("slug", unique=True)
    await db.products.create_index("sku")
    await db.products.create_index("out_of_stock")
    await db.categories.create_index("slug", unique=True)
    await db.recipes.create_index("slug", unique=True)
    await db.articles.create_index("slug", unique=True)
    await db.carts.create_index("cart_key")
    await db.orders.create_index("user_id")
    await db.addresses.create_index("user_id")
    await db.page_views.create_index("created_at")
    await db.page_views.create_index("day")
    await db.app_config.create_index("key")
    # AI support chat + automated tickets
    await db.chat_sessions.create_index("id", unique=True)
    await db.chat_sessions.create_index("customer.email")
    await db.chat_messages.create_index([("chat_id", 1), ("at", 1)])
    await db.support_tickets.create_index("ticket_number", unique=True)
    await db.support_tickets.create_index([("status", 1), ("created_at", -1)])
    await db.support_tickets.create_index("email")
