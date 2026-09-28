# Service Request & Messaging Flow

> Step-by-step documentation of how requests flow through the system — from client to NGINX gateway to microservices, database, and Kafka.

---

## Flow 1: User Authentication (Login)

```
  Client              NGINX (:8000)         User Service (:8001)      PostgreSQL
    │                      │                        │                      │
    │  POST /auth/login    │                        │                      │
    │  {email, password}   │                        │                      │
    │─────────────────────►│                        │                      │
    │                      │  proxy_pass            │                      │
    │                      │  POST /auth/login      │                      │
    │                      │───────────────────────►│                      │
    │                      │                        │  Query user by email │
    │                      │                        │─────────────────────►│
    │                      │                        │    User record       │
    │                      │                        │◄─────────────────────│
    │                      │                        │                      │
    │                      │                        │  Verify password     │
    │                      │                        │  hash (bcrypt)       │
    │                      │                        │                      │
    │                      │                        │  Generate JWT        │
    │                      │                        │  (SECRET_KEY + HS256)│
    │                      │                        │                      │
    │                      │  {access_token,        │                      │
    │                      │   token_type: "bearer"}│                      │
    │                      │◄───────────────────────│                      │
    │  200 OK + JWT token  │                        │                      │
    │◄─────────────────────│                        │                      │
    │                      │                        │                      │
```

**Key details:**
- NGINX proxies `/auth/*` directly to `user-service:8000/auth/` — no JWT check needed
- Password is verified against bcrypt hash stored in PostgreSQL
- JWT payload contains user ID and role

---

## Flow 2: Accessing Protected Endpoints (Gateway JWT Verification)

```
  Client              NGINX (:8000)         User Service (:8001)    Event Service (:8002)
    │                      │                        │                      │
    │  GET /api/events     │                        │                      │
    │  Authorization:      │                        │                      │
    │  Bearer <token>      │                        │                      │
    │─────────────────────►│                        │                      │
    │                      │                        │                      │
    │                      │  Internal subrequest   │                      │
    │                      │  GET /auth/verify      │                      │
    │                      │  Authorization: Bearer │                      │
    │                      │───────────────────────►│                      │
    │                      │                        │                      │
    │                      │                        │                      │
    │       ┌──────────────┼── If Token VALID ──────┤                      │
    │       │              │                        │                      │
    │       │              │  200 OK                │                      │
    │       │              │◄───────────────────────│                      │
    │       │              │                        │                      │
    │       │              │  proxy_pass                                   │
    │       │              │  GET /event/events                            │
    │       │              │──────────────────────────────────────────────►│
    │       │              │                                    Event list │
    │       │              │◄──────────────────────────────────────────────│
    │       │  200 OK      │                        │                      │
    │       │  + events    │                        │                      │
    │       │◄─────────────│                        │                      │
    │       │              │                        │                      │
    │       ├──────────────┼── If Token INVALID ────┤                      │
    │       │              │                        │                      │
    │       │              │  401 Unauthorized      │                      │
    │       │              │◄───────────────────────│                      │
    │       │  401         │                        │                      │
    │       │  (blocked)   │                        │                      │
    │       │◄─────────────│                        │                      │
    │       └──────────────│                        │                      │
    │                      │                        │                      │
```

**Key details:**
- NGINX uses `auth_request` directive to make an internal subrequest to `/auth/verify`
- The subrequest passes the original `Authorization` header
- `proxy_pass_request_body off` ensures the original request body isn't sent to the verify endpoint
- Protected routes: `/api/events`, `/api/events/create`, `/registration`

---

## Flow 3: Event Booking & Notifications (End-to-End)

```
  Client           NGINX            User Svc         Reg. Svc         Event Svc          Kafka
    │                 │                 │                 │                 │                 │
    │ POST            │                 │                 │                 │                 │
    │ /registration   │                 │                 │                 │                 │
    │ + JWT token     │                 │                 │                 │                 │
    │────────────────►│                 │                 │                 │                 │
    │                 │                 │                 │                 │                 │
    │                 │ auth subrequest │                 │                 │                 │
    │                 │────────────────►│                 │                 │                 │
    │                 │  200 OK         │                 │                 │                 │
    │                 │◄────────────────│                 │                 │                 │
    │                 │                 │                 │                 │                 │
    │                 │ proxy_pass      │                 │                 │                 │
    │                 │─────────────────────────────────►│                 │                 │
    │                 │                 │                 │                 │                 │
    │                 │                 │                 │ Check duplicate │                 │
    │                 │                 │                 │ registration    │                 │
    │                 │                 │                 │                 │                 │
    │                 │                 │                 │ HTTP GET        │                 │
    │                 │                 │                 │ (check seats)   │                 │
    │                 │                 │                 │────────────────►│                 │
    │                 │                 │                 │  seats > 0      │                 │                 │                 │
    │                 │                 │                 │ │◄────────────────│                 │                 │
    │                 │                 │                 │                 │                 │                 │                 │
    │                 │                 │                 │ HTTP PATCH      │                 │
    │                 │                 │                 │ /decrease_seat  │                 │
    │                 │                 │                 │────────────────►│                 │
    │                 │                 │                 │  Updated event  │                 │
    │                 │                 │                 │◄────────────────│                 │
    │                 │                 │                 │                 │                 │                 │
    │                 │                 │                 │ INSERT into DB  │                 │                 │
    │                 │                 │                 │                 │                 │
    │                 │                 │                 │ (PostgreSQL)    │                 │                 │
    │                 │                 │                 │                 │                 │                 │
    │                 │                 │                 │ Publish event   │                 │                 │
    │                 │                 │                 │─────────────────────────────────► │
    │                 │                 │                 │                 │                 │
    │                 │  200 OK         │                 │                 │                 │
    │                 │◄─────────────────────────────────│                 │                 │
    │  200 OK         │                 │                 │                 │                 │
    │◄────────────────│                 │                 │                 │                 │
    │                 │                 │                 │                 │                 │
    │                 │                 │                 │       ── Async (background) ──   │
    │                 │                 │                 │                 │                 │
    │                 │                 │                 │                 │    Consume           │
    │                 │                 │                 │                 │    event             │
    │                 │                 │                 │                 │                 │
    │                 │                 │                 │          Notification Service           │
    │                 │                 │                 │          sends email to student           │
    │                 │                 │                 │                 │                 │
```

**Key details:**
- Registration Service makes **synchronous HTTP calls** to Event Service for seat checks and updates
- Kafka message is published **after** the DB write succeeds
- Notification Service runs a Kafka consumer in a **background daemon thread** (`threading.Thread(daemon=True)`)

---

## Flow 4: Monitoring & Metrics

```
  Prometheus (:9090)            Event Svc (:8002)       Reg. Svc (:8003)        Grafana (:3000)
    │                                 │                       │                       │
    │  ┌── Every scrape interval ─────┤                       │                       │
    │  │                              │                       │                       │
    │  │  GET /metrics                │                       │                       │
    │  │─────────────────────────────►│                       │                       │
    │  │  events_created,             │                       │                       │
    │  │  events_available_seats      │                       │                       │
    │  │◄─────────────────────────────│                       │                       │
    │  │                              │                       │                       │
    │  │  GET /metrics                │                       │                       │
    │  │──────────────────────────────────────────────────────►│                       │
    │  │  total_registration          │                       │                       │
    │  │◄──────────────────────────────────────────────────────│                       │
    │  │                              │                       │                       │
    │  └──────────────────────────────┤                       │                       │
    │                                 │                       │                       │
    │                                 │                       │    PromQL queries                 │
    │◄──────────────────────────────────────────────────────────────────────────────│
    │  Time-series data               │                       │                       │
    │──────────────────────────────────────────────────────────────────────────────►│
    │                                 │                       │    Render dashboards              │
    │                                 │                       │                       │
```

**Custom metrics exposed:**

| Metric | Service | Type | Description |
|---|---|---|---|
| `events_created` | Event Service | Counter | Total events created |
| `total_registration` | Registration Service | Counter | Total successful registrations |
| `events_available_seats` | Event Service | Gauge | Remaining seats (by `event_id`, `event_title`) |

---

## Flow 5: Booking Cancellation & Seat Restoration

```
  Client              NGINX (:8000)        Reg. Svc (:8003)       Event Svc (:8002)
    │                       │                     │                      │
    │ DELETE                │                     │                      │
    │ /delete_registration  │                     │                      │
    │ /{user_id}?event_id=X │                     │                      │
    │──────────────────────►│                     │                      │
    │                       │                     │                      │
    │                       │ proxy_pass          │                      │
    │                       │────────────────────►│                      │
    │                       │                     │                      │
    │                       │                     │ Check registration   │
    │                       │                     │ exists (PostgreSQL)  │
    │                       │                     │                      │
    │                       │                     │ DELETE record        │
    │                       │                     │ from PostgreSQL      │
    │                       │                     │                      │
    │                       │                     │ HTTP PATCH           │
    │                       │                     │ /increase_seat       │
    │                       │                     │─────────────────────►│
    │                       │                     │                      │
    │                       │                     │                      │ UPDATE seats + 1
    │                       │                     │                      │ (PostgreSQL)
    │                       │                     │                      │
    │                       │                     │                      │ Update Prometheus
    │                       │                     │                      │ gauge
    │                       │                     │                      │
    │                       │                     │  {message,           │
    │                       │                     │   available_seats}   │
    │                       │                     │◄─────────────────────│
    │                       │                     │                      │
    │                       │ "Cancelled          │                      │
    │                       │  successfully"      │                      │
    │                       │◄────────────────────│                      │
    │  200 OK               │                     │                      │
    │◄──────────────────────│                     │                      │
    │                       │                     │                      │
```

**Key details:**
- Seat restoration happens **after** the registration is deleted from the database
- The Event Service updates the Prometheus gauge immediately upon seat change
- No Kafka event is published for cancellations (only for bookings)

---

## Inter-Service Communication Summary

| From | To | Method | Endpoint | Purpose |
|---|---|---|---|---|
| NGINX | User Service | HTTP (internal) | `GET /auth/verify` | JWT validation subrequest |
| Registration Service | Event Service | HTTP | `GET /event/events/{id}` | Check seat availability |
| Registration Service | Event Service | HTTP | `PATCH /event/event/{id}/decrease_seat` | Decrement seats on booking |
| Registration Service | Event Service | HTTP | `PATCH /event/event/{id}/increase_seat` | Restore seats on cancellation |
| Registration Service | Kafka | Kafka Producer | `registration-created` topic | Async notification trigger |
| Kafka | Notification Service | Kafka Consumer | `registration-created` topic | Consume and send notifications |
| Prometheus | Event Service | HTTP | `GET /metrics` | Scrape custom metrics |
| Prometheus | Registration Service | HTTP | `GET /metrics` | Scrape custom metrics |
