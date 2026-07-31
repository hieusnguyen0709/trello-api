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

HEALTHCHECK --interval=5s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8017/', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "build/src/server.js"]