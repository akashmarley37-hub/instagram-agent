"""
Google Sheets Service — Real Google Sheets API integration.
Zero mock data. Appends published posts to a designated Google Sheet.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List
from app.config.settings import settings
from app.services.google_drive_service import google_drive_service

logger = logging.getLogger(__name__)


class GoogleSheetsService:
    """Sync posts to Google Sheets using Google Sheets API v4."""

    def get_status(self) -> dict:
        """Check Google Sheets configuration status."""
        if not settings.is_google_sheets_configured:
            return {
                "connected": False,
                "status": "not_configured",
                "configured": False,
                "message": "Google Sheets not configured. Set GOOGLE_SHEETS_SPREADSHEET_ID and Google credentials in .env.",
                "is_demo": False,
            }

        creds = google_drive_service._get_credentials()
        if creds is not None:
            return {
                "connected": True,
                "status": "connected",
                "configured": True,
                "spreadsheet_id": settings.google_sheets_spreadsheet_id,
                "message": "Google Sheets connected and ready.",
                "is_demo": False,
            }

        return {
            "connected": False,
            "status": "not_configured",
            "configured": True,
            "message": "Spreadsheet ID configured, but Google authorization is required.",
            "is_demo": False,
        }

    async def log_post_to_sheet(
        self,
        post_id: str,
        status: str,
        caption: str,
        hashtags: Optional[List[str]] = None,
        instagram_media_id: Optional[str] = None,
        media_url: Optional[str] = None,
    ) -> bool:
        """Append post record to the configured Google Sheet."""
        if not settings.is_google_sheets_configured:
            logger.info("Google Sheets not configured. Skipping sheet sync.")
            return False

        creds = google_drive_service._get_credentials()
        if not creds:
            logger.warning("Google credentials unavailable for Sheets sync.")
            return False

        try:
            from googleapiclient.discovery import build
            service = build("sheets", "v4", credentials=creds, cache_discovery=False)
            spreadsheet_id = settings.google_sheets_spreadsheet_id

            row = [
                datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
                post_id,
                status,
                caption[:500] if caption else "",
                " ".join(hashtags or []),
                instagram_media_id or "",
                media_url or "",
            ]

            body = {"values": [row]}
            service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range="Sheet1!A:G",
                valueInputOption="USER_ENTERED",
                insertDataOption="INSERT_ROWS",
                body=body
            ).execute()

            logger.info(f"Successfully synced post {post_id} to Google Sheets.")
            return True

        except Exception as e:
            logger.error(f"Failed to log post {post_id} to Google Sheets: {e}")
            return False


google_sheets_service = GoogleSheetsService()
