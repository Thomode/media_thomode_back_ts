# Usa una imagen base de Node.js con Puppeteer
FROM node:18-slim

# Instala Puppeteer y Chromium manualmente
RUN apt-get update && apt-get install -y wget gnupg ca-certificates && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    sh -c 'echo "deb [arch=amd64] https://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' && \
    apt-get update && apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Evitar la descarga de Chromium porque ya está instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Define el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de package.json y package-lock.json al contenedor
COPY package*.json ./

# Instala las dependencias del proyecto (NestJS, Puppeteer, y otros)
RUN npm install

# Copia el resto de los archivos de la aplicación
COPY . .

# Compila el código TypeScript de NestJS
RUN npm run build

# Expone el puerto donde correrá la aplicación NestJS (generalmente 3000)
EXPOSE 8000

# Comando para iniciar la aplicación en modo de producción
CMD ["npm", "run", "start"]

