# API Endpoints Documentation

This document describes the REST API endpoints exposed by the individual services. All public requests should be routed through the NGINX Gateway (`http://localhost:8000`).

## 1. User Service (`port 8001`)

Handles user sign-up, authentication, and profiles.

### POST `/auth/register`

* **Description**: Creates a new user account.
* **Request Body**:
```json
{
    "name": "Your name",
    "email": "username@gmail.com",
    "password": "securepassword"
}
```
* **Response**:
```json
{
    "id": 1,
    "name": "Your name",
    "email": "username@gmail.com"
}
```
### POST `/auth/login`
* **Description**: Logs in an existing user and returns a JWT token.
* **Request Body**:
```json
{
    "email": "username@gmail.com",
    "password": "securepassword"
}
```
* **Response**:
```json
{
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer"
}
```

### GET `/user/profile`
* **Description**: Returns the profile of the authenticated user.
* **Response**: Welcome message containing the user's name.

## 2. Event Service (`port 8002`)

Handles campus events and seat inventory.

### POST `/event/create`
* **Description**: Creates a new event (Restricted to `admin` and `organiser` roles).
* **Request Body**:
```json
{
    "title": "Event Title",
    "description": "Event Description",
    "location": "Event Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 100
}
```
* **Response**:
```json
{
    "id": 1,
    "title": "Event Title",
    "description": "Event Description",
    "location": "Event Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 100
}
```
### GET `/event/events`
* **Description**: List of all events happening on campus.
* **Response**:
```json
{
    "events": [
        {
            "id": 1,
            "title": "Event Title",
            "description": "Event Description",
            "location": "Event Location",
            "date": "2026-12-30T12:00:00",
            "available_seats": 100
        }
    ],
    "message":"Events fetched successfully"
}
```

### GET `/event/events/{id}`
* **Description**: Get the details of a specific event.
* **Response**:
```json
{
    "id": 1,
    "title": "Event Title",
    "description": "Event Description",
    "location": "Event Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 100  ,
    "message":"Event details fetched successfully"
}
```
### PUT `/event/events/{id}`
* **Description**: Updates the details of a specific event(Restricted to `admin` and `organiser` roles).
* **Request Body**:
```json
{
    "title": "Event Title",
    "description": "Event Description",
    "location": "Event Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 100
}
```
* **Response**:
```json
{
    "id": 1,
    "title": "Event Title",
    "description": "Event Description",
    "location": "Event Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 100,
    "message":"Event updated successfully"
}
```
### DELETE `/event/events/{id}`
* **Description**: Deletes a specific event(Restricted to `admin` and `organiser` roles).
* **Response**:
```json
{
    "id": 1,
    "title": "Event Title",
    "description": "Event Description",
    "location": "Event Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 100,
    "message":"Event deleted successfully"
}
```
### PATCH `/event/event/{id}/decrease_seat`
* **Description**: Decrements the number of available seats for a specific event.
* **Response**:
```json
{
    "id": 1,
    "title": "Event Title",
    "description": "Event Description",
    "location": "Event Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 99
}
```

### PATCH `/event/event/{id}/increase_seat`
* **Description**: Increments the number of available seats for a specific event when a registration is cancelled.
* **Response**:
```json
{
    "message": "Seat increased successfully",
    "available_seats": 100
}
```

## 3. Registration Service (`port 8003`)

### POST `/registration`
* **Description**: Registers a user for an event.
* **Request Body**:
```json
{
    "event_id": 1,
    "user_id": 1
}
```
* **Response**:
```json
{
    "id": 1,
    "event_id": 1,
    "user_id": 1,
    "message":"User registered successfully"
}
```
### GET `/check_registration/{user_id}`
* **Description**: Get the registration status for a user and event.
* **Query Parameters**:
  * `event_id` (int)
* **Response**:
```json
{
    "user_id": 1,
    "event_id": 1,
    "is_registered": true
}
```
### DELETE `/delete_registration/{user_id}`
* **Description**: Deletes the registration of a specific user for an event.
* **Query Parameters**:
  * `event_id` (int)
* **Response**:
```json
{
    "message": "User Registration cancelled successfully"
}
```