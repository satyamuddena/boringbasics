# BORING BASICS — self-contained deployment (Next.js standalone + SQLite on a volume)
#
#   docker build -t boring-basics .
#   docker run -d -p 3000:3000 -v boring-basics-data:/data \
#     -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD=change-me \
#     -e NEXT_PUBLIC_SITE_URL=https://boringbasics.in boring-basics
#
# All persistent state (SQLite DB + uploaded images) lives in /data.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    DATA_DIR=/data \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone server + static assets + public files
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# SQL migrations, applied automatically on boot
COPY --from=build /app/drizzle ./drizzle

RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME /data
EXPOSE 3000

CMD ["node", "server.js"]
