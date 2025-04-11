# Authentication API

This section covers the authentication-related API endpoints in EDURange Cloud.

## Authentication Endpoints

### 🔒 POST `/api/auth/signin`
Authenticates a user and creates a session.

**Rate Limit**: 10 requests per minute

**Error Responses**
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 🔒 POST `/api/auth/signout`
Ends the current user session.

**Rate Limit**: 10 requests per minute

**Error Responses**
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Session Management

EDURange Cloud uses NextAuth.js for session management. Sessions are stored in the database and associated with a secure cookie. The session contains the user's ID and role, which are used for authorization checks throughout the application.

### Session Expiration

By default, sessions expire after 30 days of inactivity. This can be configured in the NextAuth.js configuration file.

### Session Security

Sessions are secured with the following measures:
- HTTP-only cookies to prevent JavaScript access
- Secure flag to ensure cookies are only sent over HTTPS
- SameSite=Lax to prevent CSRF attacks
- Database-backed sessions for better security and control 