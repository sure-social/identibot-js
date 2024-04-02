FROM ubuntu:jammy

WORKDIR /app

RUN apt-get update          \
    && apt-get -y --no-install-recommends install \
        ca-certificates     \
        curl                \
        gcc                 \
        g++                 \
        git                 \
        make                \
        openssl             \
        nano                \
        vim

RUN git clone -b OpenSSL_1_1_1b https://github.com/openssl/openssl.git \
    && cd openssl           \
    && ./config             \
    && make                 \
    && make install

RUN curl -sL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

COPY ./package.json .
COPY ./package-lock.json .

RUN npm install

# do this as a separate step so we don't have to rebuild the image
# every time the app changes.

COPY . .

ENTRYPOINT [ "npm" ]
CMD [ "run", "prod" ]
