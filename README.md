# Bookstore Microservices

A learning-first NestJS bookstore with one public HTTP Gateway and three internal TCP microservices.

```text
HTTP client
    |
    v
API Gateway :3000
    |
    +-- TCP --> Users  :4001 --> PostgreSQL
    +-- TCP --> Books  :4002 --> PostgreSQL
    +-- TCP --> Orders :4003 --> PostgreSQL
                    |
                    +-- TCP --> Users
```

The Gateway is the only public application. Clients cannot choose arbitrary TCP message patterns; a controlled route registry maps each allowed HTTP method and path to a known microservice command.

## Applications

| Application | Responsibility | Default port |
| --- | --- | --- |
| API Gateway | HTTP routing, validation, throttling, timeouts, and error translation | 3000 |
| Users service | Signup, password hashing, and user lookup | 4001 |
| Books service | Catalog, book management, and inventory | 4002 |
| Orders service | Transactional purchases, snapshots, history, and idempotency | 4003 |

## NestJS structure

Each feature follows the same separation:

- **Controller:** receives a transport request and delegates it.
- **Service:** owns business rules and orchestration.
- **Repository:** owns database queries and transactions.
- **Entity:** maps domain data to database columns and relationships.
- **Module:** wires controllers, providers, database features, and TCP clients.
- **Shared contract:** validates the message shape at both ends of a TCP call.

Shared DTOs and message patterns live in `libs/common`. Shared database connection infrastructure lives in `libs/database`; domain entities remain owned by their services.

## Setup

```bash
pnpm install
pnpm db:up
pnpm migration:run
pnpm seed
```

PostgreSQL uses host port `5433` so it does not conflict with a typical local PostgreSQL installation on `5432`.

Start each application in a separate terminal:

```bash
pnpm start:users
pnpm start:books
pnpm start:orders
pnpm start:gateway
```

## Example request flow

Create an order with a client-generated UUID:

```bash
curl -X POST http://localhost:3000/api/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 4f348ef9-6f07-4df5-8221-e1e4136ea9cc' \
  --data '{
    "userId": "67f76ed1-bdcc-4286-9e3f-123fb4ab571e",
    "items": [
      {
        "bookId": "d92eb1d3-6ca5-4ae1-a463-1ce744949e95",
        "quantity": 2
      }
    ]
  }'
```

The Gateway validates the request, sends the controlled `orders.order.create` TCP pattern, and translates the result back to HTTP. Repeating the same key and request returns the original order without changing stock again. Reusing the key for a different request returns `409 IDEMPOTENCY_KEY_REUSED`.

## Correlation IDs

The Gateway generates a new UUID for every HTTP request, overwrites any client-supplied `X-Correlation-Id`, and returns its generated value in the response header. The ID is added to every TCP request DTO.

Orders forwards the same correlation ID when it calls Users. Global RPC interceptors log the ID, message pattern, result, and duration without logging payloads. Searching for one UUID therefore reconstructs a request across separate application logs.

Correlation IDs trace one network attempt. Idempotency keys identify one logical write operation. Every retry receives a new correlation ID while keeping the same idempotency key. If frontend-generated references are needed later, they should use a separate field such as `X-Client-Request-Id`.

## Resilience behavior

- Global Gateway throttling returns `429` before a controller reaches a microservice.
- A refused or lost TCP connection becomes `503 MICROSERVICE_UNAVAILABLE`.
- A microservice that exceeds the response deadline becomes `504 MICROSERVICE_TIMEOUT`.
- PostgreSQL transactions and row locks prevent partial orders and lost inventory updates.
- A unique persisted idempotency key prevents duplicate orders across retries and replicas.

The built-in throttle store is in memory and is appropriate for local development. A production deployment with multiple Gateway replicas should use shared throttle storage.

## Testing

Fast unit tests exercise controllers, services, repositories, validation, routing, and error translation in isolation:

```bash
pnpm test
```

The E2E suite starts the real Gateway and all three TCP microservices. It creates isolated test records, verifies PostgreSQL state, and removes those records afterward:

```bash
pnpm db:up
pnpm migration:run
pnpm test:e2e
```

E2E services use ports `4401–4403` by default. Override `USERS_SERVICE_PORT`, `BOOKS_SERVICE_PORT`, or `ORDERS_SERVICE_PORT` if one is occupied.

Run all static checks and application builds with:

```bash
pnpm lint
pnpm build
```

## Database commands

```bash
pnpm db:status
pnpm migration:show
pnpm migration:run
pnpm migration:revert
pnpm seed
pnpm db:down
```

TypeORM `synchronize` is disabled. Every schema change must be captured in a migration so local, test, and production databases can evolve predictably.
