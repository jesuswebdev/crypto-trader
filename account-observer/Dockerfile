FROM node:14.18-alpine3.12
WORKDIR /usr/src/app
COPY ./account-observer/package*.json ./account-observer/
RUN cd ./account-observer && npm install --only=production
ENV NODE_ENV production
ENV BINANCE_API_URL https://api.binance.com
COPY ./ ./
CMD ["npm", "start", "--prefix", "./account-observer"]