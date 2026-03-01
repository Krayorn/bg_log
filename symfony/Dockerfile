FROM php:8.3-fpm-bookworm

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

CMD ["php-fpm"]
