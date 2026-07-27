# 阿姨考勤 H5 —— 生产镜像（单阶段）
# 构建阶段需要 vite 等 devDependencies，故不裁剪 devDeps。
FROM node:20-alpine

WORKDIR /app

# 先装依赖，利用镜像层缓存
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并构建前端到 dist/
COPY . .
RUN npm run build

# 运行时数据目录（部署时用卷挂到宿主 ./data 持久化）
ENV DATA_FILE=/app/data/records.json
RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 3000

# 复用 package.json 的 start 脚本：cross-env NODE_ENV=production node server/index.js
CMD ["npm", "start"]
