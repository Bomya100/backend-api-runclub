# 1. เลือก Base Image เป็น Node.js เวอร์ชั่นล่าสุดแบบเบา (Alpine)
FROM node:24.14.0-alpine

# 2. กำหนดโฟลเดอร์ทำงานข้างใน Docker
WORKDIR /app

# 3. ก๊อปปี้ไฟล์ package.json มาก่อนเพื่อติดตั้ง Library
COPY package*.json ./

# 4. ติดตั้ง Library ทั้งหมด
RUN npm install

# 5. ก๊อปปี้โค้ดทั้งหมดในโปรเจกต์ของเราเข้าไป (ยกเว้นตัวที่อยู่ใน .dockerignore)
COPY . .

# 6. เปิดพอร์ต (สมมติว่าคุณใช้พอร์ต 5000)
EXPOSE 5000

# 7. คำสั่งรันแอปพลิเคชัน
CMD ["npm", "start"]