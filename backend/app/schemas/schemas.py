from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ---- Media Schemas ----

class MediaResponse(BaseModel):
    id: str
    filename: str
    original_name: str
    file_type: str
    mime_type: str
    file_size: int
    width: Optional[int] = None
    height: Optional[int] = None
    drive_file_id: Optional[str] = None
    drive_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---- AI Schemas ----

class GenerateContentRequest(BaseModel):
    topic: str
    tone: str = "friendly"
    language: str = "English"
    media_context: Optional[str] = None
    brand_instructions: Optional[str] = None


class GenerateContentResponse(BaseModel):
    caption: str
    hashtags: List[str]
    call_to_action: Optional[str] = None
    is_demo: bool = False


class RegenerateRequest(BaseModel):
    caption: str
    hashtags: List[str]
    adjustment: str  # shorten | professional | casual | engaging | regenerate
    topic: Optional[str] = None
    tone: Optional[str] = None


# ---- Post Schemas ----

class PostCreate(BaseModel):
    media_id: Optional[str] = None
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    call_to_action: Optional[str] = None
    topic: Optional[str] = None
    tone: Optional[str] = "friendly"
    language: Optional[str] = "English"
    status: str = "draft"


class PostUpdate(BaseModel):
    media_id: Optional[str] = None
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    call_to_action: Optional[str] = None
    topic: Optional[str] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None


class PublishingAttemptResponse(BaseModel):
    id: str
    attempted_at: datetime
    status: str
    response_code: Optional[int] = None
    error_message: Optional[str] = None
    is_demo: bool

    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    id: str
    media_id: Optional[str] = None
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    call_to_action: Optional[str] = None
    topic: Optional[str] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    instagram_media_id: Optional[str] = None
    is_demo: bool
    created_at: datetime
    updated_at: datetime
    media: Optional[MediaResponse] = None
    publishing_attempts: List[PublishingAttemptResponse] = []

    class Config:
        from_attributes = True


class SchedulePostRequest(BaseModel):
    scheduled_at: datetime
    timezone: str = "UTC"


class PublishRequest(BaseModel):
    confirm: bool = True


# ---- Activity Schemas ----

class ActivityResponse(BaseModel):
    id: str
    post_id: Optional[str] = None
    action: str
    description: Optional[str] = None
    status: str
    metadata_json: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Integration Schemas ----

class IntegrationResponse(BaseModel):
    id: str
    service: str
    status: str
    config_json: Optional[dict] = None
    last_tested_at: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class IntegrationConfigRequest(BaseModel):
    service: str
    config: Optional[dict] = None


# ---- Generic Responses ----

class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    pages: int


# ---- Settings Schemas ----

class UserSettingsSchema(BaseModel):
    default_tone: str = "friendly"
    default_language: str = "English"
    default_hashtags: List[str] = []
    timezone: str = "Asia/Kolkata"
    brand_instructions: Optional[str] = ""
    post_length: str = "medium"
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    default_tone: Optional[str] = None
    default_language: Optional[str] = None
    default_hashtags: Optional[List[str]] = None
    timezone: Optional[str] = None
    brand_instructions: Optional[str] = None
    post_length: Optional[str] = None


# ---- Template Schemas ----

class TemplateCreate(BaseModel):
    name: str
    topic: str
    tone: Optional[str] = "friendly"
    language: Optional[str] = "English"
    default_hashtags: Optional[List[str]] = []
    prompt_hint: Optional[str] = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    topic: str
    tone: str
    language: str
    default_hashtags: List[str]
    prompt_hint: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---- AI Image Analysis Schemas ----

class AnalyzeImageRequest(BaseModel):
    media_id: Optional[str] = None
    image_url: Optional[str] = None


class AnalyzeImageResponse(BaseModel):
    suggested_topic: str
    description: str
    suggested_hashtags: List[str]
    suggested_tone: Optional[str] = "friendly"


# ---- Bulk Schedule Schemas ----

class BulkScheduleItem(BaseModel):
    post_id: str
    scheduled_at: datetime


class BulkScheduleRequest(BaseModel):
    items: List[BulkScheduleItem]
    timezone: str = "UTC"


class BulkScheduleResponse(BaseModel):
    success: bool
    scheduled_count: int
    failed_count: int
    errors: List[dict] = []


# ---- Analytics Schemas ----

class AnalyticsOverviewResponse(BaseModel):
    total_posts: int
    published_count: int
    scheduled_count: int
    draft_count: int
    failed_count: int
    published_this_week: int
    published_this_month: int
    success_rate: float
    top_hashtags: List[dict]
    tone_breakdown: dict

