# EDURange Cloud API Documentation

This documentation provides a comprehensive overview of the EDURange Cloud API endpoints.

## Overview

The EDURange Cloud API is organized into the following categories:

- [Authentication](./authentication.md) - User authentication and session management
- [Users](./users.md) - User management and profile operations
- [Competitions](./competitions.md) - Competition creation, management, and participation
- [Challenges](./challenges.md) - Challenge management and interaction
- [Proxy Endpoints](./proxy.md) - Internal service communication endpoints
- [Admin Operations](./admin.md) - Administrative functions and system management
- [System Health](./system.md) - System monitoring and health checks

## Common Features

### Authentication

All API routes require authentication unless explicitly stated. Authentication is handled through NextAuth.js sessions.

### Rate Limiting

EDURange Cloud implements rate limiting to protect the API from abuse and ensure fair usage. The rate limiting system:

- Tracks requests based on IP address by default
- Returns a 429 Too Many Requests status code when limits are exceeded
- Includes a Retry-After header indicating when to try again
- Uses different limits for different endpoint types based on sensitivity

#### Rate Limit Configuration

| Endpoint Type | Rate Limit |
|---------------|------------|
| Authentication | 10 requests per minute |
| User Management | 15-30 requests per minute |
| Challenge Submissions | 15 requests per minute |
| Competition Management | 20 requests per minute |
| Competition Join | 10 requests per minute |
| Admin Operations | 20 requests per minute |

Rate-limited endpoints are marked with 🔒 in this documentation.

### Input Validation

EDURange Cloud implements comprehensive input validation to ensure data integrity and prevent security vulnerabilities:

- All user inputs are validated using Zod schemas and sanitized using the `validateAndSanitize` function
- Input validation failures return a 400 Bad Request status code with detailed error messages
- String inputs are sanitized to prevent XSS attacks
- Common validation schemas are reused across endpoints for consistency
- Nested objects are validated at each level of the hierarchy
- Validation is performed before any database operations

The validation system provides the following benefits:

- **Security**: Prevents injection attacks and malicious inputs
- **Data Integrity**: Ensures data meets expected formats and constraints
- **Error Handling**: Provides clear error messages for invalid inputs
- **Consistency**: Applies the same validation rules across all endpoints

#### Common Validation Rules

| Data Type | Validation Rules |
|-----------|------------------|
| Email | Must be a valid email format |
| Password | Minimum 8 characters |
| Name | Minimum 2 characters |
| Challenge Name | Minimum 3 characters |
| Challenge Description | Minimum 10 characters |
| Competition Name | Minimum 3 characters |
| Competition Description | Minimum 10 characters |
| URL | Must be a valid URL format |
| ID | Must be a valid UUID format |

#### Validation Implementation

All API endpoints use a standardized validation approach:

```typescript
// Import the validation utilities
import { validateAndSanitize, validationSchemas } from '@/lib/validation';

// Define a schema using Zod
const mySchema = z.object({
  name: validationSchemas.name,
  email: validationSchemas.email,
  // Other fields...
});

// In your API route handler:
const validationResult = validateAndSanitize(mySchema, requestData);

if (!validationResult.success) {
  return NextResponse.json({ 
    success: false, 
    error: validationResult.error 
  }, { status: 400 });
}

// Use the validated and sanitized data
const { name, email } = validationResult.data;
```

Endpoints with input validation will include a note about the validation being performed.

### Error Handling

All API endpoints follow a consistent error response format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error 
