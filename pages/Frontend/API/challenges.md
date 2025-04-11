# Challenges API

This section covers the challenge management and interaction-related API endpoints in EDURange Cloud.

## Challenge Management

### GET `/api/challenges`
Returns a list of all challenges. Requires authentication.

**Response**
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "difficulty": "string",
    "challengeType": {
      "id": "string",
      "name": "string"
    },
    "questions": [...]
  }
]
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `500 Internal Server Error`: Server error

### POST `/api/challenges`
Creates a new challenge. Requires admin privileges.

**Input Validation**: Validates challenge name (min 3 chars), description (min 10 chars), difficulty (enum), and questions (content min 10 chars).

**Request Body**
```json
{
  "name": "string",
  "description": "string",
  "difficulty": "easy" | "medium" | "hard",
  "challengeTypeId": "string",
  "challengeImage": "string",
  "questions": [
    {
      "content": "string",
      "type": "text" | "multiple_choice" | "code",
      "points": number,
      "answer": "string",
      "options": ["string"]
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
  "difficulty": "string",
  "challengeTypeId": "string",
  "questions": [...]
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

### 🔒 GET `/api/challenges/[id]`
Returns detailed information about a specific challenge.

**Rate Limit**: 30 requests per minute

**Parameters**
- `id`: Challenge ID (string)

**Response**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "difficulty": "string",
  "challengeType": {
    "id": "string",
    "name": "string"
  },
  "questions": [...]
}
```

**Error Responses**
- `400 Bad Request`: Invalid challenge ID
- `401 Unauthorized`: No valid session
- `404 Not Found`: Challenge not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### GET `/api/competition-groups/[id]/challenges/[challengeId]`
Get a specific challenge configuration for a competition group.

**Parameters:**
- `id` (string) - The ID of the competition group
- `challengeId` (string) - The ID of the challenge

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "challengeImage": "string",
  "difficulty": "EASY" | "MEDIUM" | "HARD" | "VERY_HARD",
  "totalPoints": number,
  "earnedPoints": number,
  "completed": boolean,
  "AppsConfig": [
    // Same format as /api/challenges response
  ]
}
```

**Error Responses**
- `400 Bad Request`: Invalid group ID or challenge ID
- `401 Unauthorized`: No valid session
- `404 Not Found`: Competition group or challenge not found
- `500 Internal Server Error`: Server error

### 🔒 DELETE `/api/admin/challenges/[id]`
Deletes a challenge. Requires admin privileges.

**Rate Limit**: 10 requests per minute

**Parameters**
- `id`: Challenge ID (string)

**Response**
```json
{
  "success": true,
  "message": "Challenge deleted successfully"
}
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Challenge not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Challenge Types

### 🔒 GET `/api/challenge-types`
Returns all available challenge types.

**Rate Limit**: 30 requests per minute

**Response**
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string"
  }
]
```

**Error Responses**
- `401 Unauthorized`: No valid session
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Challenge Instances

### 🔒 POST `/api/challenges/start`
Starts a challenge instance for a user.

**Rate Limit**: 10 requests per minute

**Request Body**
```json
{
  "challengeId": "string",
  "groupId": "string"
}
```

**Response**
```json
{
  "success": true,
  "instanceId": "string",
  "status": "starting",
  "message": "Challenge instance is starting"
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: No valid session
- `404 Not Found`: Challenge or group not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 POST `/api/challenges/terminate`
Terminates a running challenge instance.

**Rate Limit**: 10 requests per minute

**Request Body**
```json
{
  "instanceId": "string"
}
```

**Response**
```json
{
  "success": true,
  "message": "Challenge instance terminated successfully"
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: No valid session
- `404 Not Found`: Challenge instance not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 POST `/api/challenges/instance`
Creates a new challenge instance.

**Rate Limit**: 10 requests per minute

**Request Body**
```json
{
  "challengeId": "string",
  "userId": "string",
  "groupId": "string"
}
```

**Response**
```json
{
  "id": "string",
  "status": "starting",
  "challengeId": "string",
  "userId": "string",
  "groupId": "string",
  "createdAt": "date"
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: No valid session
- `404 Not Found`: Challenge, user, or group not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Challenge Questions

### 🔒 POST `/api/competition-groups/[id]/challenges/[challengeId]/questions/[questionId]/complete`
Submits an answer to a challenge question.

**Input Validation**: Validates answer (string, trimmed) and all ID parameters (valid UUIDs).

**Rate Limit**: 15 requests per minute

**Parameters**
- `id`: Competition group ID (string)
- `challengeId`: Challenge ID (string)
- `questionId`: Question ID (string)

**Request Body**
```json
{
  "answer": "string"
}
```

**Response**
```json
{
  "success": true,
  "completion": {
    "id": "string",
    "questionId": "string",
    "userId": "string",
    "groupChallengeId": "string",
    "pointsEarned": number,
    "completedAt": "date"
  },
  "challengeCompleted": boolean
}
```

**Error Responses**
- `400 Bad Request`: Invalid request body, validation error, or incorrect answer
- `401 Unauthorized`: No valid session
- `404 Not Found`: Challenge or question not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Additional Challenge Instance APIs

For additional Challenge Instance operations using the new proxy architecture, see the [Proxy Endpoints](./proxy.md) documentation, which includes:

- Getting challenge instances with extended information using `/api/database-proxy?path=challenge-instances`
- Managing challenge pods through the instance manager proxy

## WebOS Format

The WebOS format is a specialized configuration structure used by EDURange Cloud's WebOS interface. It transforms challenge data into a format that can be rendered as interactive applications in the browser-based operating system environment.

Key characteristics of the WebOS format:
- Each challenge is represented as a collection of app configurations (`AppsConfig`)
- Every challenge includes a special `challenge-prompt` app that displays questions and tracks progress
- Apps can be built-in (Terminal, Browser, etc.) or challenge-specific
- Configuration includes UI properties like window dimensions, icons, and startup behavior
- For security, flag question answers are never included in the WebOS format, while text question answers are included for client-side verification

For detailed information about the WebOS format and app configuration system, see `/docs/AppConfig.md`. 