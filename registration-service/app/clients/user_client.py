import httpx


async def get_user(user_id: str):
    url = f"http://user-service:8000/user/profile/{user_id}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code != 200:
            return None
        return response.json()
