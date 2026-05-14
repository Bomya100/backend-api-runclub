import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import runRoutes from './routes/runRoutes.js';

dotenv.config(); // โหลดค่าจากไฟล์ .env

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // อนุญาตให้หน้าบ้าน (Frontend) ยิง API เข้ามาได้
app.use(express.json()); // สั่งให้ Express อ่านข้อมูลแบบ JSON ที่ส่งมาทาง Body ได้

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB (Runclub DB)'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// --- API Routes (เดี๋ยวเรามาเพิ่มตรงนี้) ---
// --- API Routes ---

app.use('/api/runs', runRoutes); // ทุกอย่างที่เกี่ยวกับวิ่งจะเริ่มด้วย /api/runs

app.use('/api/auth', authRoutes);
// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});