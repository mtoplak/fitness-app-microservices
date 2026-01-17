FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN echo "VITE_API_BASE_URL=http://localhost:8000/api" > .env

EXPOSE 8080

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--force"]
