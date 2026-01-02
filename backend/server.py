from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(supabase_url, supabase_key)

# Create the main app
app = FastAPI(title="TrustFlow API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Models
class TestimonialPublic(BaseModel):
    id: str
    type: str
    content: Optional[str] = None
    video_url: Optional[str] = None
    rating: Optional[int] = None
    respondent_name: str
    respondent_photo_url: Optional[str] = None
    created_at: str


class SpacePublic(BaseModel):
    id: str
    space_name: str
    slug: str
    logo_url: Optional[str] = None
    header_title: str
    custom_message: Optional[str] = None
    collect_star_rating: bool


# Routes
@api_router.get("/")
async def root():
    return {"message": "TrustFlow API", "version": "1.0.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@api_router.get("/public/testimonials", response_model=List[TestimonialPublic])
async def get_public_testimonials(space_id: str):
    """Get approved testimonials for a space (for widget)"""
    try:
        response = supabase.table('testimonials') \
            .select('id, type, content, video_url, rating, respondent_name, respondent_photo_url, created_at') \
            .eq('space_id', space_id) \
            .eq('is_liked', True) \
            .order('created_at', desc=True) \
            .execute()
        
        return response.data
    except Exception as e:
        logger.error(f"Error fetching testimonials: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch testimonials")


@api_router.get("/public/space/{slug}", response_model=SpacePublic)
async def get_public_space(slug: str):
    """Get space info by slug (for submission form)"""
    try:
        response = supabase.table('spaces') \
            .select('id, space_name, slug, logo_url, header_title, custom_message, collect_star_rating') \
            .eq('slug', slug) \
            .single() \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Space not found")
        
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching space: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch space")


@api_router.get("/setup-db")
async def setup_database():
    """Initialize database tables (run once)"""
    try:
        # This endpoint helps verify the Supabase connection
        # The actual tables should be created in Supabase Dashboard
        response = supabase.table('spaces').select('count', count='exact').execute()
        return {
            "status": "connected",
            "spaces_count": response.count,
            "message": "Database is ready. Create tables in Supabase Dashboard if not exists."
        }
    except Exception as e:
        logger.error(f"Database setup error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "hint": "Please create tables in Supabase Dashboard"
        }


# Include the router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
