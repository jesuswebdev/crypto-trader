FROM node:14.18-alpine3.12
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production
ENV NODE_ENV production
COPY . .
CMD ["npm", "start", "--prefix", "./trader"]