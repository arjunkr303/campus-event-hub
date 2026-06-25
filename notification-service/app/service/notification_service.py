def send_notifcation(event_data: dict):
    user_id = event_data.get("user_id")
    event_id = event_data.get("event_id")
    registration_id = event_data.get("registration_id")

    print(
        f"\n [Notification] User {user_id} registered for Event {event_id} with Registration {registration_id}\n"
    )
