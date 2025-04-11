# Admin API

This section covers the administrative operations API endpoints in EDURange Cloud, which are restricted to users with admin privileges.

## User Management

### 🔒 GET `/api/admin/users`
Returns a list of all users in the system.

**Rate Limit**: 20 requests per minute

**Query Parameters**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of users per page (default: 10)
- `search` (optional): Search term to filter users by name or email
- `role` (optional): Filter users by role ('ADMIN', 'INSTRUCTOR', 'STUDENT')

**Response**
```json
{
  "users": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "ADMIN" | "INSTRUCTOR" | "STUDENT",
      "createdAt": "date"
    }
  ],
  "totalCount": number,
  "totalPages": number,
  "currentPage": number
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 POST `/api/admin/users`
Creates a new user account.

**Input Validation**: Validates email (format), name (min 2 chars), password (min 8 chars, complexity), and role (enum).

**Rate Limit**: 10 requests per minute

**Request Body**
```json
{
  "email": "string",
  "name": "string",
  "password": "string",
  "role": "ADMIN" | "INSTRUCTOR" | "STUDENT"
}
```

**Response**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "ADMIN" | "INSTRUCTOR" | "STUDENT",
  "createdAt": "date"
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body or validation error
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Email already in use
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## System Management

### 🔒 GET `/api/admin/system/status`
Returns the current system status, including server health, database connection, and Kubernetes cluster status.

**Rate Limit**: 10 requests per minute

**Response**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "components": {
    "database": {
      "status": "connected" | "disconnected",
      "latency": number
    },
    "kubernetes": {
      "status": "connected" | "disconnected",
      "nodeCount": number,
      "availableResources": {
        "cpu": string,
        "memory": string
      }
    },
    "storage": {
      "status": "healthy" | "degraded" | "unhealthy",
      "usedSpace": string,
      "totalSpace": string
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

### 🔒 POST `/api/admin/system/maintenance`
Enables or disables maintenance mode for the system.

**Rate Limit**: 5 requests per minute

**Request Body**
```json
{
  "enabled": boolean,
  "message": "string"
}
```

**Response**
```json
{
  "maintenanceMode": boolean,
  "message": "string",
  "startedAt": "date"
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Challenge Installation

### 🔒 POST `/api/admin/challenge-installer`
Installs a new challenge from a Git repository or ZIP file.

**Input Validation**: Validates repository URL (format), branch name (alphanumeric), and installation type (enum).

**Rate Limit**: 5 requests per minute

**Request Body**
```json
{
  "repositoryUrl": "string",
  "branch": "string",
  "installationType": "git" | "zip",
  "zipFile": "base64 encoded string" // Only for ZIP installation
}
```

**Response**
```json
{
  "success": true,
  "challengeId": "string",
  "message": "Challenge installed successfully"
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body or validation error
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `422 Unprocessable Entity`: Invalid challenge format or missing required files
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 GET `/api/admin/challenge-installer/status/[jobId]`
Checks the status of a challenge installation job.

**Rate Limit**: 20 requests per minute

**Parameters**
- `jobId`: Installation job ID (string)

**Response**
```json
{
  "status": "pending" | "in_progress" | "completed" | "failed",
  "progress": number, // 0-100
  "message": "string",
  "challengeId": "string" // Only if completed
}
```

**Error Responses**
- `400 Bad Request`: Invalid job ID
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Job not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Analytics

### 🔒 GET `/api/admin/analytics/users`
Returns user analytics data, including registration trends and user activity.

**Rate Limit**: 10 requests per minute

**Query Parameters**
- `period`: Time period for analytics ('day', 'week', 'month', 'year')
- `startDate` (optional): Start date for custom period (ISO format)
- `endDate` (optional): End date for custom period (ISO format)

**Response**
```json
{
  "totalUsers": number,
  "newUsers": number,
  "activeUsers": number,
  "usersByRole": {
    "ADMIN": number,
    "INSTRUCTOR": number,
    "STUDENT": number
  },
  "registrationTrend": [
    {
      "date": "string",
      "count": number
    }
  ],
  "activityTrend": [
    {
      "date": "string",
      "activeUsers": number
    }
  ]
}
```

**Error Responses**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 GET `/api/admin/analytics/challenges`
Returns challenge analytics data, including usage statistics and completion rates.

**Rate Limit**: 10 requests per minute

**Query Parameters**
- `period`: Time period for analytics ('day', 'week', 'month', 'year')
- `startDate` (optional): Start date for custom period (ISO format)
- `endDate` (optional): End date for custom period (ISO format)

**Response**
```json
{
  "totalChallenges": number,
  "totalInstances": number,
  "activeInstances": number,
  "popularChallenges": [
    {
      "id": "string",
      "name": "string",
      "instances": number,
      "completionRate": number
    }
  ],
  "instancesTrend": [
    {
      "date": "string",
      "count": number
    }
  ],
  "completionRates": [
    {
      "challengeId": "string",
      "challengeName": "string",
      "completionRate": number
    }
  ]
}
```

**Error Responses**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## System Logs

### 🔒 GET `/api/admin/logs`
Returns system logs for debugging and monitoring.

**Rate Limit**: 10 requests per minute

**Query Parameters**
- `level` (optional): Log level filter ('error', 'warn', 'info', 'debug')
- `component` (optional): Component filter ('api', 'database', 'kubernetes', 'auth')
- `limit` (optional): Number of logs to return (default: 100)
- `page` (optional): Page number for pagination (default: 1)
- `startDate` (optional): Start date for logs (ISO format)
- `endDate` (optional): End date for logs (ISO format)

**Response**
```json
{
  "logs": [
    {
      "timestamp": "date",
      "level": "error" | "warn" | "info" | "debug",
      "component": "string",
      "message": "string",
      "metadata": {
        // Additional context-specific information
      }
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
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error 