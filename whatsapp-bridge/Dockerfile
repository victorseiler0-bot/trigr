FROM node:20-slim

# Chromium deps nécessaires pour certains modules
RUN apt-get update && apt-get install -y \
  python3 make g++ \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js .

# Le volume Railway sera monté ici pour persister la session WA
VOLUME ["/app/auth"]

EXPOSE 3001

CMD ["node", "server.js"]
