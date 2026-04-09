FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 4321

CMD ["./docker-entrypoint.sh"]
