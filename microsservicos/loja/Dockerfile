FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY microsservicos/loja/package.json microsservicos/loja/
RUN npm ci --no-audit --no-fund
COPY microsservicos/loja/tsconfig.json microsservicos/loja/
COPY microsservicos/loja/src microsservicos/loja/src
RUN npm run build --workspace=petshop-loja-service

FROM node:22-slim
ENV NODE_ENV=production NODE_NO_WARNINGS=1
WORKDIR /app
COPY package.json package-lock.json ./
COPY microsservicos/loja/package.json microsservicos/loja/
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/microsservicos/loja/dist microsservicos/loja/dist
COPY microsservicos/loja/migrations microsservicos/loja/migrations
WORKDIR /app/microsservicos/loja
RUN mkdir -p /data && chown node:node /data
USER node
ENV HOST=0.0.0.0 PORT=8082 DB_DRIVER=sqlite SQLITE_PATH=/data/loja.db
EXPOSE 8082
HEALTHCHECK --interval=10s --timeout=3s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:8082/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
