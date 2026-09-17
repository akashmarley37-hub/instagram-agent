from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os


class Settings(BaseSettings):
    # Application
    app_env: str = "development"
    secret_key: str = "dev-secret-key-change-in-production"
    debug: bool = True
    app_name: str = "Instagram Agent"
    app_version: str = "1.0.0"

    # Demo Mode: Enables full end-to-end workflow without real API keys
    demo_mode: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./instagram_agent.db"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_max_tokens: int = 1000

    # Instagram
    instagram_access_token: str = ""
    instagram_business_account_id: str = ""
    instagram_api_version: str = "v19.0"

    # Google OAuth & Service Account
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/google-drive/callback"
    google_sheets_spreadsheet_id: str = ""
    google_service_account_json: str = ""
    google_tokens_file: str = "./google_tokens.json"

    # Media & Hosting
    upload_dir: str = "./uploads"
    public_base_url: str = "http://localhost:8000"
    max_file_size_mb: int = 50
    allowed_image_types: str = "image/jpeg,image/png,image/webp"
    allowed_video_types: str = "video/mp4,video/quicktime"

    # CORS
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # Scheduler
    scheduler_timezone: str = "UTC"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def allowed_origins_list(self) -> List[str]:
        if not self.allowed_origins:
            return ["*"]
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def allowed_image_types_list(self) -> List[str]:
        return [t.strip() for t in self.allowed_image_types.split(",")]

    @property
    def allowed_video_types_list(self) -> List[str]:
        return [t.strip() for t in self.allowed_video_types.split(",")]

    @property
    def is_openai_configured(self) -> bool:
        key = self.openai_api_key.strip() if self.openai_api_key else ""
        return bool(key and not key.startswith("your-") and key != "")

    @property
    def is_instagram_configured(self) -> bool:
        token = self.instagram_access_token.strip() if self.instagram_access_token else ""
        account = self.instagram_business_account_id.strip() if self.instagram_business_account_id else ""
        return bool(
            token
            and not token.startswith("your-")
            and account
            and not account.startswith("your-")
        )

    @property
    def is_google_oauth_configured(self) -> bool:
        client_id = self.google_client_id.strip() if self.google_client_id else ""
        secret = self.google_client_secret.strip() if self.google_client_secret else ""
        return bool(client_id and not client_id.startswith("your-") and secret and not secret.startswith("your-"))

    @property
    def is_google_service_account_configured(self) -> bool:
        path = self.google_service_account_json.strip() if self.google_service_account_json else ""
        return bool(path and os.path.exists(path))

    @property
    def is_google_configured(self) -> bool:
        return self.is_google_oauth_configured or self.is_google_service_account_configured or os.path.exists(self.google_tokens_file)

    @property
    def is_google_sheets_configured(self) -> bool:
        sheet_id = self.google_sheets_spreadsheet_id.strip() if self.google_sheets_spreadsheet_id else ""
        return bool(self.is_google_configured and sheet_id and not sheet_id.startswith("your-"))

    @property
    def effective_demo_mode(self) -> bool:
        """Demo mode is disabled across the application."""
        return False


settings = Settings()
