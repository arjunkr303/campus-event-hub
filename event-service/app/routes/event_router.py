from fastapi import APIRouter, Depends
from app.controllers.event_controller import (
    create_event_controller,
    get_all_event_service,
    get_event_by_id_service,
    update_event_controller,
    delete_event_service,
    decrease_seat_controller,
    increase_seat_controller,
)
from app.schemas.event_schemas import Event_Create, Event_Update
from app.middleware.event_middleware import RoleChecker

router = APIRouter()

allow_admin_or_organizer = RoleChecker(["admin", "organizer"])
allow_all = RoleChecker(["admin", "organizer", "user"])


@router.post("/create", dependencies=[Depends(allow_admin_or_organizer)])
def add_event(event_data: Event_Create):
    return create_event_controller(event_data)


@router.get("/events", dependencies=[Depends(allow_all)])
def get_all_events():
    return get_all_event_service()


@router.get("/events/{id}")
def get_event_by_id(id: int):
    return get_event_by_id_service(id)


@router.put("/events/{id}")
def update_event(event_update: Event_Update, id: int):
    return update_event_controller(event_update, id)


@router.patch("/event/{id}/decrease_seat")
def decrease_seat(id: int):
    return decrease_seat_controller(id)


@router.patch("/event/{id}/increase_seat")
def increase_seat(id: int):
    return increase_seat_controller(id)


@router.delete("/events/{id}", dependencies=[Depends(allow_admin_or_organizer)])
def delete_event(id: int):
    return delete_event_service(id)
