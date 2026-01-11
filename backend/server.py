from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ.get('REACT_APP_SUPABASE_URL')
supabase_key = os.environ.get('REACT_APP_SUPABASE_ANON_KEY')

if not supabase_url or not supabase_key:
    raise ValueError("Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY")

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
    respondent_role: Optional[str] = None
    attached_photos: Optional[List[str]] = []
    created_at: str


class SpacePublic(BaseModel):
    id: str
    space_name: str
    slug: str
    logo_url: Optional[str] = None
    header_title: str
    custom_message: Optional[str] = None
    collect_star_rating: bool

class WidgetSettingsUpdate(BaseModel):
    settings: Dict[str, Any]

# --- Routes ---

# --- WIDGET SETTINGS ROUTES ---

@api_router.get("/widget-settings/{space_id}")
async def get_widget_settings(space_id: str):
    """Retrieve widget configurations for a specific space"""
    try:
        # Fetch settings from the 'widget_configurations' table
        response = supabase.table('widget_configurations') \
            .select('settings') \
            .eq('space_id', space_id) \
            .execute()
        
        # If data exists, return it
        if response.data and len(response.data) > 0:
            return {"status": "success", "settings": response.data[0]['settings']}
        
        # If no data found, return empty dict (frontend will use defaults)
        return {"status": "success", "settings": {}}

    except Exception as e:
        logger.error(f"Error fetching widget settings: {e}")
        # Return empty on error so the UI doesn't crash, just uses defaults
        return {"status": "error", "settings": {}}


@api_router.post("/widget-settings/{space_id}")
async def save_widget_settings(space_id: str, config: WidgetSettingsUpdate):
    """Save or update widget configurations for a space"""
    try:
        # Upsert data: This updates if the space_id exists, or inserts if it's new
        # We assume you created the 'widget_configurations' table as per previous SQL instructions
        data = {
            'space_id': space_id,
            'settings': config.settings,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        response = supabase.table('widget_configurations') \
            .upsert(data, on_conflict='space_id') \
            .execute()
            
        return {"status": "success", "message": "Settings saved successfully"}

    except Exception as e:
        logger.error(f"Error saving widget settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
            .select('id, type, content, video_url, rating, respondent_name, respondent_photo_url, respondent_role, attached_photos, created_at') \
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
    
# --- NEW: Combined Endpoint for Popups & Embed ---
@api_router.get("/spaces/{space_id}/public-data")
async def get_space_public_data(space_id: str):
    try:
        # 1. Testimonials (Recent First)
        testimonials_res = supabase.table('testimonials') \
            .select('id, is_liked, type, content, video_url, rating, respondent_name, respondent_photo_url, respondent_role, attached_photos, created_at') \
            .eq('space_id', space_id) \
            .eq('is_liked', True) \
            .order('created_at', desc=True) \
            .execute()
        
        testimonials = testimonials_res.data if testimonials_res.data else []

        # 2. Settings
        settings_res = supabase.table('widget_configurations') \
            .select('settings') \
            .eq('space_id', space_id) \
            .execute()
        
        widget_settings = {}
        if settings_res.data and len(settings_res.data) > 0:
            widget_settings = settings_res.data[0]['settings']

        return {
            "status": "success",
            "testimonials": testimonials,
            "widget_settings": widget_settings
        }

    except Exception as e:
        logger.error(f"Error fetching public data for {space_id}: {e}")
        return {"status": "error", "testimonials": [], "widget_settings": {}}

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
    allow_origins=["*"],  # <--- Change this to "*" for testing
    allow_methods=["*"],
    allow_headers=["*"],
)
if __name__ == "__main__":
    import uvicorn
    # Run the app on host 0.0.0.0 and port 8000
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)