# Frontend Dockerfile
FROM node:18-alpine as builder

# Accept build args
ARG VITE_GEMINI_API_KEY

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy environment file
COPY .env* ./

# Copy source code
COPY . .

# Set environment variable for build
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
