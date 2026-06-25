from app.services.registration_service import check_duplicate
from app.schemas.schema import RegistrationCreate, RegistrationResponse
from fastapi import HTTPException
from app.services.registration_service import (
    user_registration_service,
    user_deletion_service,
)


async def create_registration_controller(data: RegistrationCreate):
    try:
        result = await user_registration_service(data.user_id, data.event_id)
        return {"message": "Registration Successful", "result": result}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


async def user_registration_response(user_id: int, event_id: int):
    try:
        is_registered = await check_duplicate(user_id, event_id)
        return {
            "user_id": user_id,
            "event_id": event_id,
            "is_registered": is_registered,
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"User or Event Missing.")


async def user_deletion_controller(user_id: int, event_id: int):
    try:
        result = await user_deletion_service(user_id, event_id)
        return {"message": "User Registration cancelled successfully"}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
