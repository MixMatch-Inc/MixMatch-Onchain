# Authentication Flow

## Overview
MixMatch uses JWT-based authentication with access and refresh tokens.

## Endpoints

### Register
POST /api/auth/register
- Body: { email: string, password: string }
- Returns: { user: AuthUser, accessToken: string, refreshToken: string }
- Password must be 8+ chars with uppercase, lowercase, digit, and special char

### Login
POST /api/auth/login
- Body: { email: string, password: string }
- Returns: { user: AuthUser, accessToken: string, refreshToken: string }
- Rate limited to 5 attempts per minute per email

### Get Current User
GET /api/auth/me
- Header: Authorization: Bearer <accessToken>
- Returns: { user: AuthUser }
- Returns 401 if token is invalid or expired

## Token Lifecycle
- Access tokens expire after JWT_EXPIRES_IN (default: 1h)
- Refresh tokens stored in Session table, expire after 7 days
- Rotation: new refresh token issued on each use

## Security Notes
- Passwords hashed with bcrypt (12 rounds)
- Generic error messages prevent user enumeration
- Rate limiting on login endpoint
- CORS restricted to WEB_ORIGIN
