# Architecture Flow

## Registration Flow

```
Student
↓
Registration or Login (User-Service)
↓
Event Registration (Registration-Service)
↓
Notification (Notification-Service)
```

## Event Registration & Seat Update Flow

```
Event Organizer
↓
Event Creation or Event Deletion or Seat Updation (Event-Service)
↓
Notification (Notification-Service)
↓
Monitoring (Grafana)
```
