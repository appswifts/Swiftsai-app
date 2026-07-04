# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app
RUN addgroup -S editor && adduser -S editor -G editor

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server/package.json ./server/package.json

RUN cd server && npm install --omit=dev

RUN mkdir -p /app/templates && chown -R editor:editor /app

EXPOSE 4201
USER editor
CMD ["node", "server/index.js"]
