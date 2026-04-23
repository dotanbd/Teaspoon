# Build Stage
# Upgraded to Node 20 to support CustomEvent and latest Vite build features
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine
# Ensure your Vite config outputs to "dist" (standard for Vite)
COPY --from=build /app/dist /usr/share/nginx/html

# Custom Nginx config can be added here if needed, 
# but for a single page app the default is usually fine for a basic start.
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
