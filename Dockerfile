# Stage 1: Build React Client
FROM node:18-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./

# 1. Run standard install
RUN npm install

# 2. THE ULTIMATE FIX: Force-install the specific native Linux engine that Vite/Tailwind v4 is looking for!
RUN npm install @tailwindcss/oxide-linux-x64-gnu --save-optional --forced

COPY client/ ./
RUN npm run build

# Stage 2: Run Production Server
FROM node:18-slim
WORKDIR /app
ENV NODE_ENV=production

COPY server/package*.json ./server/
RUN npm ci --prefix server --only=production
COPY server/ ./server/

COPY --from=client-builder /app/client/dist ./client/dist
EXPOSE 5000
CMD ["node", "server/server.js"]