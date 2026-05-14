import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'กรุณาระบุชื่อ'] },
  email: { 
    type: String, 
    required: [true, 'กรุณาระบุอีเมล'], 
    unique: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'รูปแบบอีเมลไม่ถูกต้อง']
  },
  password: { type: String, required: [true, 'กรุณาระบุรหัสผ่าน'], minlength: 6, select: false },
  weight: { type: Number, default: 63 }, // หน่วย kg
  height: { type: Number, default: 165 }, // หน่วย cm
  age: { type: Number, default: 25 },
  avatar: {
    type: String,
    default: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg' // จะใส่รูประบบตั้งต้นไว้เผื่อเขายังไม่อัปโหลดก็ได้ครับ
  }
}, { timestamps: true });

// --- Hook: เข้ารหัส Password ก่อนบันทึก ---
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return ;    
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
});

// --- Method: ตรวจสอบ Password ตอน Login ---
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);