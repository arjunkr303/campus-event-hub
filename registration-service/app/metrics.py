from prometheus_client import Counter

REGISTRATION_COUNTER = Counter(
    "total_registration", "Total number of successful event registrations"
)
