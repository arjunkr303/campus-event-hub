from datetime import datetime
from sqlmodel import SQLModel, Field
from typing import Optional


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str
    password: str
    role: str = "User"
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
