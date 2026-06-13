# Imagen única: instala dependencias, compila el cliente y arranca el servidor
# (que sirve la API, el WebSocket y el frontend compilado en el mismo origen).
FROM node:24-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# 1) Solo los manifiestos primero, para cachear la instalación de dependencias.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN pnpm install --frozen-lockfile

# 2) El resto del código y el build del cliente.
COPY . .
RUN pnpm --filter @checkout/client build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["pnpm", "--filter", "@checkout/server", "start"]
