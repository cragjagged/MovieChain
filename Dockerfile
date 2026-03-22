FROM node:22-alpine

# pm2 for in-process restart after auto-update
RUN npm install -g pm2

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG APP_VERSION=0.0.0
ARG GIT_SHA=unknown
ENV APP_VERSION=$APP_VERSION
ENV GIT_SHA=$GIT_SHA

RUN npm run build

RUN mkdir -p /app/data

EXPOSE 7879

CMD ["pm2-runtime", "ecosystem.config.cjs"]
