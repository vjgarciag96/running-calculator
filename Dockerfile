FROM node:24.22.2-alpine AS build
# The public URL, for the canonical and hreflang links.
ARG SITE_URL
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY scripts scripts
COPY src src
COPY site site
RUN SITE_URL=$SITE_URL npm run build

FROM caddy:2.11.4-alpine
COPY --from=build /src/site /srv
EXPOSE 8080
USER 65534:65534
CMD ["caddy", "file-server", "--root", "/srv", "--listen", ":8080"]
