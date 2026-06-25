from pydantic import BaseModel


class User_Register(BaseModel):
    name: str
    email: str
    password: str
    role: str = "User"


class User_login(BaseModel):
    email: str
    password: str
