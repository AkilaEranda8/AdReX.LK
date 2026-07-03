FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npx esbuild prisma/seed.ts --bundle --platform=node --format=cjs \
    --outfile=prisma/seed.bundle.cjs --external:@prisma/client
RUN npx esbuild prisma/init-admin.ts --bundle --platform=node --format=cjs \
    --outfile=prisma/init-admin.bundle.cjs --external:@prisma/client --external:bcryptjs
RUN npx esbuild prisma/wipe-all.ts --bundle --platform=node --format=cjs \
    --outfile=prisma/wipe-all.bundle.cjs --external:@prisma/client
ENV DATABASE_URL=file:/tmp/empty.template.db
RUN npx prisma db push --skip-generate && cp /tmp/empty.template.db prisma/empty.template.db
ENV DATABASE_URL=file:/tmp/prod.template.db
RUN npx prisma db push --skip-generate
RUN DATABASE_URL=file:/tmp/prod.template.db node prisma/seed.bundle.cjs
RUN cp /tmp/prod.template.db prisma/prod.template.db
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/jose ./node_modules/jose
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/data /app/uploads \
  && chown -R nextjs:nodejs /app/data /app/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/data/prod.db?busy_timeout=10000&journal_mode=WAL

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
