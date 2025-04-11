# Competitions API

This section covers the competition management and participation-related API endpoints in EDURange Cloud.

## Competition Management

### GET `/api/competitions`
Returns a list of all competitions. Requires authentication.

**Response**
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "startDate": "date",
    "endDate": "date",
    "challenges": [...],
    "_count": {
      "members": number,
      "challenges": number
    }
  }
]
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `500 Internal Server Error`: Server error

### 🔒 POST `/api/competitions`
Creates a new competition.

**Input Validation**: Validates competition name (min 3 chars), description (min 10 chars), dates (valid ISO format), and challenge IDs (valid UUIDs).

**Rate Limit**: 20 requests per minute

**Request Body**
```json
{
  "name": "string",
  "description": "string",
  "startDate": "date",
  "endDate": "date",
  "accessCodeFormat": "random" | "custom",
  "codeExpiration": "never" | "24h" | "7d" | "custom",
  "challenges": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "points": number,
      "customPoints": number
    }
  ]
}
```

**Response**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "startDate": "date",
  "endDate": "date",
  ...
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body or validation error
- `401 Unauthorized`: No valid session
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### POST `/api/competitions/join`
Joins a competition using an access code.

**Input Validation**: Validates access code (string, min 6 chars).

**Rate Limit**: 10 requests per minute

**Request Body**
```json
{
  "code": "string"
}
```

**Response**
```json
{
  "message": "Successfully joined competition",
  "competition": {
    "id": "string",
    "name": "string",
    ...
  }
}
```

**Error Responses**
- `400 Bad Request`: Invalid or expired access code, or validation error
- `401 Unauthorized`: No valid session
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Competition Groups

### GET `/api/competition-groups/[id]`
Returns detailed information about a specific competition group.

**Parameters**
- `id`: Competition group ID (string)

**Response**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "startDate": "date",
  "endDate": "date",
  "challenges": [...],
  "totalPoints": number,
  "userPoints": number
}
```

**Error Responses**
- `400 Bad Request`: Invalid group ID
- `401 Unauthorized`: No valid session
- `404 Not Found`: Competition group not found
- `500 Internal Server Error`: Server error

### 🔒 POST `/api/competition-groups`
Creates a new competition group.

**Input Validation**: Validates group name (min 3 chars), description (min 10 chars), dates (valid ISO format), and IDs (valid UUIDs).

**Rate Limit**: 20 requests per minute

**Request Body**
```json
{
  "name": "string",
  "description": "string",
  "startDate": "string",
  "endDate": "string",
  "challengeIds": ["string"],
  "instructorIds": ["string"],
  "generateAccessCode": boolean
}
```

**Response**
```json
{
  "success": true,
  "groupId": "string",
  "accessCode": "string" // Only if generateAccessCode is true
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body or validation error
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### GET `/api/competition-groups/[id]/challenges`
Get all challenges for a specific competition group.

**Parameters:**
- `id` (string) - The ID of the competition group

**Response:**
```json
[
  {
    "id": "string",
    "name": "string",
    "difficulty": "string",
    "AppsConfig": "string",
    "challengeType": {
      "id": "string",
      "name": "string"
    }
  }
]
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `404 Not Found`: Competition group not found
- `500 Internal Server Error`: Server error

### 🔒 PATCH `/api/competition-groups/[id]`
Updates a competition group.

**Rate Limit**: 20 requests per minute

**Parameters**
- `id`: Competition group ID (string)

**Request Body**
```json
{
  "name": "string",
  "description": "string",
  "startDate": "date",
  "endDate": "date"
}
```

**Response**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "startDate": "date",
  "endDate": "date",
  ...
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Competition group not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 DELETE `/api/competition-groups/[id]`
Deletes a competition group.

**Rate Limit**: 20 requests per minute

**Parameters**
- `id`: Competition group ID (string)

**Response**
```json
{
  "success": true,
  "message": "Competition group deleted successfully"
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Competition group not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Access Codes

### 🔒 POST `/api/competition-groups/[id]/access-code`
Generates a new access code for a competition group.

**Rate Limit**: 10 requests per minute

**Parameters**
- `id`: Competition group ID (string)

**Request Body**
```json
{
  "expiresIn": "never" | "24h" | "7d" | "custom",
  "customExpiration": "date" // Required if expiresIn is "custom"
}
```

**Response**
```json
{
  "success": true,
  "accessCode": "string",
  "expiresAt": "date" | null
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Competition group not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 DELETE `/api/competition-groups/[id]/access-code/[code]`
Deletes an access code for a competition group.

**Rate Limit**: 10 requests per minute

**Parameters**
- `id`: Competition group ID (string)
- `code`: Access code (string)

**Response**
```json
{
  "success": true,
  "message": "Access code deleted successfully"
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Competition group or access code not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### POST `/api/cron/expire-access-codes`
Expires access codes that have reached their expiration date. This endpoint is intended to be called by a cron job.

**Request Body**
```json
{
  "secret": "string" // API secret for authentication
}
```

**Response**
```json
{
  "success": true,
  "expiredCodes": number
}
```

**Error Responses**
- `401 Unauthorized`: Invalid secret
- `500 Internal Server Error`: Server error

## User Management in Competitions

### 🔒 DELETE `/api/competition-groups/[id]/users/[userId]`
Removes a user from a competition group.

**Rate Limit**: 20 requests per minute

**Parameters**
- `id`: Competition group ID (string)
- `userId`: User ID (string)

**Response**
```json
{
  "success": true,
  "message": "User removed from competition group successfully"
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Competition group or user not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 POST `/api/competition-groups/[id]/users/[userId]/reset`
Resets a user's progress in a competition group.

**Rate Limit**: 10 requests per minute

**Parameters**
- `id`: Competition group ID (string)
- `userId`: User ID (string)

**Response**
```json
{
  "success": true,
  "message": "User progress reset successfully"
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Competition group or user not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Points Management

### GET `/api/competitions/[groupId]/points`
Returns points for all users in a competition group.

**Parameters**
- `groupId`: Competition group ID (string)
- `userId` (optional query param): Filter points for specific user

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "points": number,
      "userId": "string",
      "groupId": "string",
      "user": {
        "id": "string",
        "name": "string",
        "email": "string"
      }
    }
  ]
}
```

**Error Responses**
- `400 Bad Request`: Invalid groupId or userId parameter
- `401 Unauthorized`: No valid session
- `404 Not Found`: Competition group not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 POST `/api/competitions/[groupId]/points`
Updates points for a user in a competition group. Requires instructor privileges.

**Input Validation**: Validates groupId (valid UUID), userId (valid UUID), and points (non-negative integer).

**Rate Limit**: 20 requests per minute

**Parameters**
- `groupId`: Competition group ID (string, must be a valid UUID)

**Request Body**
```json
{
  "userId": "string", // Must be a valid UUID
  "points": number    // Must be a non-negative integer
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "points": number,
    "userId": "string",
    "groupId": "string"
  }
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body, validation error, or invalid groupId
- `401 Unauthorized`: No valid session
- `403 Forbidden`: User is not an instructor for the competition group
- `404 Not Found`: Competition group not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error 