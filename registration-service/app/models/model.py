from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional


class registration(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str
    event_id: str
    registered_at: datetime
