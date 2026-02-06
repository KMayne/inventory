FROM node:22-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy packages
COPY packages ./packages

# Copy server app
COPY apps/server ./apps/server

# Copy web app
COPY apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @inventory/server exec prisma generate

# Set working directory to server
WORKDIR /app/apps/server

# Build frontend
RUN pnpm --filter @inventory/web run build

# Expose port
EXPOSE 3000

# Copy startup script
COPY run.sh ./run.sh
RUN chmod +x ./run.sh

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["./run.sh"]
