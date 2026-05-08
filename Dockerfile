ARG PARENT_VERSION=2.10.0-node24.11.1
ARG PORT=3000
ARG PORT_DEBUG=9229

# ---------------------------------------------------------------------------
# Development stage
# Uses the Defra 'node-development' base image which includes build tools.
# Webpack builds the GOV.UK Frontend assets (CSS, JS, images, fonts) into
# the .public/ directory so they can be served by Hapi's static file handler.
# ---------------------------------------------------------------------------
FROM defradigital/node-development:${PARENT_VERSION} AS development
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node-development:${PARENT_VERSION}

ENV TZ="Europe/London"

ARG PORT
ARG PORT_DEBUG
ENV PORT=${PORT}
EXPOSE ${PORT} ${PORT_DEBUG}

COPY --chown=node:node --chmod=755 package*.json ./
RUN npm install
COPY --chown=node:node --chmod=755 . .
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
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node:${PARENT_VERSION}

ENV TZ="Europe/London"

USER root
RUN apk add --no-cache curl

COPY --from=production_build --chown=root:root /home/node/package*.json ./
COPY --from=production_build --chown=root:root /home/node/src ./src/
COPY --from=production_build --chown=root:root /home/node/.public/ ./.public/

RUN npm ci --omit=dev

RUN chmod -R a-w /home/node

USER node

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD [ "node", "src" ]
