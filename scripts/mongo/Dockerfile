FROM mongo:8

RUN mkdir -p /etc/mongo \
    && openssl rand -base64 756 > /etc/mongo/keyfile \
    && chown mongodb:mongodb /etc/mongo/keyfile \
    && chmod 400 /etc/mongo/keyfile