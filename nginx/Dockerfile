FROM nginx:1.27-alpine

RUN apk update && apk add --no-cache bash

COPY ./nginx.conf /etc/nginx/nginx.conf
COPY ./symfony.conf.template /etc/nginx/templates/symfony.conf.template

RUN rm /etc/nginx/conf.d/default.conf