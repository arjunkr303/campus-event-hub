from pydantic import BaseModel
from datetime import datetime


class RegistrationCreate(BaseModel):
    user_id: int
    event_id: int


class RegistrationResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    registered_at: datetime
