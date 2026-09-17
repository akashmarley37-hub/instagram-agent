"""
Instagram Service — Media publishing via Instagram Graph API.
Production implementation: Zero mock data, zero simulated publishing.
Uses INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID, and INSTAGRAM_API_VERSION.
"""
import asyncio
import httpx
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.config.settings import settings

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com"


class InstagramNotConfiguredError(ValueError):
    """Raised when Instagram credentials are missing."""
    pass


class InstagramPublishResult:
    def __init__(
        self,
        success: bool,
        instagram_media_id: Optional[str] = None,
        error_message: Optional[str] = None,
        response_code: int = 200,
        response_payload: Optional[Dict[str, Any]] = None,
        is_demo: bool = False
    ):
        self.success = success
        self.instagram_media_id = instagram_media_id
        self.error_message = error_message
        self.response_code = response_code
        self.response_payload = response_payload or {}
        self.is_demo = is_demo


class InstagramService:
    """
    Instagram Graph API integration service.
    Direct integration with Meta Graph API endpoints.
    """

    def _get_api_version(self) -> str:
        return settings.instagram_api_version or "v19.0"

    async def validate_connection(self) -> dict:
        """
        Verify Instagram Graph API credentials against Meta servers.
        Returns connection details without exposing the access token.
        """
        if not settings.is_instagram_configured:
            return {
                "connected": False,
                "status": "not_configured",
                "message": "Instagram API credentials are not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID in .env",
                "configured": False,
                "is_demo": False,
            }

        account_id = settings.instagram_business_account_id
        version = self._get_api_version()

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{GRAPH_API_BASE}/{version}/{account_id}",
                    params={
                        "fields": "id,name,username,profile_picture_url",
                        "access_token": settings.instagram_access_token,
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "connected": True,
                        "status": "connected",
                        "account_id": data.get("id"),
                        "username": data.get("username", ""),
                        "name": data.get("name", ""),
                        "configured": True,
                        "is_demo": False,
                    }
                else:
                    err_body = response.json().get("error", {})
                    err_msg = err_body.get("message", f"Instagram API returned status {response.status_code}")
                    logger.warning(f"Instagram validation failed: {err_msg}")
                    return {
                        "connected": False,
                        "status": "error",
                        "message": err_msg,
                        "configured": True,
                        "is_demo": False,
                    }
        except httpx.TimeoutException:
            return {
                "connected": False,
                "status": "error",
                "message": "Instagram API request timed out.",
                "configured": True,
                "is_demo": False,
            }
        except Exception as e:
            logger.error(f"Instagram connection validation error: {e}")
            return {
                "connected": False,
                "status": "error",
                "message": f"Unable to reach Instagram API: {str(e)}",
                "configured": True,
                "is_demo": False,
            }

    async def publish_post(
        self,
        media_url: str,
        caption: str,
        post_id: str,
        is_video: bool = False
    ) -> InstagramPublishResult:
        """
        Publish an image or video to Instagram using Instagram Graph API.
        Never fakes or simulates a publish.
        """
        if not settings.is_instagram_configured:
            logger.warning(f"Cannot publish post {post_id}: Instagram credentials are not configured.")
            return InstagramPublishResult(
                success=False,
                instagram_media_id=None,
                error_message=(
                    "Instagram Graph API credentials are not configured. "
                    "Please set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID in backend/.env."
                ),
                response_code=400,
                is_demo=False
            )

        if not media_url:
            return InstagramPublishResult(
                success=False,
                instagram_media_id=None,
                error_message="Media URL is required to publish to Instagram.",
                response_code=400,
                is_demo=False
            )

        # Validate that media_url is a public web URL (Instagram cannot fetch localhost)
        if "localhost" in media_url or "127.0.0.1" in media_url:
            logger.warning(f"Instagram requires a publicly accessible media URL. Found: {media_url}")
            return InstagramPublishResult(
                success=False,
                instagram_media_id=None,
                error_message=(
                    "Instagram Graph API requires a publicly accessible HTTPS media URL. "
                    "Local URLs (localhost / 127.0.0.1) cannot be accessed by Instagram's servers. "
                    "Configure PUBLIC_BASE_URL in .env with your public domain or ngrok tunnel URL."
                ),
                response_code=400,
                is_demo=False
            )

        account_id = settings.instagram_business_account_id
        token = settings.instagram_access_token
        version = self._get_api_version()

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                # Step 1: Create media container
                container_params = {
                    "caption": caption,
                    "access_token": token,
                }
                if is_video:
                    container_params["media_type"] = "REELS"
                    container_params["video_url"] = media_url
                else:
                    container_params["image_url"] = media_url

                container_res = await client.post(
                    f"{GRAPH_API_BASE}/{version}/{account_id}/media",
                    params=container_params
                )
                container_data = container_res.json()

                if container_res.status_code != 200 or "id" not in container_data:
                    error = container_data.get("error", {})
                    msg = error.get("message", f"Failed to create media container (status {container_res.status_code})")
                    logger.error(f"Instagram container creation error: {msg}")
                    return InstagramPublishResult(
                        success=False,
                        error_message=f"Instagram API error: {msg}",
                        response_code=container_res.status_code,
                        response_payload=container_data,
                        is_demo=False
                    )

                container_id = container_data["id"]
                logger.info(f"Instagram media container created: {container_id} for post {post_id}")

                # Step 2: For videos / reels, wait for container status to be FINISHED
                if is_video:
                    max_attempts = 12
                    ready = False
                    for attempt in range(max_attempts):
                        await asyncio.sleep(5)
                        status_res = await client.get(
                            f"{GRAPH_API_BASE}/{version}/{container_id}",
                            params={
                                "fields": "status_code",
                                "access_token": token,
                            }
                        )
                        if status_res.status_code == 200:
                            s_data = status_res.json()
                            if s_data.get("status_code") == "FINISHED":
                                ready = True
                                break
                            elif s_data.get("status_code") == "ERROR":
                                return InstagramPublishResult(
                                    success=False,
                                    error_message="Instagram media processing failed on Meta servers.",
                                    response_code=500,
                                    response_payload=s_data,
                                    is_demo=False
                                )
                    if not ready:
                        return InstagramPublishResult(
                            success=False,
                            error_message="Instagram media processing timed out waiting for video upload completion.",
                            response_code=504,
                            is_demo=False
                        )

                # Step 3: Publish container
                publish_res = await client.post(
                    f"{GRAPH_API_BASE}/{version}/{account_id}/media_publish",
                    params={
                        "creation_id": container_id,
                        "access_token": token,
                    }
                )
                publish_data = publish_res.json()

                if publish_res.status_code != 200 or "id" not in publish_data:
                    error = publish_data.get("error", {})
                    msg = error.get("message", f"Failed to publish container (status {publish_res.status_code})")
                    logger.error(f"Instagram publish error: {msg}")
                    return InstagramPublishResult(
                        success=False,
                        error_message=f"Instagram publish failed: {msg}",
                        response_code=publish_res.status_code,
                        response_payload=publish_data,
                        is_demo=False
                    )

                media_id = publish_data["id"]
                logger.info(f"Instagram post published successfully! Media ID: {media_id}")
                return InstagramPublishResult(
                    success=True,
                    instagram_media_id=media_id,
                    error_message=None,
                    response_code=200,
                    response_payload={"id": media_id},
                    is_demo=False
                )

        except httpx.TimeoutException:
            return InstagramPublishResult(
                success=False,
                error_message="Instagram API request timed out.",
                response_code=504,
                is_demo=False
            )
        except Exception as e:
            logger.error(f"Unexpected error publishing to Instagram: {e}")
            return InstagramPublishResult(
                success=False,
                error_message=f"Instagram publishing error: {str(e)}",
                response_code=500,
                is_demo=False
            )

    def get_status(self) -> dict:
        """Get current Instagram configuration status."""
        if not settings.is_instagram_configured:
            return {
                "status": "not_configured",
                "configured": False,
                "message": "Instagram credentials not configured. Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID to .env."
            }
        return {
            "status": "configured",
            "configured": True,
            "message": "Instagram credentials configured. Test connection to verify access."
        }


instagram_service = InstagramService()
