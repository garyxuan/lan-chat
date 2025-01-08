const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '没有文件被上传' });
    }
    // 返回文件路径
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

module.exports = router; 