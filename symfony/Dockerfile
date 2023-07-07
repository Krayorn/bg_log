FROM php:8.1.18-fpm-buster

WORKDIR /var/www/html/symfony

RUN apt update \
    && apt install -y \
        zip \
        unzip \
        git \
        libpq-dev \
    && apt clean -y && apt autoremove -y

RUN docker-php-ext-install pdo pdo_pgsql

# install Composer
RUN export COMPOSER_VERSION=2.3.10 \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer --version=${COMPOSER_VERSION}


CMD ["php-fpm"]
