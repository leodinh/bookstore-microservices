# Bookstore Microservices

A learning-first NestJS bookstore with one public HTTP Gateway, three internal TCP microservices, and one RabbitMQ event consumer.

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
                    |
                    +-- emit --> RabbitMQ --> Notifications
```

The Gateway is the only public application. Clients cannot choose arbitrary TCP message patterns; a controlled route registry maps each allowed HTTP method and path to a known microservice command.

## Applications

| Application | Responsibility | Default port |
| --- | --- | --- |
| API Gateway | HTTP routing, validation, throttling, timeouts, and error translation | 3000 |
| Users service | Signup, password hashing, and user lookup | 4001 |
| Books service | Catalog, book management, and inventory | 4002 |
| Orders service | Transactional purchases, snapshots, history, and idempotency | 4003 |
| Notifications service | Asynchronously consumes order-created events | none (RabbitMQ consumer) |

## NestJS structure

Each feature follows the same separation:

- **Controller:** receives a transport request and delegates it.
- **Service:** owns business rules and orchestration.
- **Repository:** owns database queries and transactions.
- **Entity:** maps domain data to database columns and relationships.
- **Module:** wires controllers, providers, database features, and TCP clients.
- **Shared contract:** validates command, query, and event payloads at transport boundaries.

Shared DTOs and message patterns live in `libs/common`. Shared database connection infrastructure lives in `libs/database`; domain entities remain owned by their services.

## Setup

```bash
pnpm install
docker compose up -d postgres rabbitmq
pnpm migration:run
pnpm seed
```

PostgreSQL uses host port `5433` so it does not conflict with a typical local PostgreSQL installation on `5432`.

Start each application in a separate terminal:

```bash
pnpm start:users
pnpm start:books
pnpm start:orders
pnpm start:notifications
pnpm start:gateway
```

## Run as separate Docker services

Build and start PostgreSQL, RabbitMQ, migrations, all four internal microservices, and the HTTP Gateway:

```bash
pnpm docker:up
docker compose ps
```

Only these host ports are published:

```text
localhost:3000 → API Gateway
localhost:5433 → PostgreSQL development access
localhost:5672 → RabbitMQ AMQP
localhost:15672 → RabbitMQ management UI
```

Users, Books, and Orders expose ports only inside the Compose network. The Gateway reaches them through Docker DNS names such as `books-service`; `127.0.0.1` inside a container refers to that container itself. Orders and Notifications connect to RabbitMQ using `rabbitmq:5672`.

The RabbitMQ management UI is available at `http://localhost:15672` with the local-development username and password `bookstore`.

Schema migrations run as a one-shot container before the services start. To insert the sample books from inside Docker:

```bash
pnpm docker:seed
```

Inspect all service logs or stop the application with:

```bash
pnpm docker:logs
pnpm docker:down
```

`docker:down` keeps the PostgreSQL and RabbitMQ volumes. It stops containers and the Compose network but does not erase bookstore data or durable queued events.

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

## Commands, queries, and events

Nest `ClientProxy.send()` is request-response communication. The caller waits for one handler to return a value, so it is appropriate when the next decision requires the answer. The Gateway uses `send()` for HTTP-to-TCP routing, and Orders uses it to verify a user before committing an order.

Nest `ClientProxy.emit()` publishes a fact and does not wait for a consumer result. After a new order transaction commits, Orders emits the string pattern `orders.order.created` to the durable `bookstore_notifications` RabbitMQ queue. Notifications consumes it with `@EventPattern`.

The event includes an event ID, occurrence time, order and user IDs, total, item count, and the original correlation ID. An idempotent replay returns the existing order without publishing another creation event.

Notifications uses manual RabbitMQ acknowledgements:

```text
handler succeeds → ack → RabbitMQ removes the delivery
handler fails    → nack + requeue → RabbitMQ can deliver it again
```

Manual acknowledgement provides at-least-once delivery behavior, so real side effects such as sending email must eventually be idempotent. This milestone logs the notification rather than calling an external email provider.

This implementation publishes only after the PostgreSQL transaction commits, so it never announces an order that rolled back. A small dual-write failure window still exists: the process could stop after the database commit but before RabbitMQ accepts the event. A production-grade next step is a transactional outbox, followed by retry limits and a dead-letter queue for events that repeatedly fail.

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
- RabbitMQ uses a durable queue and persistent messages for order-created events.
- Notifications acknowledges an event only after successful handling.

The built-in throttle store is in memory and is appropriate for local development. A production deployment with multiple Gateway replicas should use shared throttle storage.

## Testing

Fast unit tests exercise controllers, services, repositories, validation, routing, and error translation in isolation:

```bash
pnpm test
```

The E2E suite starts the real Gateway, all three TCP microservices, and a Notifications RabbitMQ consumer. It creates isolated test records, verifies PostgreSQL and event state, and removes database records afterward:

```bash
docker compose up -d postgres rabbitmq
pnpm migration:run
pnpm test:e2e
```

E2E services use ports `4401–4403` and the separate RabbitMQ queue `bookstore_notifications_e2e` by default. Override `USERS_SERVICE_PORT`, `BOOKS_SERVICE_PORT`, `ORDERS_SERVICE_PORT`, `RABBITMQ_URL`, or `RABBITMQ_NOTIFICATIONS_QUEUE` when needed.

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
