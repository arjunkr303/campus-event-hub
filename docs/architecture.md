# System Architecture

> High-level architecture overview of the Campus Event Hub microservices platform.

---

## System Overview

```
                            ┌──────────────────┐
                            │  Browser/Client  │
                            └────────┬─────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────────┐
                     │     NGINX API Gateway (:8000)     │
                     │  • Reverse proxy                  │
                     │  • JWT auth via subrequest        │
                     │  • Serves frontend (HTML/CSS/JS)  │
                     └──┬────────┬────────┬──────────────┘
                        │        │        │
               ┌────────┘        │        └─────────┐
               ▼                 ▼                  ▼
    ┌────────────────────┐ ┌──────────────┐ ┌──────────────────────┐
    │  User Service      │ │ Event Service│ │ Registration Service │
    │  (:8001)           │ │ (:8002)      │ │ (:8003)              │
    │                    │ │              │ │                      │
    │ • Register/Login   │ │ • CRUD Events│ │ • Book/Cancel seats  │
    │ • JWT generation   │ │ • Seat mgmt  │ │ • Duplicate checks   │
    │ • Profile mgmt     │ │ • /metrics   │ │ • Kafka producer     │
    │ • /auth/verify     │ │              │ │ • /metrics           │
    └────────┬───────────┘ └──────┬───────┘ └───┬───────────┬──────┘
             │                    │             │           │
             │                    │     HTTP ◄──┘           │
             │                    │   (seat updates)        │ Kafka
             ▼                    ▼                         ▼
    ┌───────────────────────────────────┐     ┌─────────────────────┐
    │       PostgreSQL (Supabase)       │     │   Apache Kafka      │
    │  Tables: users, events,           │     │   Topic:            │
    │          registrations            │     │   registration-     │
    └───────────────────────────────────┘     │   created           │
                                              └─────────┬───────────┘
                                                        │ consume
                                                        ▼
                                             ┌────────────────────┐
                                             │Notification Service│
                                             │ (:8004)            │
                                             │                    │
                                             │ • Kafka consumer   │
                                             │ • Email notifs     │
                                             └────────────────────┘

    ── Monitoring ───────────────────────────────────────────────

    Prometheus (:9090)  ──scrapes /metrics  ──►  Event Service
                        ──scrapes /metrics  ──►  Registration Service

    Grafana (:3000)     ──queries  ──►  Prometheus  ──► Dashboards
```

---

## Registration Flow

```
Student
  ↓
Registration or Login (User Service)
  ↓
JWT Token returned to client
  ↓
Event Registration (Registration Service)
  ↓  ↓
  ↓  Seat decremented (Event Service via HTTP)
  ↓
Kafka event published (registration-created)
  ↓
Notification sent (Notification Service)
```

## Event Management Flow

```
Event Organizer (admin/organiser role)
  ↓
Event Creation / Update / Deletion (Event Service)
  ↓
Prometheus metrics updated (events_created counter, available_seats gauge)
  ↓
Grafana Dashboard auto-refreshes
```

## Booking Cancellation Flow

```
Student
  ↓
DELETE /delete_registration/{user_id}?event_id={id}
  ↓
NGINX verifies JWT via auth subrequest
  ↓
Registration Service deletes booking from PostgreSQL
  ↓
HTTP PATCH to Event Service → seat count incremented
  ↓
Prometheus gauge updated (events_available_seats)
```

---

## Deployment Options

| Method | Files | Best For |
|---|---|---|
| **Docker Compose** | `compose.yml` | Local development & testing |
| **Raw K8s Manifests** | `k8s/` directory | Direct Kubernetes deployments |
| **Helm Charts** | `helm/` directory | Templated, configurable K8s deployments |
| **ArgoCD** | GitOps sync | Continuous delivery from Git to K8s |
| **CI/CD** | `.github/workflows/ci.yml` | Automated build, test, push & deploy |
