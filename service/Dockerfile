FROM node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5
WORKDIR /app
LABEL org.opencontainers.image.source="https://github.com/Syntax-Circus/SyntaxCircus.Seo.Analysis.Yoast" \
      org.opencontainers.image.licenses="GPL-3.0-only" \
      org.opencontainers.image.documentation="https://github.com/Syntax-Circus/SyntaxCircus.Seo.Analysis.Yoast/blob/main/docs/LICENSING.md"
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server.mjs worker.mjs LICENSE ./
COPY source ./source
USER node
ENV NODE_ENV=production
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
