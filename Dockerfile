# base image with node & npm
FROM node:24.0.0-alpine

# set working directory
WORKDIR /usr/src/app

COPY package*.json .
RUN npm install

COPY . . 
RUN npm run build

# make sure nodemon, tsc, tsc-alias, consurrenly and everything is installed first
EXPOSE 6969

# start both watcher and server using commad
CMD ["npm", "run", "watch-dev"]
