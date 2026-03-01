FROM php:8.3-fpm-bookworm AS base

WORKDIR /var/www/html/symfony

RUN apt update \
    && apt install -y \
        zip \
        unzip \
        git \
        libpq-dev \
    && apt clean -y && apt autoremove -y

RUN docker-php-ext-install pdo pdo_pgsql

# install Composer (latest 2.x)
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer --2

# Development stage
FROM base AS dev

CMD ["php-fpm"]

# Production stage
FROM base AS prod

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction

RUN chown -R www-data:www-data var/ \
    && chmod -R 755 var/

RUN php bin/console cache:clear --env=prod

CMD ["php-fpm"]
