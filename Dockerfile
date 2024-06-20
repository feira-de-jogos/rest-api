FROM node:20

WORKDIR /app
COPY package.json .
COPY servidor.js .
COPY routes/ routes/
RUN npm install --prefix /app

CMD [ "node", "servidor.js" ]
