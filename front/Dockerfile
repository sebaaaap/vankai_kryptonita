# Etapa de compilación
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar configuración de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias usando npm install en lugar de ci para evitar problemas de matching de versiones
# --legacy-peer-deps ayuda si hay conflictos de versiones de React entre librerías
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Construir el sitio estático (Next.js con output: "export")
RUN npm run build

# Etapa final: Servidor web ligero (Nginx)
FROM nginx:alpine

# Copiar los archivos estáticos desde la etapa anterior al directorio que nginx sirve
COPY --from=builder /app/out /usr/share/nginx/html

# Sobrescribir la configuración por defecto de nginx para que Next.js funcione bien con el enrutamiento
RUN echo "server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
