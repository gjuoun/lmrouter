# Use the official Bun image
FROM oven/bun:1 AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the project
RUN bun run build

# Production stage
FROM oven/bun:1 AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install production dependencies
RUN bun install --frozen-lockfile --production

# Copy built application
COPY --from=base /app/dist ./dist

# Create config directory for volume mount (do not copy config files)
RUN mkdir -p config

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bunuser

# Change ownership of the app directory
RUN chown -R bunuser:nodejs /app

# Switch to non-root user
USER bunuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run the application
CMD ["bun", "dist/index.js", "config/config.yaml"]
