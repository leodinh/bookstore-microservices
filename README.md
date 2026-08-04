# Bookstore Microservices

A learning-first NestJS project that grows into a bookstore made of an HTTP API Gateway and three internal TCP microservices.

## Milestone 1: prove the architecture

The first milestone intentionally keeps the catalog in memory. It proves this request path before database complexity is introduced:

```text
Client --HTTP--> API Gateway --TCP--> Books Service
```

`GET /api/books/catalog` enters the public gateway. The gateway sends the controlled `{ cmd: 'books.catalog.get' }` message pattern to the Books service and returns its response.

## Applications

| Application | Role | Default port |
| --- | --- | --- |
| API Gateway | Only public HTTP entry point | 3000 |
| Users service | User accounts over TCP | 4001 |
| Books service | Catalog and inventory over TCP | 4002 |
| Orders service | Purchasing and order history over TCP | 4003 |

Shared message patterns live in `libs/common`. Client input never chooses a raw TCP pattern.

## Run milestone 1

Install dependencies:

```bash
pnpm install
```

Start the Books service:

```bash
pnpm start:books
```

In another terminal, start the gateway:

```bash
pnpm start:gateway
```

Then request the catalog:

```bash
curl http://localhost:3000/api/books/catalog
```

## Useful commands

```bash
pnpm build
pnpm lint
pnpm test
pnpm start:users
pnpm start:orders
```

## Learning roadmap

1. Workspace and TCP request/response - current milestone
2. PostgreSQL, TypeORM, migrations, and seed data
3. Users signup and password hashing
4. Books catalog and inventory persistence
5. Transactional order creation and historical snapshots
6. Controlled generic gateway routing
7. Validation, structured errors, correlation IDs, and logging
8. Throttling, timeouts, idempotency, and integration tests

## Next exercise

Trace `GET /api/books/catalog` through these files:

1. `apps/api-gateway/src/api-gateway.controller.ts`
2. `apps/api-gateway/src/api-gateway.service.ts`
3. `libs/common/src/message-patterns.ts`
4. `apps/books-service/src/books-service.controller.ts`

The key idea is that HTTP concerns stop at the gateway. The Books service only knows about TCP messages and bookstore logic.
