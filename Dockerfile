# syntax = docker/dockerfile:1

# Stage 1: Build client
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci

# Copy client source
COPY client/ ./

# Build client for production
RUN npm run build

# Stage 2: Setup server
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy server package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy server source
COPY server/ ./

# Copy built client from previous stage
COPY --from=client-builder /app/client/dist /app/client/dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/game_state.db

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "src/index.js"]
