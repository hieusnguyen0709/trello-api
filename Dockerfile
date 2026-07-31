FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV BUILD_MODE=production

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/build ./build

EXPOSE 8017

CMD ["node", "build/src/server.js"]