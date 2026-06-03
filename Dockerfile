# Stage 1: Build React Client
FROM node:20-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Run Production Server
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY server/package*.json ./server/
RUN npm ci --prefix server --only=production
COPY server/ ./server/

COPY --from=client-builder /app/client/dist ./client/dist
EXPOSE 5000
CMD ["node", "server/server.js"]