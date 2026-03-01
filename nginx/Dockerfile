FROM node:20-alpine AS frontend

WORKDIR /app

COPY react/package.json react/package-lock.json ./
RUN npm ci

COPY react/ .
RUN npm run build

# --- Production image ---
FROM nginx:1.27-alpine

RUN apk update && apk add --no-cache bash

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/symfony.conf.template /etc/nginx/templates/symfony.conf.template
COPY --from=frontend /app/dist /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf
