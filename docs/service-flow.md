## Microservices System Flow
This file describes how the services, NGINX gateway, Kafka, and the database interact with each other.

### Flow 1: User Authentication (Login)
---
1. **Client** sends login credentials (`POST /auth/login`) to the **NGINX Gateway** on port `8000`.
2. **NGINX** proxies the request to the **User Service** (`port 8001`).
3. **User Service** verifies password hashes against PostgreSQL.
4. **User Service** generates a JWT access token using its `SECRET_KEY` and returns it to the client.

### Flow 2: Accessing Protected Endpoints (Gateway Verification)
---
1. **Client** requests a protected route like `GET /api/events` and includes the header:
   `Authorization: Bearer <token>`
2. **NGINX** intercepts the request and makes an internal subrequest to the **User Service** (`GET /auth/verify`).
3. **User Service** decodes the JWT and validates the signature.
   * If **Valid**: Returns `200 OK`. NGINX proceeds to forward the client's request to the **Event Service** (`port 8002`).
   * If **Invalid**: Returns `401 Unauthorized`. NGINX blocks the request and rejects the client.

### Flow 3: Event Booking & Notifications (End-to-End)
---
1. **Client** sends `POST /registration` request (with JWT token) to **NGINX Gateway**.
2. **NGINX** verifies the token via **User Service** and forwards the request to **Registration Service** (`port 8003`).
3. **Registration Service** queries **Event Service** (`port 8002`) via HTTP to get available seats.
4. If seats are available, **Registration Service** sends an HTTP `PATCH /event/event/{id}/decrease_seat` request to **Event Service** to decrement the seat count.
5. **Registration Service** writes the registration to its PostgreSQL database and publishes a **`registration-created`** event to **Kafka**.
6. **Notification Service** consumes the event from Kafka and sends a confirmation email to the user.

### Flow 4: Monitoring & Metrics
---
1. **Prometheus** (`port 9090`) scrapes metrics from:
   - **NGINX Gateway** (via `nginx_exporter`).
   - **All three Microservices** (via `/metrics` endpoints).
2. **Grafana** (`port 3000`) queries Prometheus to visualize system health and custom metrics (e.g., available seats, event count).

### Flow 5: Booking Cancellation & Seat Restoration (End-to-End)
---
1. **Client** sends `DELETE /delete_registration/{user_id}?event_id={id}` request (with JWT token) to **NGINX Gateway**.
2. **NGINX** verifies the token and forwards the request to **Registration Service** (`port 8003`).
3. **Registration Service** checks if the registration exists, deletes the record from its PostgreSQL database, and commits.
4. Upon successful deletion, **Registration Service** sends an HTTP `PATCH /event/event/{id}/increase_seat` request to **Event Service** to restore the seat.
5. **Event Service** increments the seat count and updates its Prometheus available seats gauge (`EVENT_AVAILABLE_SEATS_GAUGE`).
