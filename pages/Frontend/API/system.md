# System Health API

This section covers the system health and monitoring API endpoints in EDURange Cloud.

## Health Checks

### GET `/api/health`
Returns the current health status of the API server. This endpoint is publicly accessible and does not require authentication.

**Response**
```json
{
  "status": "healthy",
  "uptime": "10d 4h 30m",
  "timestamp": "2023-05-15T12:34:56Z"
}
```

**Error Responses**
- `500 Internal Server Error`: Server error

### 🔒 GET `/api/health/detailed`
Returns detailed health information about all system components. Requires authentication.

**Rate Limit**: 10 requests per minute

**Response**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "components": {
    "api": {
      "status": "healthy" | "degraded" | "unhealthy",
      "uptime": "string",
      "version": "string"
    },
    "database": {
      "status": "healthy" | "degraded" | "unhealthy",
      "connectionPool": {
        "total": number,
        "idle": number,
        "used": number
      },
      "latency": number
    },
    "kubernetes": {
      "status": "healthy" | "degraded" | "unhealthy",
      "nodes": [
        {
          "name": "string",
          "status": "ready" | "not_ready",
          "cpu": {
            "capacity": string,
            "allocatable": string,
            "used": string
          },
          "memory": {
            "capacity": string,
            "allocatable": string,
            "used": string
          }
        }
      ],
      "pods": {
        "total": number,
        "running": number,
        "pending": number,
        "failed": number
      }
    },
    "storage": {
      "status": "healthy" | "degraded" | "unhealthy",
      "usedSpace": string,
      "totalSpace": string,
      "percentUsed": number
    },
    "cache": {
      "status": "healthy" | "degraded" | "unhealthy",
      "hitRate": number,
      "size": string
    }
  },
  "timestamp": "date"
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Metrics

### 🔒 GET `/api/metrics`
Returns system metrics for monitoring and performance analysis. Requires admin privileges.

**Rate Limit**: 10 requests per minute

**Query Parameters**
- `period` (optional): Time period for metrics ('hour', 'day', 'week')
- `resolution` (optional): Data point resolution ('minute', 'hour', 'day')

**Response**
```json
{
  "cpu": {
    "current": number,
    "average": number,
    "peak": number,
    "history": [
      {
        "timestamp": "date",
        "value": number
      }
    ]
  },
  "memory": {
    "current": number,
    "average": number,
    "peak": number,
    "history": [
      {
        "timestamp": "date",
        "value": number
      }
    ]
  },
  "requests": {
    "total": number,
    "successful": number,
    "failed": number,
    "averageResponseTime": number,
    "history": [
      {
        "timestamp": "date",
        "count": number,
        "responseTime": number
      }
    ]
  },
  "activeUsers": {
    "current": number,
    "peak": number,
    "history": [
      {
        "timestamp": "date",
        "value": number
      }
    ]
  },
  "activeChallenges": {
    "current": number,
    "peak": number,
    "history": [
      {
        "timestamp": "date",
        "value": number
      }
    ]
  }
}
```

**Error Responses**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Notifications

### 🔒 GET `/api/notifications`
Returns system notifications for the current user.

**Rate Limit**: 20 requests per minute

**Query Parameters**
- `unreadOnly` (optional): Filter to only unread notifications (boolean)
- `limit` (optional): Number of notifications to return (default: 10)
- `page` (optional): Page number for pagination (default: 1)

**Response**
```json
{
  "notifications": [
    {
      "id": "string",
      "type": "system" | "challenge" | "competition" | "user",
      "title": "string",
      "message": "string",
      "read": boolean,
      "createdAt": "date",
      "link": "string" // Optional URL to navigate to
    }
  ],
  "unreadCount": number,
  "totalCount": number,
  "totalPages": number,
  "currentPage": number
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 PATCH `/api/notifications/[id]/read`
Marks a notification as read.

**Rate Limit**: 30 requests per minute

**Parameters**
- `id`: Notification ID (string)

**Response**
```json
{
  "success": true,
  "notification": {
    "id": "string",
    "read": true,
    "updatedAt": "date"
  }
}
```

**Error Responses**
- `400 Bad Request`: Invalid notification ID
- `401 Unauthorized`: No valid session
- `404 Not Found`: Notification not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 POST `/api/notifications/read-all`
Marks all notifications as read for the current user.

**Rate Limit**: 10 requests per minute

**Response**
```json
{
  "success": true,
  "count": number,
  "updatedAt": "date"
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Activity Logs

### 🔒 GET `/api/activity-logs`
Returns activity logs for the current user or all users (admin only).

**Rate Limit**: 10 requests per minute

**Query Parameters**
- `userId` (optional): Filter logs by user ID (admin only)
- `action` (optional): Filter logs by action type
- `limit` (optional): Number of logs to return (default: 20)
- `page` (optional): Page number for pagination (default: 1)
- `startDate` (optional): Start date for logs (ISO format)
- `endDate` (optional): End date for logs (ISO format)

**Response**
```json
{
  "logs": [
    {
      "id": "string",
      "userId": "string",
      "userName": "string",
      "action": "login" | "logout" | "create" | "update" | "delete" | "start_challenge" | "complete_challenge" | "join_competition",
      "resourceType": "user" | "challenge" | "competition" | "system",
      "resourceId": "string",
      "details": {
        // Action-specific details
      },
      "ipAddress": "string",
      "userAgent": "string",
      "timestamp": "date"
    }
  ],
  "totalCount": number,
  "totalPages": number,
  "currentPage": number
}
```

**Error Responses**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions (when trying to access other users' logs)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error 