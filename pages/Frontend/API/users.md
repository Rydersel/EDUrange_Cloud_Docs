# Users API

This section covers the user management and profile-related API endpoints in EDURange Cloud.

## Current User

### GET `/api/users/current`
Returns detailed information about the currently authenticated user.

**Response**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "accounts": [...],
  "sessions": [...],
  "challengeInstances": [...]
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

### GET `/api/users/current/role`
Returns the role of the currently authenticated user.

**Response**
```json
{
  "role": "STUDENT" | "INSTRUCTOR" | "ADMIN"
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

### GET `/api/users/current/competitions`
Returns all competitions associated with the current user, categorized by status.

**Response**
```json
{
  "active": [Competition[]],
  "upcoming": [Competition[]],
  "completed": [Competition[]],
  "userRole": "STUDENT" | "INSTRUCTOR" | "ADMIN"
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `500 Internal Server Error`: Server error

## User Management

### 🔒 GET `/api/users/[id]`
Returns information about a specific user. Requires admin privileges.

**Rate Limit**: 30 requests per minute

**Parameters**
- `id`: User ID (string)

**Response**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "accounts": [...],
  "sessions": [...],
  "challengeInstances": [...]
}
```

**Error Responses**
- `400 Bad Request`: Invalid user ID
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 PUT `/api/users/[id]`
Updates a user's information. Requires admin privileges.

**Rate Limit**: 30 requests per minute

**Parameters**
- `id`: User ID (string)

**Request Body**
```json
{
  "name": "string",
  "email": "string",
  "admin": boolean,
  "points": number
}
```

**Response**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  ...
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 DELETE `/api/users/[id]`
Deletes a user. Requires admin privileges.

**Rate Limit**: 30 requests per minute

**Parameters**
- `id`: User ID (string)

**Response**
```json
{
  "message": "User deleted successfully"
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 PATCH `/api/users/[id]/role`
Updates a user's role. Requires admin privileges.

**Input Validation**: Validates role value must be one of "ADMIN", "INSTRUCTOR", or "STUDENT".

**Rate Limit**: 15 requests per minute

**Parameters**
- `id`: User ID (string)

**Request Body**
```json
{
  "role": "ADMIN" | "INSTRUCTOR" | "STUDENT"
}
```

**Response**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "ADMIN" | "INSTRUCTOR" | "STUDENT"
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body or validation error
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## User Profile

### 🔒 GET `/api/profile/challenge-completions`
Returns challenge completions for a user, grouped by date. Requires authentication.

**Rate Limit**: 30 requests per minute

**Query Parameters**
- `userId`: User ID (string)
- `year` (optional): Year to filter completions (default: current year)

**Response**
```json
{
  "completions": [
    {
      "date": "YYYY-MM-DD",
      "count": number,
      "challenges": [
        {
          "name": "string",
          "competition": "string",
          "points": number
        }
      ]
    }
  ],
  "totalCompletions": number
}
```

**Error Responses**
- `400 Bad Request`: Missing userId parameter
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions to view another user's data
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Instructors

### 🔒 GET `/api/instructors`
Returns a list of all instructors. Requires admin privileges.

**Rate Limit**: 30 requests per minute

**Response**
```json
[
  {
    "id": "string",
    "name": "string",
    "email": "string"
  }
]
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 GET `/api/users`
Returns a list of all users. Requires admin privileges.

**Rate Limit**: 30 requests per minute

**Query Parameters**
- `role` (optional): Filter by role (ADMIN, INSTRUCTOR, STUDENT)
- `search` (optional): Search by name or email

**Response**
```json
[
  {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "ADMIN" | "INSTRUCTOR" | "STUDENT"
  }
]
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error 