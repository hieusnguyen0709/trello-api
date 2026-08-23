# Trello Clone API

Backend API for a Trello-style task management application, built with Node.js, Express, and MongoDB. Supports boards, columns, cards, labels, board invitations, real-time updates via Socket.io, and JWT-based authentication with role-based board authorization.

**Live Demo:** [https://trello-clone.website](https://trello-clone.website)
**Frontend Repo:** [trello-web](https://github.com/hieusnguyen0709/trello-web)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Authentication & Authorization](#authentication--authorization)
- [CI/CD & Deployment](#cicd--deployment)
- [Project Structure](#project-structure)

---

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | MongoDB (native driver, no ODM) |
| Authentication | JWT (access + refresh token), bcryptjs |
| Validation | Joi |
| File Upload / Media | Multer, Cloudinary |
| Real-time | Socket.io |
| Email | Brevo (Sendinblue) |
| Testing | Jest, Supertest, mongodb-memory-server |
| CI/CD | GitHub Actions, Docker |
| Deployment | AWS EC2, ECR, GHCR, Nginx, Let's Encrypt (Certbot) |

## Architecture

This project follows a layered architecture:

```
Route → Middleware (Auth) → Validation → Controller → Service → Model → MongoDB
```

- **Route**: defines endpoints and wires up middleware in order.
- **Middleware**: authentication (`authenticationMiddleware`) and authorization (`authorizationMiddleware`) are separated into two distinct layers — see [Authentication & Authorization](#authentication--authorization).
- **Validation**: Joi schemas validate request payloads before any business logic runs.
- **Controller**: thin layer, only extracts request data and delegates to the Service.
- **Service**: contains all business logic (e.g. reconciling board membership, checklist actions, moving cards between columns).
- **Model**: the only layer that talks to MongoDB directly, including schema validation before insert/update.

## Getting Started

### Prerequisites

- Node.js >= 18.x
- Yarn
- A MongoDB instance (local, Docker, or Atlas)

### Installation

```bash
git clone https://github.com/hieusnguyen0709/trello-api.git
cd trello-api
yarn install
```

Copy the example environment file and fill in your own values:

```bash
cp .env.example .env
```

### Run in development

```bash
yarn dev
```

### Build and run in production mode

```bash
yarn build
yarn production
```

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `DATABASE_NAME` | Database name |
| `APP_HOST` / `APP_PORT` | Host and port the server listens on |
| `WEBSITE_DOMAIN_DEVELOPMENT` / `WEBSITE_DOMAIN_PRODUCTION` | Allowed frontend origins (CORS) |
| `ACCESS_TOKEN_SECRET_SIGNATURE` / `ACCESS_TOKEN_LIFE` | JWT access token secret and expiry |
| `REFRESH_TOKEN_SECRET_SIGNATURE` / `REFRESH_TOKEN_LIFE` | JWT refresh token secret and expiry |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials for card cover/attachment uploads |
| `BREVO_API_KEY` / `ADMIN_EMAIL_ADDRESS` / `ADMIN_EMAIL_NAME` | Transactional email (account verification) |

See `.env.example` for the full list.

## Available Scripts

| Script | Description |
|---|---|
| `yarn dev` | Run the server in watch mode (nodemon) |
| `yarn lint` | Run ESLint with zero tolerance for warnings |
| `yarn test:unit` | Run unit tests (mocked dependencies, no DB) |
| `yarn test:integration` | Run integration tests (real, isolated MongoDB instance via `mongodb-memory-server`) |
| `yarn test` | Run the full test suite (unit + integration) |
| `yarn build` | Transpile the project via Babel into `/build` |
| `yarn production` | Build and run the production server |

## Testing

The project follows the testing pyramid: unit tests for business logic in isolation, and integration tests for both the Service layer and the API (HTTP) layer.

```
tests/
├── unit/                      # Mocked dependencies, no DB, fast
│   ├── services/
│   └── utils/
└── integration/
    ├── services/               # Calls services directly against a real (isolated) MongoDB instance
    ├── api/                    # Full HTTP request/response via Supertest, real middleware chain
    └── helpers/                # Test data factories (createTestUser, createTestBoard, ...)
```

- **Unit tests** mock all dependencies (`jest.mock(...)`) and test pure business logic.
- **Integration tests** run against a real MongoDB instance spun up by `mongodb-memory-server` — isolated, ephemeral, and reset between test runs.
- Every write operation (create/update/delete) is verified both via the returned response **and** by re-querying the database directly, to catch cases where an operation reports success without actually persisting the correct state.

Run everything:
```bash
yarn test
```

## Authentication & Authorization

These two concerns are deliberately split into separate middleware:

- **`authenticationMiddleware.isAuthenticated`** — verifies the JWT access token cookie and answers *"who is making this request?"*.
- **`authorizationMiddleware.hasBoardAccess(resolver)`** — verifies that the authenticated user is an owner or member of the specific board being acted on, answering *"is this user allowed to do this?"*.

`hasBoardAccess` is a middleware factory: since different routes reference a board in different ways (`req.params.id`, `req.body.boardId`, or indirectly through a card/column/label ID), each protected route supplies a small **resolver** function that knows how to extract the relevant `boardId` for that specific request:

```js
Router.route('/:id')
    .put(
        authenticationMiddleware.isAuthenticated,
        boardValidation.update,
        authorizationMiddleware.hasBoardAccess(authorizationMiddleware.resolvers.fromParamsId),
        boardController.update
    )
```

This keeps authorization logic in one place while still being explicit, at the route level, about which resources are protected.

## CI/CD & Deployment

On every push and pull request, GitHub Actions runs:

1. **Lint** — ESLint with zero warnings allowed.
2. **Unit tests**
3. **Integration tests** (against an isolated MongoDB instance)
4. **Docker build** — builds the production image and runs a container healthcheck against a real MongoDB service container before pushing.
5. **Push** the built image to GitHub Container Registry (GHCR) and Amazon ECR.
6. **Deploy** — on merge to `master`, the pipeline connects to an EC2 instance over SSH and pulls/restarts the container with the newly built image.

Infrastructure: AWS EC2 (container host), ECR (image registry), VPC, IAM (scoped roles for ECR/Secrets Manager access), Secrets Manager (runtime secrets), Nginx as a reverse proxy, and Let's Encrypt for SSL on the custom domain.

## Project Structure

```
src/
├── config/           # MongoDB connection, CORS, environment
├── controllers/       # Thin HTTP layer, delegates to services
├── services/          # Business logic
├── models/             # MongoDB schema validation (Joi) and queries
├── middlewares/        # authentication, authorization, error handling, file upload
├── validations/        # Joi request validation schemas
├── routes/v1/           # Route definitions
├── providers/            # Third-party integrations (Cloudinary, JWT, Brevo)
├── sockets/               # Socket.io event handlers
└── utils/                  # Constants, formatters, ApiError, algorithms
```