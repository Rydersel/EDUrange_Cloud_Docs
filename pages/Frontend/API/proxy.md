# Proxy Endpoints

This section covers the proxy endpoints that facilitate secure communication between the client and internal services.

## Overview

The proxy endpoints serve as intermediaries between the client-side application and the server-side services. They provide several benefits:

1. **Security**: Internal services are not directly exposed to client applications
2. **CORS Prevention**: Avoids cross-origin issues by routing requests through the Next.js backend
3. **Authentication**: Ensures all requests are properly authenticated
4. **Error Handling**: Provides consistent error responses
5. **Reliability**: Ensures consistent connectivity to internal services

## Database API Proxy

### 🔒 GET `/api/database-proxy`

Proxies GET requests to the database API service.

**Rate Limit**: 30 requests per minute

**Query Parameters**
- `path` (required): The path to forward to the database API service
- Additional parameters are forwarded to the database API service

**Special Paths**

Some paths are handled directly by the proxy instead of forwarding to the database API:

- `challenge-instances`: Retrieves challenge instances using Prisma ORM directly, which avoids dependency on the external database API service

**Response**
- The response from the database API is forwarded as-is
- For special paths like `challenge-instances`, a standardized response format is provided

**Challenge Instances Response Format**
```json
{
  "instances": [
    {
      "id": "string",
      "userId": "string",
      "userEmail": "string",
      "userName": "string",
      "challengeImage": "string",
      "challengeUrl": "string",
      "creationTime": "string",
      "status": "string",
      "flagSecretName": "string",
      "flag": "string",
      "groupId": "string",
      "groupName": "string",
      "challengeType": "string"
    }
  ]
}
```

**Error Responses**
- `400 Bad Request`: Missing required parameters
- `401 Unauthorized`: No valid session
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error or error communicating with the database API
- `502 Bad Gateway`: The database API returned a non-JSON response

### 🔒 POST `/api/database-proxy`

Proxies POST requests to the database API service.

**Rate Limit**: 20 requests per minute

**Query Parameters**
- `path` (required): The path to forward to the database API service

**Request Body**
- The request body is forwarded to the database API service

**Response**
- The response from the database API is forwarded as-is

**Error Responses**
- `400 Bad Request`: Missing required parameters
- `401 Unauthorized`: No valid session
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error or error communicating with the database API
- `502 Bad Gateway`: The database API returned a non-JSON response

## Instance Manager Proxy

### 🔒 GET `/api/instance-manager-proxy`

Proxies GET requests to the instance manager service.

**Rate Limit**: 30 requests per minute

**Query Parameters**
- `path` (required): The path to forward to the instance manager service
- Additional parameters are forwarded to the instance manager service

**Common Paths**
- `list-challenge-pods`: Lists all challenge pods
- `get-pod-status`: Gets the status of a specific pod (requires `pod_name` parameter)
- `get-secret`: Gets a Kubernetes secret (requires `secret_name` parameter)

**Response**
- The response from the instance manager is forwarded as-is

**Error Responses**
- `400 Bad Request`: Missing required parameters
- `401 Unauthorized`: No valid session
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error or error communicating with the instance manager

### 🔒 POST `/api/instance-manager-proxy`

Proxies POST requests to the instance manager service.

**Rate Limit**: 20 requests per minute

**Query Parameters**
- `path` (required): The path to forward to the instance manager service

**Common Paths**
- `start-challenge`: Starts a new challenge pod
- `end-challenge`: Terminates a challenge pod
- `add-challenge-image`: Adds a new challenge image

**Request Body**
- The request body is forwarded to the instance manager service

**Response**
- The response from the instance manager is forwarded as-is

**Error Responses**
- `400 Bad Request`: Missing required parameters
- `401 Unauthorized`: No valid session
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error or error communicating with the instance manager

## Monitoring Proxy

### 🔒 GET `/api/monitoring-proxy`

Proxies GET requests to the monitoring service. This endpoint is restricted to admin users.

**Rate Limit**: 20 requests per minute

**Query Parameters**
- `path` (optional): The specific path to forward to the monitoring service
- Additional parameters are forwarded to the monitoring service

**Response**
- The response from the monitoring service is forwarded as-is

**Error Responses**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: User is not an admin
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error or error communicating with the monitoring service 