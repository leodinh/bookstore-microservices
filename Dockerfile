# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS dependencies

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps ./apps
COPY libs ./libs

ARG APP_NAME
RUN test -n "$APP_NAME" && pnpm exec nest build "$APP_NAME"

FROM dependencies AS migrations

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps ./apps
COPY libs ./libs
COPY database ./database

USER node

CMD ["node", "-r", "ts-node/register", "-r", "tsconfig-paths/register", "node_modules/typeorm/cli.js", "migration:run", "-d", "database/data-source.ts"]

FROM node:22-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

ENV NODE_ENV=production
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build --chown=node:node /app/dist ./dist

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

USER node

CMD ["sh", "-c", "exec node dist/apps/${APP_NAME}/main.js"]
