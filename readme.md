# Campus Event Hub

Campus Event Hub is a centralized platform for managing and discovering events happening
across a college campus.

## Documentation
Detailed design documents can be found here:
* [System Architecture Flow Diagram](docs/architecture.md)
* [Service Request & Messaging Flow](docs/service-flow.md)
* [API Endpoints Reference Guide](docs/api-docs.md)

## Architecture Flow

#### Registration Flow

```
Student
↓
Registration or Login (User-Service)
↓
Event Registration (Registration-Service)
↓
Notification (Notification-Service)
```

#### Event Registration & Seat Update Flow

```
Event Organizer
↓
Event Creation or Event Deletion or Seat Updation (Event-Service)
↓
Notification (Notification-Service)
↓
Monitoring (Grafana)
```

## Services
- **User Service**: Handles account Registration, Login, and Profile management.
- **Event Service**: All event management including Create events, Get all events, Update events, Seat Updates, and Delete events.
- **Registration Service**: Focuses on booking operations: registering users for events, cancelling registrations, and checking duplicate registrations.
- **Notification Service**: Listens to Kafka event streams and handles sending notifications when registrations happen.
- **Infrastructure**: It focuses on all the infrastructure configurations required for this project. Like NGINX for API Gateway and Prometheus for Monitoring system.

## Folder Structure
```text
Campus Event Hub/
├── compose.yml
├── readme.md
├── docs/
│   ├── api-docs.md
│   ├── architecture.md
│   └── service-flow.md
├── frontend/
│   ├── index.html
│   ├── index.css
│   └── app.js
├── event-service/
│   ├── app/
│   │   ├── controllers/
│   │   ├── databases/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── services/
│   ├── main.py
│   └── dockerfile
├── registration-service/
│   ├── app/
│   │   ├── controllers/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── services/
│   ├── main.py
│   └── dockerfile
├── user-service/
│   ├── app/
│   │   ├── controllers/
│   │   ├── routers/
│   │   ├── services/
│   │   └── utils/
│   ├── main.py
│   └── dockerfile
├── notification-service/
│   ├── app/
│   │   ├── messaging/
│   │   └── service/
│   ├── main.py
│   └── dockerfile
├── infrastructure/
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── dockerfile
│   └── promethus/
│       └── prometheus.yml
└── k8s/
    ├── event-service/
    │   ├── configmap.yaml
    │   ├── deployment.yaml
    │   ├── secret.template.yaml
    │   └── service.yaml
    ├── ingress/
    │   ├── ingress.yaml
    │   ├── ingress-blue.yaml
    │   └── ingress-canary.yaml
    ├── kafka/
    │   ├── deployment.yaml
    │   └── service.yaml
    ├── monitoring/
    │   ├── grafana-config.yaml
    │   ├── grafana-dashboard-config.yaml
    │   ├── grafana-deployment.yaml
    │   ├── prometheus-config.yaml
    │   └── prometheus-deployment.yaml
    ├── notification-service/
    │   ├── configmap.yaml
    │   ├── deployment.yaml
    │   └── service.yaml
    ├── postgres/
    │   ├── deployment.yaml
    │   ├── pvc.yaml
    │   └── service.yaml
    ├── registration-service/
    │   ├── configmap.yaml
    │   ├── deployment.yaml
    │   ├── secret.template.yaml
    │   └── service.yaml
    └── user-service/
        ├── configmap.yaml
        ├── deployment.yaml
        ├── hpa.yaml
        ├── secret.template.yaml
        ├── service.yaml
        ├── user-service-blue/
        │   ├── deployment.yaml
        │   ├── hpa.yaml
        │   └── service.yaml
        └── user-service-green/
            ├── deployment.yaml
            ├── hpa.yaml
            └── service.yaml
```


## Tech Stack

### Backend
- FastAPI (API Framework)
- REST API (Architecture Style)
- PostgreSQL (Database)
- JWT (Authentication & Authorization)

## Tools

### Database
- Supabase

### Message Queue
- Kafka

### Monitoring
- Prometheus
- Grafana

### API Gateway
- NGINX

### API Testing
- Swagger UI

### Containerization
- Docker
- Docker Compose

## Starting and Stopping flow
* **To Start:** `docker compose up` or `docker-compose up -d`(Run in background)
* **To Stop:** `docker compose down`

## Environment Configuration
Each service directory requires a `.env` file. A template structure:
* **Database Connection**: `POSTGRESQL_URL=postgresql://<user>:<password>@<host>:<port>/<db>`
* **JWT Secret**: `SECRET_KEY=<your-secret-key>`
* **JWT Algorithm**: `ALGORITHM=HS256`
* **Kafka Server**: `KAFKA_BOOTSTRAP_SERVERS=kafka:29092`


## Networking Ports
| Service/Tool | Host Port | Container Port | Description 
|-----|------|------|------|
| NGINX | 8000 | 80 | API Gateway & Entry point for HTTP routing
| User Service | 8001 | 8000 | Account/Auth endpoints
| Event Service | 8002 | 8000 | Event catalog management
| Registration Service | 8003 | 8000 | Event details management
| Notification Service | 8004 | 8000 | Kafka integration for event notifications
| Kafka | 9092 | 9092 | Message Broker
| Kafka UI | 8080 | 8080 | Kafka UI
| Prometheus | 9090 | 9090 | Metrics monitoring
| Grafana | 3000 | 3000 | Data dashboard for monitoring

> For reference check **compose.yml** file.

## NGINX Gateway Routing Rules
The API Gateway (`port 8000`) exposes the following endpoints and proxies them to the internal services:

| Route Path | Method | Internal Target Service | Description | JWT Auth Required? |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | NGINX Static Files | Serves the single-page frontend application | No |
| `/health` | `GET` | NGINX Gateway | Gateway health check | No |
| `/api/events` | `GET` | Event Service | Get all events | **Yes** |
| `/api/user` | `GET` | User Service | Get logged-in user profile | No |
| `/auth/*` | `POST` | User Service | Login and registration | No |
| `/registration` | `POST` | Registration Service | Register for an event | **Yes** |
| `/check_registration/*` | `GET` | Registration Service | Check registration status | No |
| `/delete_registration/*` | `DELETE` | Registration Service | Delete a registration | No |

## Kafka Topics
* **`registration-created`**: Published by `registration-service` when a student books a seat; consumed by `notification-service`.


## Monitoring & Custom Metrics
We track the following custom Prometheus metrics:
* **`events_created`** (Counter): Total number of events created in the system.
* **`total_registration`** (Counter): Total number of successful event registrations.
* **`events_available_seats`** (Gauge): Number of remaining seats left, tracked by `event_id` and `event_title` labels.

---

## Canary Traffic-Splitting Deployment Reference

The system includes files under `k8s/` to implement a Canary Traffic-Splitting deployment model for `user-service`.

### Folder Layout & Manifests
* **`k8s/user-service/user-service-blue/`**: Dedicated files for the Blue deployment (v1) and matching internal `user-service` resolver.
* **`k8s/user-service/user-service-green/`**: Dedicated files for the Green deployment (v2).
* **`k8s/ingress/`**: Ingress rules including `ingress-blue.yaml` (primary) and `ingress-canary.yaml` (canary splitter).

### Basic Usage Workflow
1. **Deploy both Blue and Green pods**:
   ```bash
   kubectl apply -f k8s/user-service/user-service-blue/deployment.yaml
   kubectl apply -f k8s/user-service/user-service-green/deployment.yaml
   ```
2. **Apply Canary routing (10% to Green, 90% to Blue)**:
   ```bash
   kubectl apply -f k8s/user-service/user-service-blue/service.yaml
   kubectl apply -f k8s/user-service/user-service-green/service.yaml
   kubectl apply -f k8s/ingress/ingress-blue.yaml
   kubectl apply -f k8s/ingress/ingress-canary.yaml
   ```
3. **Increase Green traffic percentage**:
   Adjust `nginx.ingress.kubernetes.io/canary-weight` in `k8s/ingress/ingress-canary.yaml` (e.g. to `"25"`, `"50"`, `"75"`) and re-apply.
4. **Promotion**:
   Update `ingress-blue.yaml` backend to point to `user-service-green` and update `user-service-blue/service.yaml` main resolver to Green. Then delete `ingress-canary.yaml`.
5. **Rollback**:
   ```bash
   kubectl delete -f k8s/ingress/ingress-canary.yaml
   ```
