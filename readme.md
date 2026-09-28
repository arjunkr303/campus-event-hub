#  Campus Event Hub

> A microservices-based platform for managing and discovering campus events — built with FastAPI, PostgreSQL, Kafka, Docker, Kubernetes, and Helm.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Docker Compose (Local Development)](#docker-compose-local-development)
  - [Kubernetes Deployment](#kubernetes-deployment)
  - [Helm Deployment](#helm-deployment)
- [Environment Configuration](#environment-configuration)
- [Networking & Ports](#networking--ports)
- [NGINX Gateway Routing Rules](#nginx-gateway-routing-rules)
- [Kafka Topics](#kafka-topics)
- [Monitoring & Custom Metrics](#monitoring--custom-metrics)
- [CI/CD Pipeline](#cicd-pipeline)
- [Canary (Blue/Green) Deployment](#canary-bluegreen-deployment)
- [Documentation](#documentation)

---

## Overview

Campus Event Hub is a centralized platform for managing and discovering events happening across a college campus. Students can register/login, browse events, book seats, and receive notifications — all through a single-page frontend served via an NGINX API Gateway.

Key capabilities:
- **User management** — registration, login, JWT-based authentication
- **Event management** — CRUD operations with role-based access (`admin`, `organiser`)
- **Event registration** — seat booking with real-time seat tracking
- **Async notifications** — Kafka-driven event notifications
- **Observability** — Prometheus metrics + Grafana dashboards
- **Deployment flexibility** — Docker Compose, raw K8s manifests, and Helm charts

---

## Architecture

### System Overview

```
                            ┌──────────────────┐
                            │   Browser/Client │
                            └────────┬─────────┘
                                     │
                                     ▼
                     ┌─────────────────────────────────┐
                     │     NGINX API Gateway (:8000)   │
                     │  • Reverse proxy                │
                     │  • JWT auth via subrequest      │
                     │  • Serves frontend (HTML/CSS/JS)│
                     └──┬────────┬────────┬────────────┘
                        │        │        │
               ┌────────┘        │        └────────┐
               ▼                 ▼                 ▼
    ┌───────────────────┐ ┌──────────────┐ ┌──────────────────────┐
    │  User Service     │ │ Event Service│ │ Registration Service │
    │  (:8001)          │ │ (:8002)      │ │ (:8003)              │
    │                   │ │              │ │                      │
    │ • Register/Login  │ │ • CRUD Events│ │ • Book/Cancel seats  │
    │ • JWT generation  │ │ • Seat mgmt  │ │ • Duplicate checks   │
    │ • /auth/verify    │ │ • /metrics   │ │ • /metrics           │
    └────────┬──────────┘ └──────┬───────┘ └───┬──────────┬───────┘
             │                   │             │          │
             │                   │    HTTP ◄───┘          │
             │                   │  (seat updates)        │ Kafka
             ▼                   ▼                        ▼
    ┌──────────────────────────────────┐     ┌────────────────────┐
    │       PostgreSQL (Supabase)      │     │   Apache Kafka     │
    │  Tables: users, events,          │     │   Topic:           │
    │          registrations           │     │   registration-    │
    └──────────────────────────────────┘     │   created          │
                                             └─────────┬──────────┘
                                                       │ consume
                                                       ▼
                                            ┌────────────────────┐
                                            │Notification Service│
                                            │ (:8004)            │
                                            │                    │
                                            │ • Kafka consumer   │
                                            │ • Sends emails     │
                                            └────────────────────┘

    ── Monitoring ──────────────────────────────────────────────

    Prometheus (:9090)  ──scrapes /metrics  ──►  Event Service
                        ──scrapes /metrics  ──►  Registration Service

    Grafana (:3000)     ──queries  ──►  Prometheus  ──► Dashboards
```

### How Registration Works (Step by Step)

```
1. Student opens the app            →  NGINX serves frontend (HTML/CSS/JS)
2. Student registers/logs in        →  NGINX proxies to User Service
3. User Service returns JWT token   →  Student stores token in browser
4. Student clicks "Register"        →  NGINX checks JWT via /auth/verify
5. JWT valid?                       →  NGINX forwards to Registration Service
6. Registration Service checks      →  Queries Event Service for seat count
7. Seats available?                 →  HTTP PATCH to Event Service (seat - 1)
8. Saves booking in PostgreSQL      →  Publishes "registration-created" to Kafka
9. Notification Service consumes    →  Sends confirmation email to student
```

### How Event Management Works

```
1. Organizer logs in               →  Gets JWT with "admin" or "organiser" role
2. Creates/Updates/Deletes event   →  NGINX checks JWT, forwards to Event Service
3. Event Service updates PostgreSQL →  Updates Prometheus metrics
4. Grafana dashboard auto-refreshes →  Shows updated seat counts & event totals
```

---

## Services

| Service | Port | Description |
|---|---|---|
| **User Service** | `8001` → `8000` | Account registration, login, JWT auth, profile management, `/auth/verify` subrequest endpoint for NGINX |
| **Event Service** | `8002` → `8000` | CRUD for campus events, seat inventory management, Prometheus metrics (`/metrics`) |
| **Registration Service** | `8003` → `8000` | Event booking, cancellation, duplicate-check, Kafka producer, Prometheus metrics (`/metrics`) |
| **Notification Service** | `8004` → `8000` | Kafka consumer (background thread), sends notifications on `registration-created` events |

Each service has its own:
- `main.py` — FastAPI app entrypoint
- `app/` — business logic (controllers, services, models, schemas, routers, database)
- `dockerfile` — container image build
- `requirements.txt` — Python dependencies
- `tests/` — unit tests (pytest + httpx)
- `.env` — environment variables (gitignored)
- `.env.example` — env template with placeholder values (committed)

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.10** | Runtime |
| **FastAPI** | API framework |
| **SQLModel** | ORM (SQLAlchemy + Pydantic) |
| **PostgreSQL** | Primary database (local Docker container or Supabase) |
| **JWT** (`python-jose`, `pyjwt`) | Authentication & authorization |
| **Kafka** (`kafka-python`) | Async message broker |
| **Prometheus** (`prometheus-client`) | Metrics collection |
| **httpx** | Inter-service HTTP calls |
| **passlib[bcrypt]** | Password hashing |
| **Uvicorn** | ASGI server |

### Infrastructure & DevOps
| Technology | Purpose |
|---|---|
| **Docker** / **Docker Compose** | Containerization & local orchestration |
| **Kubernetes** | Production orchestration (raw manifests in `k8s/`) |
| **Helm** | Templated K8s deployments (charts in `helm/`) |
| **NGINX** | API gateway, reverse proxy, static file serving, auth subrequest |
| **Prometheus** | Metrics scraping & storage |
| **Grafana** | Dashboards & visualization |
| **Apache Kafka** | Event streaming / message broker |
| **Kafka UI** | Kafka cluster management UI |
| **GitHub Actions** | CI/CD pipeline (`.github/workflows/ci.yml`) |
| **ArgoCD** | GitOps continuous delivery (K8s) |

### Frontend
| Technology | Purpose |
|---|---|
| **HTML / CSS / JavaScript** | Single-page application served by NGINX |

---

## Folder Structure

```text
campus-event-hub/
├── .github/
│   └── workflows/
│       └── ci.yml                          # GitHub Actions CI/CD pipeline
├── docs/
│   ├── api-docs.md                         # REST API endpoint reference
│   ├── architecture.md                     # High-level architecture flows
│   └── service-flow.md                     # Detailed inter-service flow diagrams
├── frontend/
│   ├── index.html                          # SPA entry point
│   ├── index.css                           # Styles
│   └── app.js                              # Client-side logic
├── user-service/
│   ├── app/
│   │   ├── controllers/                    # Request handlers
│   │   ├── database/                       # DB connection & lifespan
│   │   ├── middleware/                      # Custom middleware
│   │   ├── models/                         # SQLModel table definitions
│   │   ├── routers/                        # FastAPI route declarations
│   │   ├── schemas/                        # Pydantic request/response schemas
│   │   ├── services/                       # Business logic
│   │   └── utils/                          # JWT handler, helpers
│   ├── tests/test_main.py                  # Pytest unit tests
│   ├── main.py                             # FastAPI app entrypoint
│   ├── dockerfile                          # Docker image build
│   └── requirements.txt                    # Python dependencies
├── event-service/
│   ├── app/
│   │   ├── controllers/
│   │   ├── databases/
│   │   ├── metrics.py                      # Prometheus metric definitions
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── utils/
│   ├── tests/
│   ├── main.py
│   ├── dockerfile
│   └── requirements.txt
├── registration-service/
│   ├── app/
│   │   ├── clients/                        # HTTP clients for inter-service calls
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── messaging/                      # Kafka producer
│   │   ├── metrics.py                      # Prometheus metric definitions
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── services/
│   ├── tests/
│   ├── main.py
│   ├── dockerfile
│   └── requirements.txt
├── notification-service/
│   ├── app/
│   │   ├── messaging/                      # Kafka consumer
│   │   └── service/                        # Notification logic
│   ├── tests/
│   ├── main.py
│   ├── dockerfile
│   └── requirements.txt
├── infrastructure/
│   ├── nginx/
│   │   ├── nginx.conf                      # NGINX reverse proxy + auth config
│   │   └── dockerfile
│   ├── grafana/
│   │   ├── dashboards/                     # Pre-provisioned dashboard JSON
│   │   └── provisioning/                   # Grafana datasource/dashboard provisioning
│   └── promethus/
│       └── prometheus.yml                  # Prometheus scrape config
├── k8s/                                    # Raw Kubernetes manifests
│   ├── event-service/
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── secret.template.yaml
│   │   └── service.yaml
│   ├── ingress/
│   │   ├── ingress.yaml
│   │   ├── ingress-blue.yaml              # Primary ingress (Blue)
│   │   └── ingress-canary.yaml            # Canary ingress (Green)
│   ├── kafka/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── monitoring/
│   │   ├── grafana-config.yaml
│   │   ├── grafana-dashboard-config.yaml
│   │   ├── grafana-deployment.yaml
│   │   ├── prometheus-config.yaml
│   │   └── prometheus-deployment.yaml
│   ├── notification-service/
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── postgres/
│   │   ├── deployment.yaml
│   │   ├── pvc.yaml
│   │   └── service.yaml
│   ├── rbac/                               # RBAC roles & bindings
│   │   ├── user-service-role.yaml
│   │   └── user-service-rolebinding.yaml
│   ├── registration-service/
│   │   ├── configmap.yaml
│   │   ├── deployment.yaml
│   │   ├── secret.template.yaml
│   │   └── service.yaml
│   └── user-service/
│       ├── configmap.yaml
│       ├── deployment.yaml
│       ├── hpa.yaml                        # HorizontalPodAutoscaler
│       ├── secret.template.yaml
│       ├── service.yaml
│       ├── user-service-blue/              # Blue deployment (v1)
│       │   ├── deployment.yaml
│       │   ├── hpa.yaml
│       │   └── service.yaml
│       └── user-service-green/             # Green deployment (v2)
│           ├── deployment.yaml
│           ├── hpa.yaml
│           └── service.yaml
├── helm/                                   # Helm charts
│   └── user-service/
│       ├── Chart.yaml                      # Chart metadata (v0.1.0)
│       ├── values.yaml                     # Default values
│       ├── secrets-values.yaml             # Sensitive overrides (gitignored)
│       └── templates/
│           ├── _helpers.tpl
│           ├── configmap.yaml
│           ├── deployment.yaml
│           ├── hpa.yaml
│           ├── ingress.yaml
│           ├── secrets.yaml
│           └── service.yaml
├── compose.yml                             # Docker Compose orchestration
├── .gitignore
└── readme.md
```

---

## Getting Started

### Prerequisites

- **Docker** & **Docker Compose** (for local development — PostgreSQL runs as a container)
- **kubectl** & a Kubernetes cluster (for K8s deployment — Minikube, kind, or cloud)
- **Helm 3** (for Helm-based deployment)
- **Python 3.10** (for running services outside Docker)

### Docker Compose (Local Development)

1. **Create `.env` files** from the templates:
   ```bash
   cp user-service/.env.example user-service/.env
   cp event-service/.env.example event-service/.env
   cp registration-service/.env.example registration-service/.env
   cp notification-service/.env.example notification-service/.env
   ```
   The defaults point to the local PostgreSQL container — no edits needed to get started.

2. **Start all services** (PostgreSQL starts first, services wait for it to be healthy):
   ```bash
   docker compose up --build
   ```
   Or run in background:
   ```bash
   docker compose up -d --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:8000
   - Swagger UI (User): http://localhost:8001/docs
   - Swagger UI (Event): http://localhost:8002/docs
   - Swagger UI (Registration): http://localhost:8003/docs
   - PostgreSQL: `localhost:5432` (user: `campus_user`, pass: `campus_pass`, db: `campus_event_hub`)
   - Kafka UI: http://localhost:8088
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3000 (default login: `admin` / `admin`)

4. **Stop all services:**
   ```bash
   docker compose down
   ```
   To also remove volumes:
   ```bash
   docker compose down -v
   ```

### Kubernetes Deployment

1. **Create secrets** from the template files:
   ```bash
   # Copy and fill in actual values
   cp k8s/user-service/secret.template.yaml k8s/user-service/secret.yaml
   cp k8s/event-service/secret.template.yaml k8s/event-service/secret.yaml
   cp k8s/registration-service/secret.template.yaml k8s/registration-service/secret.yaml
   # Edit each secret.yaml with base64-encoded values
   ```

2. **Apply manifests in order:**
   ```bash
   # Infrastructure
   kubectl apply -f k8s/postgres/
   kubectl apply -f k8s/kafka/
   kubectl apply -f k8s/monitoring/

   # RBAC
   kubectl apply -f k8s/rbac/

   # Services
   kubectl apply -f k8s/user-service/configmap.yaml
   kubectl apply -f k8s/user-service/secret.yaml
   kubectl apply -f k8s/user-service/deployment.yaml
   kubectl apply -f k8s/user-service/service.yaml
   kubectl apply -f k8s/user-service/hpa.yaml

   kubectl apply -f k8s/event-service/
   kubectl apply -f k8s/registration-service/
   kubectl apply -f k8s/notification-service/

   # Ingress
   kubectl apply -f k8s/ingress/ingress.yaml
   ```

3. **Verify pods are running:**
   ```bash
   kubectl get pods
   kubectl get svc
   ```

### Helm Deployment

The `helm/user-service` chart provides a templated deployment for the user service with configurable replicas, HPA, ingress, and secrets.

1. **Create a secrets override file:**
   ```bash
   cp helm/user-service/secrets-values.yaml helm/user-service/my-secrets.yaml
   # Edit my-secrets.yaml with actual DB password and JWT secret
   ```

2. **Install the chart:**
   ```bash
   helm install user-service ./helm/user-service \
     -f helm/user-service/my-secrets.yaml
   ```

3. **Upgrade after changes:**
   ```bash
   helm upgrade user-service ./helm/user-service \
     -f helm/user-service/my-secrets.yaml
   ```

4. **Uninstall:**
   ```bash
   helm uninstall user-service
   ```

---

## Environment Configuration

Each service directory has a `.env.example` template. Copy it to `.env` and fill in your actual values:

```bash
cp user-service/.env.example user-service/.env
cp event-service/.env.example event-service/.env
cp registration-service/.env.example registration-service/.env
cp notification-service/.env.example notification-service/.env
```

Then edit each `.env` file with your real credentials. See the `.env.example` files for all required variables and comments.

> **Note:** `.env` files are **gitignored** — your secrets stay local. The `.env.example` files are safe to commit (placeholder values only).
>
> When running with Docker Compose, use `kafka:29092` as the Kafka broker. When running locally, use `localhost:9092`.

---

## Networking & Ports

| Service / Tool | Host Port | Container Port | Description |
|---|---|---|---|
| **NGINX** | `8000` | `80` | API Gateway & entry point for HTTP routing |
| **User Service** | `8001` | `8000` | Account/Auth endpoints |
| **Event Service** | `8002` | `8000` | Event catalog management |
| **Registration Service** | `8003` | `8000` | Event booking management |
| **Notification Service** | `8004` | `8000` | Kafka consumer for notifications |
| **PostgreSQL** | `5432` | `5432` | Database (persistent volume) |
| **Kafka** | `9092` | `9092` | Message broker (external listener) |
| **Kafka (Internal)** | — | `29092` | Inter-container broker communication |
| **Kafka UI** | `8088` | `8080` | Kafka cluster management UI |
| **Prometheus** | `9090` | `9090` | Metrics collection & storage |
| **Grafana** | `3000` | `3000` | Monitoring dashboards |

> See [`compose.yml`](compose.yml) for full port mapping details.

---

## NGINX Gateway Routing Rules

The API Gateway (port `8000`) exposes these endpoints and proxies them to internal services:

| Route Path | Method | Internal Target | Description | JWT Auth Required? |
|---|---|---|---|---|
| `/` | `GET` | NGINX Static Files | Serves the single-page frontend | No |
| `/health` | `GET` | NGINX Gateway | Gateway health check | No |
| `/auth/*` | `POST` | User Service | Login and registration | No |
| `/api/user` | `GET` | User Service | Get logged-in user profile | No |
| `/api/events` | `GET` | Event Service | Get all events | **Yes** |
| `/api/events/create` | `POST` | Event Service | Create a new event | **Yes** |
| `/registration` | `POST` | Registration Service | Register for an event | **Yes** |
| `/check_registration/*` | `GET` | Registration Service | Check registration status | No |
| `/delete_registration/*` | `DELETE` | Registration Service | Cancel a registration | No |

**Auth flow:** For protected routes, NGINX makes an internal subrequest to `User Service → GET /auth/verify`. If the JWT is valid, the original request is proxied through. If invalid, NGINX returns `401 Unauthorized`.

---

## Kafka Topics

| Topic | Producer | Consumer | Trigger |
|---|---|---|---|
| `registration-created` | Registration Service | Notification Service | Published when a student books a seat |

---

## Monitoring & Custom Metrics

Services expose a `/metrics` endpoint scraped by Prometheus. Grafana dashboards are pre-provisioned via `infrastructure/grafana/`.

| Metric | Type | Description |
|---|---|---|
| `events_created` | Counter | Total number of events created |
| `total_registration` | Counter | Total number of successful registrations |
| `events_available_seats` | Gauge | Remaining seats per event (labels: `event_id`, `event_title`) |

**Access:**
- Prometheus UI: http://localhost:9090
- Grafana: http://localhost:3000 (default: `admin` / `admin`)

---

## CI/CD Pipeline

The project uses **GitHub Actions** (`.github/workflows/ci.yml`) with two jobs:

### `build` (runs on every push/PR to `Main` or `master`)
1. **Checkout** code
2. **Set up Python 3.10**
3. **Lint** with Ruff (`ruff format --check`)
4. **Install** all service dependencies
5. **Run tests** with pytest (uses SQLite for CI, not PostgreSQL)
6. **Build Docker images** for all 4 services

### `deploy` (runs only on push to `Main` or `master`, after `build` passes)
1. **Login** to Docker Hub
2. **Build & push** all service images to Docker Hub
3. **SSH deploy** to cloud VM — pulls new images and restarts with `docker compose`

### Required GitHub Secrets
| Secret | Purpose |
|---|---|
| `CI_SECRET_KEY` | JWT secret key for CI test runs |
| `DOCKERHUB_USERNAME` | Docker Hub login username |
| `DOCKERHUB_PASSWORD` | Docker Hub login password |
| `DOCKER_USERNAME` | Docker Hub image namespace |
| `VM_IP_ADDRESS` | Cloud VM public IP for SSH deploy |
| `VM_SSH_USER` | SSH username on the VM |
| `VM_SSH_PRIVATE_KEY` | SSH private key for VM access |

---

## Canary (Blue/Green) Deployment

The project includes Kubernetes manifests for **canary traffic-splitting** on the `user-service`, using NGINX Ingress Controller annotations.

### Traffic Routing Architecture
```text
              [ External Traffic ]
                       │
                       ▼
             [ NGINX Ingress Controller ]
                       │
         ┌─────────────┴─────────────┐
         │ (90% Traffic)             │ (10% Traffic)
         ▼                           ▼
[ user-service-blue ]       [ user-service-green ]
 (user-service:v1)           (user-service:v2)
```

### Manifests
- `k8s/user-service/user-service-blue/` — Blue deployment (v1) + Service
- `k8s/user-service/user-service-green/` — Green deployment (v2) + Service
- `k8s/ingress/ingress-blue.yaml` — Primary ingress rule
- `k8s/ingress/ingress-canary.yaml` — Canary weight annotation

### Workflow
1. **Deploy both versions:**
   ```bash
   kubectl apply -f k8s/user-service/user-service-blue/
   kubectl apply -f k8s/user-service/user-service-green/
   ```

2. **Apply canary routing (90% Blue / 10% Green):**
   ```bash
   kubectl apply -f k8s/ingress/ingress-blue.yaml
   kubectl apply -f k8s/ingress/ingress-canary.yaml
   ```

3. **Adjust traffic split** — edit `nginx.ingress.kubernetes.io/canary-weight` in `ingress-canary.yaml`:
   ```yaml
   # Gradually increase: "10" → "25" → "50" → "75" → "100"
   nginx.ingress.kubernetes.io/canary-weight: "25"
   ```

4. **Promote Green** — update `ingress-blue.yaml` backend to point to `user-service-green`, then delete the canary ingress.

5. **Rollback:**
   ```bash
   kubectl delete -f k8s/ingress/ingress-canary.yaml
   ```

---

## Documentation

Detailed design documents:
- [API Endpoints Reference Guide](docs/api-docs.md) — full REST API documentation with request/response examples
- [System Architecture Flow Diagram](docs/architecture.md) — high-level registration & event flows
- [Service Request & Messaging Flow](docs/service-flow.md) — step-by-step inter-service communication flows

---

*Built as a learning project demonstrating microservices architecture, event-driven design, container orchestration, CI/CD, and observability.*
