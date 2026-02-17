# Multi-stage build for Crystal Admin

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend source
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY public/ ./public/
COPY src/ ./src/
COPY index.html ./

# Install dependencies
RUN npm ci

# Build frontend
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend source
COPY backend/package*.json ./
COPY backend/server.js ./
COPY backend/routes/ ./routes/
COPY backend/lib/ ./lib/
COPY backend/tools/ ./tools/

# Install dependencies (production only)
RUN npm ci --omit=dev

# Stage 3: Runtime
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Copy frontend build from builder
COPY --from=frontend-builder /app/dist ./frontend/dist
COPY --from=frontend-builder /app/public ./frontend/public
COPY --from=frontend-builder /app/index.html ./frontend/

# Copy backend
COPY --from=backend-builder /app/backend ./backend
COPY backend/package*.json ./backend/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Expose ports
EXPOSE 3000 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Use dumb-init to run Node.js
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Start backend server
CMD ["node", "backend/server.js"]
