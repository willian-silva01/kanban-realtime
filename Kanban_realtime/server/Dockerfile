FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY src ./src
USER app
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "src/server.js"]
