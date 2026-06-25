from fastapi import HTTPException, status
from sqlmodel import select, Session
from datetime import datetime
from app.schemas.event_schemas import Event_Create, Event_Update
from app.models.event_model import Event
from app.metrics import EVENTS_CREATED_COUNTER, EVENT_AVAILABLE_SEATS_GAUGE
from app.databases.event_database import engine


def create_event_service(event_data: Event_Create):
    with Session(engine) as session:
        now_dt = (
            datetime.now(event_data.date.tzinfo)
            if event_data.date.tzinfo
            else datetime.now()
        )
        if event_data.date < now_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Date!"
            )
        new_event = Event(
            title=event_data.title,
            description=event_data.description,
            location=event_data.location,
            date=event_data.date,
            available_seats=event_data.available_seats,
        )

        session.add(new_event)
        session.commit()
        session.refresh(new_event)
        EVENTS_CREATED_COUNTER.inc()
        EVENT_AVAILABLE_SEATS_GAUGE.labels(
            event_id=new_event.id, event_title=new_event.title
        ).set(new_event.available_seats)

        return {"title": new_event.title, "message": "Successfully added the event!"}


def get_all_event_service():
    with Session(engine) as session:
        statement = select(Event)
        events = session.exec(statement).all()

        if not events:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="No events found!"
            )

        event_list = []
        for event in events:
            now_dt = (
                datetime.now(event.date.tzinfo) if event.date.tzinfo else datetime.now()
            )
            if event.date > now_dt:
                event_list.append(
                    {
                        "id": event.id,
                        "title": event.title,
                        "description": event.description,
                        "location": event.location,
                        "date": event.date,
                        "available_seats": event.available_seats,
                    }
                )

        return {"events": event_list, "message": "Events fetched successfully!"}


def get_event_by_id_service(id: int):
    with Session(engine) as session:
        event = session.get(Event, id)

        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Event Not Found!"
            )

        return {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "location": event.location,
            "date": event.date,
            "available_seats": event.available_seats,
            "message": "Event fetched sucessfully",
        }


def update_event_service(event_update: Event_Update, id: int):
    with Session(engine) as session:
        event = session.get(Event, id)

        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Event Not Found"
            )

        if event_update.date is not None:
            now_dt = (
                datetime.now(event_update.date.tzinfo)
                if event_update.date.tzinfo
                else datetime.now()
            )
            if event_update.date < now_dt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Date"
                )

        if event_update.title is not None:
            event.title = event_update.title

        if event_update.description is not None:
            event.description = event_update.description

        if event_update.location is not None:
            event.location = event_update.location

        if event_update.date is not None:
            event.date = event_update.date

        if event_update.available_seats is not None:
            event.available_seats = event_update.available_seats

        session.commit()
        session.refresh(event)

        return {"message": "Event Updated Sucessfully"}


def delete_event_service(id: int):
    with Session(engine) as session:
        event = session.get(Event, id)

        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Event Not Found"
            )

        session.delete(event)
        session.commit()

        return {"message": "Event Deleted Sucessfully"}


def decrease_seat_service(id: int):
    with Session(engine) as session:
        statement = select(Event).where(Event.id == id).with_for_update()
        event = session.exec(statement).first()

        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Event Not Found"
            )

        if event.available_seats <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No seats avaliable for this event",
            )

        event.available_seats -= 1

        EVENT_AVAILABLE_SEATS_GAUGE.labels(
            event_id=event.id, event_title=event.title
        ).set(event.available_seats)

        session.add(event)
        session.commit()
        session.refresh(event)

        return {
            "message": "Seat decreased successfully",
            "available_seats": event.available_seats,
        }


def increase_seat_service(id: int):
    with Session(engine) as session:
        statement = select(Event).where(Event.id == id).with_for_update()
        event = session.exec(statement).first()

        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Event Not Found"
            )

        event.available_seats += 1

        EVENT_AVAILABLE_SEATS_GAUGE.labels(
            event_id=event.id, event_title=event.title
        ).set(event.available_seats)

        session.add(event)
        session.commit()
        session.refresh(event)

        return {
            "message": "Seat increased successfully",
            "available_seats": event.available_seats,
        }
