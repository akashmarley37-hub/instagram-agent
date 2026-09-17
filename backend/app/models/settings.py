from datetime import datetime
from sqlalchemy import String, Text, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database.db import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default="default")
    default_tone: Mapped[str] = mapped_column(String(50), default="friendly")
    default_language: Mapped[str] = mapped_column(String(50), default="English")
    default_hashtags: Mapped[list] = mapped_column(JSON, default=list)
    timezone: Mapped[str] = mapped_column(String(100), default="Asia/Kolkata")
    brand_instructions: Mapped[str] = mapped_column(Text, nullable=True, default="")
    post_length: Mapped[str] = mapped_column(String(30), default="medium")
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
