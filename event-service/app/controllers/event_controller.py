from app.services.event_services import (
    create_event_service,
    get_all_event_service,
    get_event_by_id_service,
    update_event_service,
    delete_event_service,
    decrease_seat_service,
    increase_seat_service,
)
from app.schemas.event_schemas import Event_Create, Event_Update


def create_event_controller(event_data: Event_Create):
    return create_event_service(event_data)


def get_all_event_controller():
    return get_all_event_service()


def get_event_by_id_controller(id: int):
    return get_event_by_id_service(id)


def update_event_controller(event_update: Event_Update, id: int):
    return update_event_service(event_update, id)


def delete_event_controller(id: int):
    return delete_event_service(id)


def decrease_seat_controller(id: int):
    return decrease_seat_service(id)


def increase_seat_controller(id: int):
    return increase_seat_service(id)
