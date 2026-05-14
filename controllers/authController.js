import User from '../models/User.js';
import Run from '../models/Run.js';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';


// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });
// @desc    Register user
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, weight, height, age } = req.body;
    console.log("มา");
    const user = await User.create({ name, email, password, weight, height, age });

    // สร้าง Token (ตั๋ว)
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({ success: true, token, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. เช็คว่ากรอกมาครบไหม
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    // 2. หา User (และต้อง .select('+password') เพื่อดึงรหัสที่แฮชไว้ออกมา เพราะเราตั้ง select: false ไว้ใน Model)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    // 3. ใช้ Method ที่เราเขียนไว้ใน Model เพื่อเทียบพาสเวิร์ด
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    // 4. ถ้าผ่านหมด สร้าง Token แจก!
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({ success: true, token, data: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private (ต้อง Login ก่อน)

export const updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      weight: req.body.weight,
      height: req.body.height,
      age: req.body.age
    };

    // อัปเดตข้อมูล (ใช้ findByIdAndUpdate เพื่อความรวดเร็วเพราะไม่ต้องกังวลเรื่อง Password Hook)
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true, // คืนค่าข้อมูลใหม่กลับมา
      runValidators: true // ตรวจสอบความถูกต้องของข้อมูล (เช่น RegEx อีเมล)
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1. หา User (ต้องดึง Password ออกมาเทียบ)
    const user = await User.findById(req.user.id).select('+password');

    // 2. เช็คว่ารหัสผ่านปัจจุบัน "ถูกต้อง" ไหม
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    // 3. ตั้งรหัสผ่านใหม่
    user.password = newPassword;
    await user.save(); // ตัว pre('save') ใน Model จะจัดการแฮชรหัสใหม่ให้เองอัตโนมัติ!

    // 4. ส่ง Token ชุดใหม่กลับไป (หรือจะแค่บอกว่าสำเร็จก็ได้)
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ success: true, token, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Delete user & runs
// @route   DELETE /api/auth/profile
// @access  Private
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    // --- Trick สายเทพ: ลบข้อมูลการวิ่งของ User คนนี้ทิ้งไปด้วย (Cascade Delete) ---
    // เพื่อไม่ให้มีข้อมูลขยะค้างในระบบ
    await Run.deleteMany({ user: user._id });

    await user.deleteOne(); // ลบ User

    res.status(200).json({ success: true, message: 'ลบบัญชีผู้ใช้และข้อมูลการวิ่งเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    // console.log(process.env.CLOUDINARY_API_KEY);
    // console.log(process.env.CLOUDINARY_API_SECRET);
    if (!req.file) return res.status(400).json({ message: 'ไหนล่ะรูป?' });

    // ท่าส่งไฟล์จาก Memory ไปยัง Cloudinary
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream((error, result) => {
          if (result) resolve(result);
          else reject(error);
        });
        // console.log(stream)
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req);

    // เซฟ URL ของรูปลงในฐานข้อมูล User
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: result.secure_url },
      { new: true }
    );

    res.status(200).json({ success: true, avatar: user.avatar, message: 'อัปโหลดรูปโปรไฟล์สำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};