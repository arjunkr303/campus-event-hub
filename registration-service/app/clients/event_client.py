import httpx
from fastapi import HTTPException


async def get_event(event_id: int):
    url = f"http://event-service:8000/event/events/{event_id}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code != 200:
            return None
        return response.json()


async def decrease_seat(event_id: int):
    url = f"http://event-service:8000/event/event/{event_id}/decrease_seat"
    async with httpx.AsyncClient() as client:
        response = await client.patch(url)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to decrease seat in event service: {response.text}",
            )


async def increase_seat(event_id: int):
    url = f"http://event-service:8000/event/event/{event_id}/increase_seat"
    async with httpx.AsyncClient() as client:
        response = await client.patch(url)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to increase seat in event service: {response.text}",
            )
