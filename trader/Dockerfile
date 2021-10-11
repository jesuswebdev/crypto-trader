FROM node:14.18-alpine3.12
WORKDIR /usr/src/app
COPY ./trader/package*.json ./
RUN npm install --only=production
ENV NODE_ENV production
COPY ./trader/ ./
CMD ["npm", "start", "--prefix", "./trader"]