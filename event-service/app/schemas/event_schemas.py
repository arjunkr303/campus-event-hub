from pydantic import BaseModel, Field, field_validator
from datetime import datetime


class Event_Create(BaseModel):
    title: str
    description: str
    location: str
    date: datetime
    available_seats: int = Field(
        ge=0
    )  # Available seats must be greater than or equal to 0

    @field_validator("date")
    def validate_date(cls, value):
        if value is not None:
            now_dt = datetime.now(value.tzinfo) if value.tzinfo else datetime.now()
            if value < now_dt:
                raise ValueError("Date cannot be in the past")
        return value


class Event_Update(BaseModel):
    title: str = None
    description: str = None
    location: str = None
    date: datetime = None
    available_seats: int = Field(
        ge=0
    )  # Available seats must be greater than or equal to 0

    @field_validator("date")
    def validate_date(cls, value):
        if value is not None:
            now_dt = datetime.now(value.tzinfo) if value.tzinfo else datetime.now()
            if value < now_dt:
                raise ValueError("Date cannot be in the past")
        return value


class Event_Response(BaseModel):
    id: int
    title: str
    description: str
    location: str
    date: datetime
    available_seats: int
