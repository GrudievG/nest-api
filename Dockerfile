FROM node:24-alpine as base
WORKDIR /usr/src/app


FROM base as deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci


FROM base AS dev
ENV NODE_ENV=development

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["npm", "run", "start:dev"]


FROM base AS build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build


FROM base AS prod-deps
ENV NODE_ENV=production
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev


FROM base as prod
ENV NODE_ENV production
USER node
COPY package.json .
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]


FROM gcr.io/distroless/nodejs20-debian12:nonroot AS prod-distroless
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY package*.json ./
EXPOSE 3000
CMD ["dist/main.js"]


FROM dhi.io/node:24-alpine3.22 AS prod-hardened
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY package*.json ./
EXPOSE 3000
CMD ["dist/main.js"]