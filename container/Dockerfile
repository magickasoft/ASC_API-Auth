FROM node:6-alpine

ADD asc.tar.gz /asc

WORKDIR /asc

RUN npm install --production

ENV NODE_ENV="production" MONGODB_HOST="mongodb" MONGODB_NAME="ASC"

ENV JWT_SECRET="" FACEBOOK_APP_ID="" FACEBOOK_APP_SECRET=""

EXPOSE 3100

ENTRYPOINT ["node"]
CMD ["server/index.js"]
