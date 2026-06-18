FROM node:20-alpine
WORKDIR /app

# Dipendenze
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY server/prisma ./server/prisma
RUN npm ci

# Sorgenti + build
COPY client/ ./client/
COPY server/ ./server/
RUN npx prisma generate --schema=server/prisma/schema.prisma \
 && npm run build --workspace=client \
 && npm run build --workspace=server

ENV NODE_ENV=production
ENV PORT=3050
ENV DATABASE_URL=file:/data/db.sqlite

RUN mkdir -p /data

EXPOSE 3050

CMD sh -c "npx prisma db push --schema=server/prisma/schema.prisma && node server/dist/index.js"
