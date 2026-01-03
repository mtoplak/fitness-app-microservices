# Logging Service

Service for collecting and managing logs from all microservices via RabbitMQ.

## Endpoints

### POST /logs
Fetches all logs from RabbitMQ queue and saves them to the database.

**Response:**
```json
{
  "success": true,
  "message": "Logs fetched from RabbitMQ and saved to database",
  "totalLogsInDatabase": 150
}
```

### GET /logs/:dateFrom/:dateTo
Retrieves all logs between two dates.

**Parameters:**
- `dateFrom`: Start date (YYYY-MM-DD)
- `dateTo`: End date (YYYY-MM-DD)

**Example:** `GET /logs/2025-01-01/2025-01-31`

**Response:**
```json
{
  "success": true,
  "count": 45,
  "dateRange": {
    "from": "2025-01-01",
    "to": "2025-01-31"
  },
  "logs": [...]
}
```

### DELETE /logs
Deletes all logs from the database.

**Response:**
```json
{
  "success": true,
  "message": "All logs deleted from database",
  "deletedCount": 150
}
```

## Log Format

Each log entry contains:
- `timestamp`: Date and time of the log
- `logType`: INFO, ERROR, or WARN
- `url`: Request URL
- `correlationId`: Unique identifier for tracing across services
- `applicationName`: Name of the microservice
- `message`: Log message
- `additionalData`: Optional additional information
