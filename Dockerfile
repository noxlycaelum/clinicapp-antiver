# Stage 1: Build React Client
FROM node:18-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Run Production Server
FROM node:18-slim
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy server package manifest and install only production dependencies
COPY server/package*.json ./server/
RUN npm ci --prefix server --only=production

# Copy server backend source code
COPY server/ ./server/

# Copy built client static assets from builder stage
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port (Render overrides this dynamically via PORT env var)
EXPOSE 5000

# Command to launch the server
CMD ["node", "server/server.js"]
