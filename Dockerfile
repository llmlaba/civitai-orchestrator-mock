# Dockerfile
FROM docker.io/library/node:20.19.5-bullseye
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY src ./src
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
