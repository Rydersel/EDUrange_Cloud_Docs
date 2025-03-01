# docker buildx build --platform linux/amd64 -t registry.rydersel.cloud/docs . --push

FROM node:18.18.0

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
