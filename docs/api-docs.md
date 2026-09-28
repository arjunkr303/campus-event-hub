# API Endpoints Reference Guide

> Complete REST API documentation for all Campus Event Hub microservices. All public requests should be routed through the **NGINX Gateway** at `http://localhost:8000`.

---

## Quick Reference

| Method | Gateway Route | Internal Route | Service | Auth? |
|---|---|---|---|---|
| `POST` | `/auth/register` | `/auth/register` | User Service | No |
| `POST` | `/auth/login` | `/auth/login` | User Service | No |
| `GET` | `/api/user` | `/user/profile` | User Service | No |
| `GET` | — | `/auth/verify` | User Service | Internal |
| `GET` | — | `/health` | User Service | No |
| `GET` | `/api/events` | `/event/events` | Event Service | **Yes** |
| `GET` | — | `/event/events/{id}` | Event Service | Direct |
| `POST` | `/api/events/create` | `/event/create` | Event Service | **Yes** |
| `PUT` | — | `/event/events/{id}` | Event Service | Direct |
| `DELETE` | — | `/event/events/{id}` | Event Service | Direct |
| `PATCH` | — | `/event/event/{id}/decrease_seat` | Event Service | Internal |
| `PATCH` | — | `/event/event/{id}/increase_seat` | Event Service | Internal |
| `POST` | `/registration` | `/registration` | Registration | **Yes** |
| `GET` | `/check_registration/{user_id}` | `/check_registration/{user_id}` | Registration | No |
| `DELETE` | `/delete_registration/{user_id}` | `/delete_registration/{user_id}` | Registration | No |
| `GET` | — | `/metrics` | Event / Registration | No |
| `GET` | — | `/health` | All Services | No |

> **Auth?** = JWT required via `Authorization: Bearer <token>` header  
> **Internal** = Called by other services or NGINX subrequests, not exposed via gateway  
> **Direct** = Access via the service's direct port (e.g., `localhost:8002`)

---

## 1. User Service (port `8001`)

Handles user sign-up, authentication, JWT management, and profiles.

### POST `/auth/register`
**Description:** Creates a new user account.

**Request Body:**
```json
{
    "name": "Your name",
    "email": "username@gmail.com",
    "password": "securepassword"
}
```

**Success Response (200):**
```json
{
    "id": 1,
    "name": "Your name",
    "email": "username@gmail.com"
}
```

**Error Response (400):** Email already registered.

---

### POST `/auth/login`
**Description:** Authenticates a user and returns a JWT access token.

**Request Body:**
```json
{
    "email": "username@gmail.com",
    "password": "securepassword"
}
```

**Success Response (200):**
```json
{
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer"
}
```

**Error Response (401):** Invalid credentials.

---

### GET `/user/profile`
**Description:** Returns the profile of the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):** Welcome message containing the user's name.

---

### GET `/auth/verify` *(Internal — used by NGINX)*
**Description:** Validates a JWT token. Called by NGINX as an `auth_request` subrequest before forwarding protected requests.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
    "status": "authenticated"
}
```

**Error Response (401):**
```json
{
    "detail": "Token validation failed"
}
```

---

### GET `/health`
**Description:** Health check endpoint.

**Response (200):**
```json
{
    "message": "User Service is healthy"
}
```

---

## 2. Event Service (port `8002`)

Handles campus events and seat inventory. Exposes Prometheus metrics.

### POST `/event/create`
**Description:** Creates a new event. Restricted to `admin` and `organiser` roles.

**Request Body:**
```json
{
    "title": "Event Title",
    "description": "Event Description",
    "location": "Event Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 100
}
```

**Success Response (200):**
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

---

### GET `/event/events`
**Description:** Lists all events happening on campus.

**Success Response (200):**
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
    "message": "Events fetched successfully"
}
```

---

### GET `/event/events/{id}`
**Description:** Gets details of a specific event.

**Success Response (200):**
```json
{
    "id": 1,
    "title": "Event Title",
    "description": "Event Description",
    "location": "Event Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 100,
    "message": "Event details fetched successfully"
}
```

**Error Response (404):** Event not found.

---

### PUT `/event/events/{id}`
**Description:** Updates event details. Restricted to `admin` and `organiser` roles.

**Request Body:**
```json
{
    "title": "Updated Title",
    "description": "Updated Description",
    "location": "Updated Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 150
}
```

**Success Response (200):**
```json
{
    "id": 1,
    "title": "Updated Title",
    "description": "Updated Description",
    "location": "Updated Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 150,
    "message": "Event updated successfully"
}
```

---

### DELETE `/event/events/{id}`
**Description:** Deletes an event. Restricted to `admin` and `organiser` roles.

**Success Response (200):**
```json
{
    "id": 1,
    "title": "Event Title",
    "description": "Event Description",
    "location": "Event Location",
    "date": "2026-12-30T12:00:00",
    "available_seats": 100,
    "message": "Event deleted successfully"
}
```

---

### PATCH `/event/event/{id}/decrease_seat` *(Internal — called by Registration Service)*
**Description:** Decrements available seats by 1. Called when a student books a seat.

**Success Response (200):**
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

---

### PATCH `/event/event/{id}/increase_seat` *(Internal — called by Registration Service)*
**Description:** Increments available seats by 1. Called when a registration is cancelled.

**Success Response (200):**
```json
{
    "message": "Seat increased successfully",
    "available_seats": 100
}
```

---

### GET `/metrics`
**Description:** Exposes Prometheus metrics in text format.

**Response:** `text/plain` — Prometheus exposition format containing `events_created` and `events_available_seats`.

---

## 3. Registration Service (port `8003`)

Handles event bookings, cancellations, and duplicate checks. Publishes Kafka events.

### POST `/registration`
**Description:** Registers a user for an event. Checks for duplicate registrations and seat availability. Publishes a `registration-created` Kafka event on success.

**Request Body:**
```json
{
    "event_id": 1,
    "user_id": 1
}
```

**Success Response (200):**
```json
{
    "id": 1,
    "event_id": 1,
    "user_id": 1,
    "message": "User registered successfully"
}
```

**Error Responses:**
- `400` — User already registered for this event
- `400` — No seats available

---

### GET `/check_registration/{user_id}`
**Description:** Checks if a user is registered for a specific event.

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `event_id` | `int` | Yes | The event to check |

**Success Response (200):**
```json
{
    "user_id": 1,
    "event_id": 1,
    "is_registered": true
}
```

---

### DELETE `/delete_registration/{user_id}`
**Description:** Cancels a user's registration for an event. Restores the seat via HTTP call to Event Service.

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `event_id` | `int` | Yes | The event to cancel |

**Success Response (200):**
```json
{
    "message": "User Registration cancelled successfully"
}
```

---

### GET `/metrics`
**Description:** Exposes Prometheus metrics in text format.

**Response:** `text/plain` — Contains `total_registration` counter.

---

## 4. Notification Service (port `8004`)

Consumes Kafka events and sends notifications. No public API endpoints beyond health check.

### GET `/health`
**Description:** Health check endpoint.

**Response (200):**
```json
{
    "message": "Notification Service is healthy"
}
```

---

## Authentication Guide

### Getting a Token
```bash
# Register a new user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "secret123"}'

# Login to get JWT
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "secret123"}'
```

### Using the Token
```bash
# Access protected endpoint
curl -X GET http://localhost:8000/api/events \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1Ni..."

# Register for an event
curl -X POST http://localhost:8000/registration \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1Ni..." \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "user_id": 1}'
```

### Swagger UI (Interactive API Docs)
Each service exposes auto-generated Swagger documentation:
- User Service: http://localhost:8001/docs
- Event Service: http://localhost:8002/docs
- Registration Service: http://localhost:8003/docs
- Notification Service: http://localhost:8004/docs