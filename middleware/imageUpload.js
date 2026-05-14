import multer from 'multer';

// เก็บไฟล์ไว้ใน RAM ชั่วคราวก่อนส่งขึ้น Cloud
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // รับเฉพาะไฟล์รูปภาพ (png, jpg, jpeg)
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('รูปภาพเท่านั้นนะเพื่อน!'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // จำกัดไว้ที่ 2MB (ประหยัดพื้นที่)
});