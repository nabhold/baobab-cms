FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS final
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/payload.config.ts ./payload.config.ts
COPY --from=build /app/src ./src

EXPOSE 3000
CMD ["node", "dist/server.js"]
