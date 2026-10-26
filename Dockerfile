# Public site: build the Angular app (browser files + the Node server that renders pages), then run only the server.
#   docker build -t irieltor-web .      Build context: this folder.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npx ng build

# The server bundle carries its own dependencies, so the runtime image needs no node_modules.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    API_INTERNAL_URL=http://api:8080
COPY --from=build /app/dist/I-rieltor.uz-web ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:4000/healthz || exit 1
CMD ["node", "server/server.mjs"]
