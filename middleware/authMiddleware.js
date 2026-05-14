import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      // console.log(token)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // console.log(decoded)
      req.user = await User.findById(decoded.id).select('-password');
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'กรุณา Login เพื่อรับ Token ก่อนเข้าใช้งาน' });
  }
}