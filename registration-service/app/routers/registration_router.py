from app.controllers.registration_controller import (
    create_registration_controller,
    user_registration_response,
    user_deletion_controller,
)
from app.schemas.schema import RegistrationCreate
from fastapi import APIRouter

router = APIRouter()


@router.post("/registration")
async def new_registration(data: RegistrationCreate):
    return await create_registration_controller(data)


@router.get("/check_registration/{user_id}")
async def get_user_registration_status(user_id: int, event_id: int):
    return await user_registration_response(user_id, event_id)


@router.delete("/delete_registration/{user_id}")
async def delete_registration(user_id: int, event_id: int):
    return await user_deletion_controller(user_id, event_id)
