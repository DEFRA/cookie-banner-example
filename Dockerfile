ARG PARENT_VERSION=3.1.1-node24.18.0
ARG PORT=3000
ARG PORT_DEBUG=9229

# ---------------------------------------------------------------------------
# Development stage
# Uses the Defra 'node-development' base image which includes build tools.
# Vite builds the GOV.UK Frontend assets (CSS, JS, images, fonts) into
# the .public/ directory so they can be served by Hapi's static file handler.
# ---------------------------------------------------------------------------
FROM defradigital/node-development:${PARENT_VERSION} AS development

ENV TZ="Europe/London"

ARG PORT
ARG PORT_DEBUG
ENV PORT=${PORT}
EXPOSE ${PORT} ${PORT_DEBUG}

COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npm run build:frontend

CMD [ "npm", "run", "dev" ]

# ---------------------------------------------------------------------------
# Production build stage
# Rebuilds frontend assets with NODE_ENV=production for minification.
# ---------------------------------------------------------------------------
FROM development AS production_build

ENV NODE_ENV=production

RUN npm run build:frontend

# ---------------------------------------------------------------------------
# Production stage
# Uses the slimmer Defra 'node' base image (no build tools).
# Only copies the compiled assets and source needed at runtime.
# ---------------------------------------------------------------------------
FROM defradigital/node:${PARENT_VERSION} AS production

ENV TZ="Europe/London"

# CDP PLATFORM HEALTHCHECK REQUIREMENT
USER root
RUN apk add --no-cache curl

COPY --from=production_build --chown=root:root /home/node/package*.json ./
COPY --from=production_build --chown=root:root /home/node/src ./src/
COPY --from=production_build --chown=root:root /home/node/.public/ ./.public/

RUN npm ci --omit=dev

# Remove write permissions
RUN chmod -R a-w /home/node

USER node

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD [ "node", "src" ]
