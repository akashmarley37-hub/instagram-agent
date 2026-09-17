import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database.db import Base


class Integration(Base):
    __tablename__ = "integrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    service: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    # service: instagram | google_drive | google_sheets | openai
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="not_connected")
    # status: connected | not_connected | error | demo
    config_json: Mapped[dict] = mapped_column(JSON, nullable=True)  # non-secret config only
    last_tested_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
