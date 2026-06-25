from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, TIMESTAMP


class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    location: str
    date: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=TIMESTAMP(timezone=True),
    )
    available_seats: int = Field(default=0)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)

    def book_seat(self) -> str:
        if self.available_seats <= 0:
            return "Event Full"
        self.available_seats -= 1
        return "Success"

    def cancel_seat(self) -> str:
        self.available_seats += 1
        return "Success"
