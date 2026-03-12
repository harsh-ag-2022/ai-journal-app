FROM node:18-alpine

WORKDIR /app

# Enable Next.js telemetry collection to false to reduce unnecessary logs
ENV NEXT_TELEMETRY_DISABLED 1

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
