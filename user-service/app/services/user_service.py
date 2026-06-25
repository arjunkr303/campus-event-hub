from app.database.connection import engine
from fastapi import HTTPException, status
from app.schemas.user_schemas import User_Register, User_login
from app.models.user_model import User
from sqlmodel import Session, select
from app.utils.password_hash import hash_password, verify_password
from app.utils.jwt_handler import create_token


def register_user_service(user_data: User_Register):
    with Session(engine) as session:
        statement = select(User).where(User.email == user_data.email)
        existing_user = session.exec(statement).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered!",
            )

        hashed_password = hash_password(user_data.password)

        new_register = User(
            name=user_data.name,
            email=user_data.email,
            password=hashed_password,
            role=user_data.role,
        )

        session.add(new_register)
        session.commit()
        session.refresh(new_register)

        return {
            "message": "User Register Sucessfully!",
            "user": {"name": new_register.name, "email": new_register.email},
        }


def login_user_service(already_exit_data: User_login):
    with Session(engine) as session:
        statement = select(User).where(User.email == already_exit_data.email)
        existing_user = session.exec(statement).first()
        if not existing_user or not verify_password(
            already_exit_data.password, existing_user.password
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Email or Password!",
            )

        token_data = {
            "sub": existing_user.email,
            "user_id": existing_user.id,
            "role": existing_user.role,
        }
        access_token = create_token(token_data)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {"name": existing_user.name, "email": existing_user.email},
            "message": "Login Success!",
        }


def profile_user_service(user_id: int):
    with Session(engine) as session:
        user_details = session.get(User, user_id)

        if not user_details:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "user": user_details.name,
            "message": "User profile is fetched sucessfully!",
        }
