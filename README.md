# MixMatch 🎧

MixMatch is a music-driven event and DJ discovery platform that connects DJs with event organizers and music lovers through smart matching and seamless booking flows. Instead of relying on manual searches or word-of-mouth, MixMatch helps users discover DJs based on music taste, event type, availability, and vibe.

The platform is designed for DJs looking to get booked more efficiently, event planners seeking reliable talent, and music enthusiasts who want curated, experience-driven matches. MixMatch blends a Web2-first architecture with selective Web3 integrations to enable transparent payments and subscriptions without introducing unnecessary complexity.

---

## Tech Stack

* **Frontend:** [Frontend Repo](https://github.com/MixMatch-Inc/mixmatch)
* **Backend API:** [Backend Repo](https://github.com/MixMatch-Inc/mixmatch)
* **Database:** MongoDB
* **Payments & Subscriptions:** Stellar Network
* **Auth:** JWT-based authentication

---

## Repository Overview

This repository contains the core backend services that power MixMatch.

```
mixmatch/
├── src/
│   ├── config/              # Environment, DB, Stellar setup
│   ├── modules/
│   │   ├── auth/            # Authentication & sessions
│   │   ├── users/           # DJs and organizers profiles
│   │   ├── matches/         # Matching & recommendation logic
│   │   ├── events/          # Event creation and management
│   │   ├── bookings/        # DJ booking lifecycle
│   │   ├── reviews/         # Ratings and feedback
│   │   └── payments/        # Stellar payments & subscriptions
│   ├── middlewares/         # Auth, validation, error handling
│   ├── routes/              # API route registration
│   ├── utils/               # Shared helpers
│   └── app.ts               # Express app bootstrap
├── tests/                   # Unit and integration tests
├── .env.example
├── package.json
└── README.md
```

The codebase follows a **feature-based modular structure**, allowing contributors to work independently on specific domains like bookings, matching, or payments.

---

## API Structure

### Base URL

```
/api/v1
```

### Authentication

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me
```

### Users & Profiles

```
GET    /users/:id
PATCH  /users/:id
GET    /djs
```

### Matching

```
GET    /matches/feed          # DJ / event recommendations
POST   /matches/swipe         # Like / pass actions
```

### Events

```
POST   /events
GET    /events/:id
GET    /events/user/:userId
```

### Bookings

```
POST   /bookings
PATCH  /bookings/:id/status
GET    /bookings/:id
```

### Payments (Stellar)

```
POST   /payments/intent
POST   /payments/confirm
GET    /payments/:id
```

---

## Getting Started

### Prerequisites

* Node.js (>= 18)
* MongoDB
* Stellar testnet account
* Yarn or npm

### Installation

```bash
git clone https://github.com/your-org/mixmatch.git
cd mixmatch
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

### Run the API

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

---

## Contributing Guidelines

MixMatch is an open-source project and welcomes community contributions.

### How to Contribute

1. Fork the repository
2. Create a feature branch from `main`
3. Pick an existing issue or propose one before starting
4. Keep changes focused and well-documented
5. Add or update tests where applicable
6. Open a Pull Request with a clear summary

### Best Practices

* Follow the established module structure
* Avoid large, unrelated PRs
* Use clear and descriptive commit messages
* Document new endpoints and logic
* Discuss breaking changes before implementation

### Contributor Support

Questions or ideas? Join the MixMatch contributor Telegram group:

👉 **Telegram:** [MIXMATCH](https://t.me/mixmatchinc)

---

## License

This project is open-source and released under the **MIT License**.

