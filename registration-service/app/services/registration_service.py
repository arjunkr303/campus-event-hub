from datetime import datetime
from fastapi import HTTPException
from app.clients.user_client import get_user
from app.clients.event_client import get_event, decrease_seat, increase_seat
from sqlmodel import Session, select
from app.database.connection import engine
from app.models.model import registration
from app.metrics import REGISTRATION_COUNTER
from app.messaging.registration_producer import publish_registration_event


async def check_duplicate(user_id: int, event_id: int) -> bool:
    with Session(engine) as session:
        statement = select(registration).where(
            registration.user_id == str(user_id), registration.event_id == str(event_id)
        )
        existing_record = session.exec(statement).first()
        return existing_record is not None


async def user_registration_service(user_id: int, event_id: int):

    is_duplicate = await check_duplicate(user_id, event_id)
    if is_duplicate:
        raise HTTPException(status_code=400, detail="Already registered")

    user = await get_user(user_id)
    event = await get_event(event_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.get("available_seats") <= 0:
        raise HTTPException(status_code=400, detail="Event is full")
    await decrease_seat(event_id)

    with Session(engine) as session:
        new_registration = registration(
            user_id=user_id, event_id=event_id, registered_at=datetime.now()
        )
        session.add(new_registration)
        session.commit()
        session.refresh(new_registration)

    REGISTRATION_COUNTER.inc()

    publish_registration_event(
        registration_id=new_registration.id,
        user_id=int(new_registration.user_id),
        event_id=int(new_registration.event_id),
    )

    return {"message": "Registered Successfully!"}


async def user_deletion_service(user_id: int, event_id: int):
    try:
        is_registered = await check_duplicate(user_id, event_id)
        if not is_registered:
            raise HTTPException(
                status_code=404, detail="User not registered for this event"
            )
        with Session(engine) as session:
            statement = select(registration).where(
                registration.user_id == str(user_id),
                registration.event_id == str(event_id),
            )
            result = session.exec(statement).first()
            if result:
                session.delete(result)
                session.commit()

                # Increase available seats for this event
                await increase_seat(event_id)

                return {"message": "Unregistered Successfully!"}
            else:
                raise HTTPException(
                    status_code=404, detail="User not registered for this event"
                )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
