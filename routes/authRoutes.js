import express from 'express';
import { register, login, updateDetails, updatePassword, deleteUser } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/imageUpload.js';
import { uploadAvatar } from '../controllers/authController.js';
const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// สองเส้นทางนี้ต้องผ่านการตรวจ Token (protect) ก่อน
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.delete('/profile', protect, deleteUser);

router.put('/avatar', protect, upload.single('avatar'), uploadAvatar);
export default router;