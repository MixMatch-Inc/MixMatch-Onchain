# MixMatch FastAPI Backend

Modular monolith backend for MixMatch built with FastAPI, SQLAlchemy (async), and Python.

## Modules
- `core`: Config, database, security, and shared utilities
- `db`: Declarative SQLAlchemy models matching PostgreSQL schema
- `modules.auth`: User authentication, JWT tokens, password hashing
- `modules.payments`: Stellar payments, path payments, reconciliation, escrow, and anchor integration
- `modules.taste`: Music taste profiling and vector similarity
