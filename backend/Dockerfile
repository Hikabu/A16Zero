FROM node:20-bookworm
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN npm run build
# Install runtime utilities
RUN apt-get update && apt-get install -y curl ffmpeg

CMD ["node", "dist/main.js"]