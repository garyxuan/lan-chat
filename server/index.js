const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);

// 初始化必要的目录
async function initDirectories() {
    const dirs = [
        path.join(__dirname, 'uploads'),
        path.join(__dirname, 'public/avatars'),
        path.join(__dirname, 'public/images'),
        path.join(__dirname, 'data')
    ];

    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }
}

// 确保所有目录存在
initDirectories();

// 配置静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// 配置 multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        // 解码文件名
        const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + decodedName)
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 限制文件大小为 50MB
    }
});

// 添加头像存储配置
const avatarStorage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const dir = path.join(__dirname, 'public/avatars');
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        try {
            const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + decodedName);
        } catch (error) {
            console.error('文件名处理错误:', error);
            cb(error);
        }
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制头像大小为 5MB
    }
});

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 文件上传路由
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '没有文件被上传' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// 添加文件消息类型
app.post('/upload-file', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '没有文件被上传' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    // 解码文件名
    const decodedName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    res.json({
        url: fileUrl,
        filename: decodedName,
        size: req.file.size
    });
});

// 修改头像上传路由
app.post('/upload-avatar', avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            console.error('没有文件被上传');
            return res.status(400).json({ error: '没有文件被上传' });
        }

        const fileUrl = `/public/avatars/${req.file.filename}`;
        console.log('头像上传成功:', fileUrl);
        res.json({ url: fileUrl });
    } catch (error) {
        console.error('头像上传错误:', error);
        res.status(500).json({ error: '头像上传失败', details: error.message });
    }
});

// Socket.IO 配置
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 存储在线用户
const onlineUsers = new Map();

// 添加用户数据文件路径
const USER_DATA_FILE = path.join(__dirname, 'data', 'users.json');

// 加载用户数据
async function loadUserProfiles() {
    try {
        const data = await fs.readFile(USER_DATA_FILE, 'utf8');
        return new Map(JSON.parse(data));
    } catch (error) {
        console.log('No existing user data found, starting with empty data');
        return new Map();
    }
}

// 保存用户数据
async function saveUserProfiles(profiles) {
    try {
        const data = JSON.stringify(Array.from(profiles.entries()));
        await fs.writeFile(USER_DATA_FILE, data, 'utf8');
    } catch (error) {
        console.error('Error saving user profiles:', error);
    }
}

// 初始化
let userProfiles;
(async () => {
    await initDirectories();
    userProfiles = await loadUserProfiles();
})();

io.on('connection', (socket) => {
    console.log('用户连接成功:', socket.id);

    // 用户登录
    socket.on('login', async (username, userId) => {
        let userProfile;

        if (userId && userProfiles.has(userId)) {
            userProfile = userProfiles.get(userId);
            userProfile.username = username;
        } else {
            userId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            userProfile = {
                id: userId,
                username: username,
                avatar: '/public/images/default-avatar.png'
            };
            userProfiles.set(userId, userProfile);
            await saveUserProfiles(userProfiles);  // 保存新用户数据
        }

        onlineUsers.set(socket.id, {
            ...userProfile,
            socketId: socket.id
        });

        socket.emit('userId', userId);
        io.emit('userList', Array.from(onlineUsers.values()));
    });

    // 处理消息
    socket.on('message', (data) => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            io.emit('message', {
                content: data.content,
                from: user.username,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 处理图片消息
    socket.on('image', (data) => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            io.emit('image', {
                imageUrl: data.imageUrl,
                from: user.username,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 处理文件消息
    socket.on('file', (data) => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            io.emit('file', {
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                from: user.username,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 修改头像更新的 socket 处理
    socket.on('updateAvatar', async (avatarUrl) => {
        try {
            const user = onlineUsers.get(socket.id);
            if (user) {
                const newAvatarPath = avatarUrl.replace('http://localhost:3000', '');
                user.avatar = newAvatarPath;

                if (userProfiles.has(user.id)) {
                    userProfiles.get(user.id).avatar = newAvatarPath;
                    await saveUserProfiles(userProfiles);
                    console.log('头像更新成功:', user.username, newAvatarPath);
                }

                onlineUsers.set(socket.id, user);
                io.emit('userList', Array.from(onlineUsers.values()));
            }
        } catch (error) {
            console.error('头像更新错误:', error);
        }
    });

    // 断开连接
    socket.on('disconnect', () => {
        onlineUsers.delete(socket.id);
        io.emit('userList', Array.from(onlineUsers.values()));
    });

    // 更新用户名
    socket.on('updateUsername', async (data) => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            user.username = data.newUsername;
            onlineUsers.set(socket.id, user);

            if (userProfiles.has(user.id)) {
                userProfiles.get(user.id).username = data.newUsername;
                await saveUserProfiles(userProfiles);  // 保存更新后的用户名
            }

            io.emit('userList', Array.from(onlineUsers.values()));
            io.emit('message', {
                content: `${data.oldUsername} 修改昵称为 ${data.newUsername}`,
                from: 'System',
                timestamp: new Date().toISOString()
            });
        }
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 