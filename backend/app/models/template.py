import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database.db import Base


class ContentTemplate(Base):
    __tablename__ = "content_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    topic: Mapped[str] = mapped_column(String(500), nullable=False)
    tone: Mapped[str] = mapped_column(String(50), default="friendly")
    language: Mapped[str] = mapped_column(String(50), default="English")
    default_hashtags: Mapped[list] = mapped_column(JSON, default=list)
    prompt_hint: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
