# Usa una imagen base de Puppeteer que ya incluye la instalación de Chromium
FROM ghcr.io/puppeteer/puppeteer:23.5.3

# Evitar la descarga de Chromium porque ya está en la imagen
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Define el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de package.json y package-lock.json al contenedor
COPY package*.json ./

# Instala las dependencias del proyecto (puede incluir Puppeteer y NestJS)
RUN npm install

# Copia el resto de los archivos de la aplicación
COPY . .

# Compila el código TypeScript de NestJS
RUN npm run build

# Expone el puerto donde correrá la aplicación NestJS (generalmente 3000)
EXPOSE 3000

# Comando para iniciar la aplicación de NestJS
CMD ["npm", "run", "start"]
