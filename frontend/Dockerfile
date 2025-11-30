FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Remove prepare script from package.json before install if it exists, to avoid husky/etc errors in CI/Docker
# Or simply use --ignore-scripts if that's enough, but standard install is usually fine for simple React apps
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
