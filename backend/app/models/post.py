import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Boolean, JSON, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.db import Base


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    media_id: Mapped[str] = mapped_column(String(36), ForeignKey("media.id", ondelete="SET NULL"), nullable=True)
    caption: Mapped[str] = mapped_column(Text, nullable=True)
    hashtags: Mapped[list] = mapped_column(JSON, nullable=True, default=list)
    call_to_action: Mapped[str] = mapped_column(String(500), nullable=True)
    topic: Mapped[str] = mapped_column(String(500), nullable=True)
    tone: Mapped[str] = mapped_column(String(50), nullable=True, default="friendly")
    language: Mapped[str] = mapped_column(String(50), nullable=True, default="English")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    # status: draft | scheduled | publishing | published | failed
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    instagram_media_id: Mapped[str] = mapped_column(String(255), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)
    scheduler_job_id: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    publishing_attempts: Mapped[list["PublishingAttempt"]] = relationship(
        "PublishingAttempt", back_populates="post", cascade="all, delete-orphan", lazy="selectin"
    )


class PublishingAttempt(Base):
    __tablename__ = "publishing_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id: Mapped[str] = mapped_column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    status: Mapped[str] = mapped_column(String(30), nullable=False)  # success | failed | demo_success
    response_code: Mapped[int] = mapped_column(nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    response_payload: Mapped[dict] = mapped_column(JSON, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)

    post: Mapped["Post"] = relationship("Post", back_populates="publishing_attempts", lazy="selectin")
