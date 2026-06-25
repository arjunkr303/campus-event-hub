from app.schemas.user_schemas import User_Register, User_login
from app.services.user_service import (
    register_user_service,
    login_user_service,
    profile_user_service,
)


def register_user_controller(user_data: User_Register):
    return register_user_service(user_data)


def login_user_controller(login_data: User_login):
    return login_user_service(login_data)


def profile_user_controller(user_id: int):
    return profile_user_service(user_id)
