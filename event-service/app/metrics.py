from prometheus_client import Counter, Gauge

EVENTS_CREATED_COUNTER = Counter("events_created", "Total number of events created.")

EVENT_AVAILABLE_SEATS_GAUGE = Gauge(
    "events_available_seats",
    "Number of available seats in an event",
    ["event_id", "event_title"],
)
