FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

# Copy config files
COPY vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY tailwind.config.ts postcss.config.js index.html ./
COPY public ./public
COPY src ./src

# Create .env for development
RUN echo "VITE_API_BASE_URL=http://localhost:8000/api" > .env

EXPOSE 8080

# Run Vite dev server with HMR enabled
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
