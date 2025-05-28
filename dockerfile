# docker buildx build --platform linux/amd64 -t registry.edurange.cloud/edurange/docs . --push

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
