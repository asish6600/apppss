import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from db import ensure_indexes
from seed import seed_all
from routes import router
from admin_routes import router as admin_router
from reviews import router as reviews_router
from growth import router as growth_router
from support_bot import router as support_bot_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aaharnest")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await ensure_indexes()
        await seed_all()
        logger.info("AaharNest startup: indexes + seed complete")
    except Exception as e:
        logger.error(f"Startup error: {e}")
    yield


app = FastAPI(title="AaharNest API", lifespan=lifespan)
app.include_router(router)
app.include_router(admin_router)
app.include_router(reviews_router)
app.include_router(growth_router)
app.include_router(support_bot_router)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
