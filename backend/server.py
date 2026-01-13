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

# --- Custom Domain Models ---
class CustomDomainCreate(BaseModel):
    space_id: str
    domain: str

class CustomDomainResponse(BaseModel):
    id: str
    space_id: str
    domain: str
    status: str
    dns_verified_at: Optional[str] = None
    created_at: str
    updated_at: str

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
            .eq('type', 'text') \
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


# --- CUSTOM DOMAIN ROUTES (Pro Feature) ---

@api_router.get("/custom-domains/{space_id}")
async def get_custom_domain(space_id: str):
    """Get custom domain for a specific space"""
    try:
        response = supabase.table('custom_domains') \
            .select('*') \
            .eq('space_id', space_id) \
            .execute()
        
        if response.data and len(response.data) > 0:
            return {"status": "success", "domain": response.data[0]}
        
        return {"status": "success", "domain": None}
    
    except Exception as e:
        logger.error(f"Error fetching custom domain: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch custom domain")


@api_router.get("/custom-domains/resolve")
async def resolve_custom_domain(domain: str):
    """Resolve a custom domain to its space - used by frontend for custom domain routing"""
    try:
        # Lookup domain in custom_domains table
        response = supabase.table('custom_domains') \
            .select('*, spaces(id, slug, space_name, logo_url, header_title, custom_message, collect_star_rating)') \
            .eq('domain', domain.lower().strip()) \
            .eq('status', 'verified') \
            .execute()
        
        if response.data and len(response.data) > 0:
            domain_data = response.data[0]
            space_data = domain_data.get('spaces')
            
            if space_data:
                return {
                    "status": "success",
                    "space": space_data,
                    "domain": {
                        "id": domain_data['id'],
                        "domain": domain_data['domain'],
                        "status": domain_data['status']
                    }
                }
        
        # Domain not found or not verified
        return {"status": "error", "message": "Domain not configured or not verified", "space": None}
    
    except Exception as e:
        logger.error(f"Error resolving custom domain: {e}")
        return {"status": "error", "message": "Failed to resolve domain", "space": None}


@api_router.post("/custom-domains")
async def add_custom_domain(data: CustomDomainCreate):
    """Add a custom domain to a space"""
    try:
        # Check if space already has a custom domain
        existing = supabase.table('custom_domains') \
            .select('id') \
            .eq('space_id', data.space_id) \
            .execute()
        
        if existing.data and len(existing.data) > 0:
            raise HTTPException(status_code=400, detail="Space already has a custom domain. Remove it first.")
        
        # Check if domain is already in use
        domain_check = supabase.table('custom_domains') \
            .select('id') \
            .eq('domain', data.domain.lower().strip()) \
            .execute()
        
        if domain_check.data and len(domain_check.data) > 0:
            raise HTTPException(status_code=400, detail="This domain is already registered.")
        
        # Insert new custom domain
        new_domain = {
            'space_id': data.space_id,
            'domain': data.domain.lower().strip(),
            'status': 'pending'
        }
        
        response = supabase.table('custom_domains') \
            .insert(new_domain) \
            .execute()
        
        if response.data:
            return {"status": "success", "domain": response.data[0], "message": "Domain added. Please configure DNS."}
        
        raise HTTPException(status_code=500, detail="Failed to add domain")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding custom domain: {e}")
        raise HTTPException(status_code=500, detail="Failed to add custom domain")


@api_router.post("/custom-domains/verify/{domain_id}")
async def verify_custom_domain(domain_id: str):
    """Verify DNS configuration for a custom domain"""
    import dns.resolver
    
    # Vercel's CNAME target (universal for all Vercel-hosted domains)
    VERCEL_CNAME_TARGETS = ['cname.vercel-dns.com', 'cname-china.vercel-dns.com']
    
    try:
        # Get domain info (simplified query)
        domain_res = supabase.table('custom_domains') \
            .select('*') \
            .eq('id', domain_id) \
            .single() \
            .execute()
        
        if not domain_res.data:
            raise HTTPException(status_code=404, detail="Domain not found")
        
        domain_info = domain_res.data
        domain_name = domain_info['domain']
        
        # Proper DNS CNAME Lookup
        try:
            # Query CNAME record
            answers = dns.resolver.resolve(domain_name, 'CNAME')
            
            cname_found = None
            for rdata in answers:
                cname_found = str(rdata.target).rstrip('.')
                break
            
            if cname_found:
                # Check if CNAME points to Vercel
                if cname_found.lower() in [t.lower() for t in VERCEL_CNAME_TARGETS]:
                    # CNAME is correct - mark as dns_verified (awaiting admin activation)
                    supabase.table('custom_domains') \
                        .update({
                            'status': 'dns_verified',
                            'dns_verified_at': datetime.now(timezone.utc).isoformat()
                        }) \
                        .eq('id', domain_id) \
                        .execute()
                    
                    # Log for admin notification
                    logger.info(f"🔔 ADMIN ACTION REQUIRED: Domain '{domain_name}' DNS verified. Add to Vercel dashboard.")
                    
                    return {
                        "status": "success",
                        "verified": True,
                        "dns_status": "dns_verified",
                        "message": "DNS verified! Awaiting activation by admin. This usually takes 24-48 hours.",
                        "cname_found": cname_found
                    }
                else:
                    # CNAME exists but points to wrong target
                    supabase.table('custom_domains') \
                        .update({'status': 'failed'}) \
                        .eq('id', domain_id) \
                        .execute()
                    
                    return {
                        "status": "success",
                        "verified": False,
                        "message": f"CNAME points to wrong target. Found: {cname_found}. Expected: cname.vercel-dns.com",
                        "expected_cname": "cname.vercel-dns.com",
                        "cname_found": cname_found
                    }
            else:
                # No CNAME found
                supabase.table('custom_domains') \
                    .update({'status': 'failed'}) \
                    .eq('id', domain_id) \
                    .execute()
                
                return {
                    "status": "success",
                    "verified": False,
                    "message": "No CNAME record found.",
                    "expected_cname": "cname.vercel-dns.com"
                }
                
        except dns.resolver.NXDOMAIN:
            # Domain does not exist
            supabase.table('custom_domains') \
                .update({'status': 'failed'}) \
                .eq('id', domain_id) \
                .execute()
            
            return {
                "status": "success",
                "verified": False,
                "message": "Domain does not exist. Please check the domain name.",
                "expected_cname": "cname.vercel-dns.com"
            }
            
        except dns.resolver.NoAnswer:
            # No CNAME record configured
            supabase.table('custom_domains') \
                .update({'status': 'failed'}) \
                .eq('id', domain_id) \
                .execute()
            
            return {
                "status": "success",
                "verified": False,
                "message": "No CNAME record found. Please add the CNAME record in your DNS settings.",
                "expected_cname": "cname.vercel-dns.com"
            }
            
        except dns.resolver.Timeout:
            return {
                "status": "error",
                "verified": False,
                "message": "DNS lookup timed out. Please try again.",
                "expected_cname": "cname.vercel-dns.com"
            }
        
        except dns.resolver.NoNameservers:
            # No nameservers available
            supabase.table('custom_domains') \
                .update({'status': 'failed'}) \
                .eq('id', domain_id) \
                .execute()
            
            return {
                "status": "success",
                "verified": False,
                "message": "Could not reach DNS servers. Please try again later.",
                "expected_cname": "cname.vercel-dns.com"
            }
        
        except Exception as dns_error:
            # Catch any other DNS errors - give specific guidance
            error_str = str(dns_error).lower()
            logger.error(f"DNS lookup error for {domain_name}: {dns_error}")
            
            supabase.table('custom_domains') \
                .update({'status': 'failed'}) \
                .eq('id', domain_id) \
                .execute()
            
            # Provide helpful message based on error type
            if 'nxdomain' in error_str or 'does not exist' in error_str:
                message = f"Domain '{domain_name}' does not exist or has no DNS records."
            elif 'no answer' in error_str or 'no cname' in error_str:
                message = "No CNAME record found. Please add the CNAME record pointing to cname.vercel-dns.com"
            elif 'timeout' in error_str:
                message = "DNS lookup timed out. Please wait a few minutes and try again."
            else:
                message = f"DNS lookup failed: {str(dns_error)[:100]}. Make sure your domain has a CNAME record pointing to cname.vercel-dns.com"
            
            return {
                "status": "success",
                "verified": False,
                "message": message,
                "expected_cname": "cname.vercel-dns.com"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying domain: {e}")
        raise HTTPException(status_code=500, detail="Verification failed")


@api_router.delete("/custom-domains/{domain_id}")
async def delete_custom_domain(domain_id: str):
    """Remove a custom domain"""
    try:
        response = supabase.table('custom_domains') \
            .delete() \
            .eq('id', domain_id) \
            .execute()
        
        return {"status": "success", "message": "Domain removed successfully"}
    
    except Exception as e:
        logger.error(f"Error deleting custom domain: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete domain")


@api_router.post("/custom-domains/activate/{domain_id}")
async def activate_custom_domain(domain_id: str, admin_key: str = None):
    """Admin endpoint: Mark domain as active after adding to Vercel"""
    # Simple admin key check (you can make this more secure)
    ADMIN_KEY = os.environ.get('ADMIN_API_KEY', 'trustflow-admin-secret')
    
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        # Get domain info
        domain_res = supabase.table('custom_domains') \
            .select('*') \
            .eq('id', domain_id) \
            .single() \
            .execute()
        
        if not domain_res.data:
            raise HTTPException(status_code=404, detail="Domain not found")
        
        # Only activate if DNS is verified
        if domain_res.data['status'] not in ['dns_verified', 'disconnected']:
            raise HTTPException(status_code=400, detail="Domain DNS must be verified first")
        
        # Mark as active
        supabase.table('custom_domains') \
            .update({
                'status': 'active',
                'activated_at': datetime.now(timezone.utc).isoformat()
            }) \
            .eq('id', domain_id) \
            .execute()
        
        logger.info(f"✅ Domain '{domain_res.data['domain']}' activated by admin")
        
        return {"status": "success", "message": "Domain activated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating domain: {e}")
        raise HTTPException(status_code=500, detail="Failed to activate domain")


@api_router.post("/custom-domains/health-check")
async def health_check_domains(admin_key: str = None):
    """Admin endpoint: Check all active domains and mark disconnected if DNS fails"""
    import dns.resolver
    
    ADMIN_KEY = os.environ.get('ADMIN_API_KEY', 'trustflow-admin-secret')
    VERCEL_CNAME_TARGETS = ['cname.vercel-dns.com', 'cname-china.vercel-dns.com']
    
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        # Get all active domains
        response = supabase.table('custom_domains') \
            .select('*') \
            .eq('status', 'active') \
            .execute()
        
        results = []
        disconnected_count = 0
        
        for domain in response.data or []:
            domain_name = domain['domain']
            domain_id = domain['id']
            is_healthy = False
            
            try:
                answers = dns.resolver.resolve(domain_name, 'CNAME')
                for rdata in answers:
                    cname = str(rdata.target).rstrip('.')
                    if cname.lower() in [t.lower() for t in VERCEL_CNAME_TARGETS]:
                        is_healthy = True
                        break
            except Exception:
                is_healthy = False
            
            if not is_healthy:
                # Mark as disconnected
                supabase.table('custom_domains') \
                    .update({
                        'status': 'disconnected',
                        'disconnected_at': datetime.now(timezone.utc).isoformat()
                    }) \
                    .eq('id', domain_id) \
                    .execute()
                disconnected_count += 1
                logger.warning(f"⚠️ Domain '{domain_name}' marked as DISCONNECTED")
            
            results.append({
                "domain": domain_name,
                "healthy": is_healthy
            })
        
        return {
            "status": "success",
            "checked": len(results),
            "disconnected": disconnected_count,
            "results": results
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")


@api_router.get("/admin/pending-domains")
async def get_pending_domains(admin_key: str = None):
    """Admin endpoint: Get all domains awaiting activation"""
    ADMIN_KEY = os.environ.get('ADMIN_API_KEY', 'trustflow-admin-secret')
    
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        response = supabase.table('custom_domains') \
            .select('*, spaces(space_name, slug)') \
            .eq('status', 'dns_verified') \
            .order('dns_verified_at', desc=True) \
            .execute()
        
        return {
            "status": "success",
            "count": len(response.data or []),
            "domains": response.data or []
        }
    
    except Exception as e:
        logger.error(f"Error fetching pending domains: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending domains")


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