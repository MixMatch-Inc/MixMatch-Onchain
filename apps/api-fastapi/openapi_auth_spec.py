AUTH_OPENAPI_TAGS = {
    "name": "authentication",
    "description": "User authentication, JWT token issuance, and password verification endpoints."
}

AUTH_RESPONSES = {
    401: {"description": "Invalid credentials or expired JWT token"},
    403: {"description": "Forbidden - Insufficient permissions"},
}
