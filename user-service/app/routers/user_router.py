from fastapi import APIRouter, Depends
from app.controllers.user_controller import (
    register_user_controller,
    login_user_controller,
    profile_user_controller,
)
from app.schemas.user_schemas import User_Register, User_login
from app.middleware.auth_middleware import get_current_user
from app.middleware.auth_middleware import protected_router
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter()


@router.post("/register")
def register(user_data: User_Register):
    return register_user_controller(user_data)


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    existing_data = User_login(email=form_data.username, password=form_data.password)
    return login_user_controller(existing_data)


@protected_router.get("/profile")
def profile(username: str = Depends(get_current_user)):
    return {"message": f"Welcome {username} to campus event hub!"}


@protected_router.get("/profile/{user_id}")
def get_profile_by_id(user_id: int):
    return profile_user_controller(user_id)
