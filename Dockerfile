FROM node:24-alpine
WORKDIR /app
COPY package.json server.js pricing.js ./
COPY public ./public
COPY scripts/ops-snapshot.mjs ./scripts/
RUN mkdir -p /data && chown -R node:node /data /app
USER node
ENV NODE_ENV=production DATA_DIR=/data PORT=4173 COOKIE_SECURE=true
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
