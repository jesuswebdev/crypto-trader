FROM node:14.18-alpine3.12
WORKDIR /usr/src/app
COPY ./trader/package*.json ./trader/
RUN cd ./trader && npm install --only=production
ENV NODE_ENV production
ENV BINANCE_API_URL https://api.binance.com
COPY ./ ./
CMD ["npm", "start", "--prefix", "./trader"]