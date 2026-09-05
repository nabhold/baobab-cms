# Baobab Content Engine — production image (ADR-0020 §43-44).
#
# This image serves the built application only. Migrations are NOT run
# automatically by its entrypoint (ADR-0019 §97 — production migrations
# run under controlled service/operator authority as an explicit
# deployment step, using the `build` stage or CI, which still has the full
# toolchain). See docs/operations/runbooks.md for the deploy sequence.

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup -g 1001 -S nodejs && adduser -S payload -u 1001

COPY --from=build /app/public ./public
COPY --from=build --chown=payload:nodejs /app/.next/standalone ./
COPY --from=build --chown=payload:nodejs /app/.next/static ./.next/static

USER payload
EXPOSE 3000

CMD ["node", "server.js"]
