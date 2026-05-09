const express = require('express');
const path = require('path');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });
const memoryUpload = multer({ storage: multer.memoryStorage() });

router.post('/availability', auth, userController.toggleAvailability);
router.post('/sports', auth, userController.addSport);
router.get('/sports', auth, userController.getAllSports);
router.delete('/sports/:sportId', auth, userController.removeSport);
router.put('/profile', auth, userController.updateProfile);
router.post('/avatar', auth, upload.single('avatar'), userController.uploadAvatar);
router.post('/analyze-photo', auth, memoryUpload.single('photo'), userController.analyzeProfilePhoto);

module.exports = router;
