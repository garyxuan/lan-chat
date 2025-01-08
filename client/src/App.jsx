import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import io from 'socket.io-client';

const COLORS = {
    primary: '#3370ff',
    primaryHover: '#2860e1',
    bg: '#f7f8fa',
    sidebar: '#fff',
    border: '#e5e6eb',
    text: '#1f2329',
    textSecondary: '#646a73',
    selfMessage: '#e8f3ff',
    otherMessage: '#fff',
    hover: '#f2f3f5'
};

const Container = styled.div`
    display: flex;
    height: 100vh;
    background-color: ${COLORS.bg};
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
`;

const Sidebar = styled.div`
    width: ${props => props.width}px;
    min-width: 280px;
    max-width: 560px;
    background-color: ${COLORS.sidebar};
    border-right: 1px solid ${COLORS.border};
    padding: 16px;
    position: relative;
    display: flex;
    flex-direction: column;

    h2 {
        font-size: 16px;
        color: ${COLORS.text};
        margin: 0 0 16px 0;
        padding: 0 8px;
    }
`;

const ChatArea = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
`;

const MessageList = styled.div`
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    background-color: ${COLORS.bg};
    display: flex;
    flex-direction: column;
`;

const MessageContainer = styled.div`
    display: flex;
    flex-direction: ${props => props.isSelf ? 'row-reverse' : 'row'};
    align-items: flex-start;
    margin-bottom: 16px;
    gap: 12px;
`;

const Message = styled.div`
    padding: 12px 16px;
    background-color: ${props => props.isSelf ? COLORS.selfMessage : COLORS.otherMessage};
    color: ${COLORS.text};
    border-radius: 12px;
    max-width: 70%;
    width: fit-content;
    word-wrap: break-word;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    
    strong {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
        color: ${COLORS.textSecondary};
    }
`;

const Time = styled.span`
    font-size: 12px;
    color: #8e8e93;
    padding-top: 4px;
`;

const InputArea = styled.div`
    padding: 16px;
    background-color: ${COLORS.sidebar};
    border-top: 1px solid ${COLORS.border};
    display: flex;
    gap: 12px;
    align-items: center;
`;

const Input = styled.input`
    flex: 1;
    padding: 8px 12px;
    border: 1px solid ${COLORS.border};
    border-radius: 8px;
    font-size: 14px;
    background-color: ${COLORS.bg};

    &:focus {
        outline: none;
        border-color: ${COLORS.primary};
        box-shadow: 0 0 0 2px rgba(51, 112, 255, 0.1);
    }
`;

const Button = styled.button`
    padding: 8px 16px;
    background-color: ${COLORS.primary};
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;

    &:hover {
        background-color: ${COLORS.primaryHover};
    }
`;

const UserList = styled.div`
    margin-top: 20px;
`;

const UserItem = styled.div`
    padding: 10px;
    margin-bottom: 8px;
    background-color: white;
    border-radius: 8px;
    cursor: pointer;
    &:hover {
        background-color: #e8e8e8;
    }
`;

const EditableUsername = styled.div`
    padding: 8px 12px;
    margin: 8px 0 16px;
    background-color: transparent;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: ${COLORS.text};
    
    &:hover {
        background-color: ${COLORS.hover};
    }

    strong {
        font-weight: 500;
    }
`;

const CharCount = styled.span`
    font-size: 12px;
    color: ${props => props.isNearLimit ? '#ff3b30' : '#8e8e93'};
    padding: 0 10px;
    align-self: center;
    white-space: nowrap;
`;

const FileMessage = styled.div`
    display: flex;
    flex-direction: column;
    padding: 12px;
    background: ${props => props.isSelf ? COLORS.selfMessage : COLORS.otherMessage};
    border-radius: 8px;
    cursor: ${props => props.uploading ? 'default' : 'pointer'};
    border: 1px solid ${COLORS.border};
    
    &:hover {
        background: ${props => props.uploading ? 'none' : COLORS.hover};
    }
`;

const DropZone = styled.div`
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;

    &.dragging::after {
        content: '释放以发送文件';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 113, 227, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: #0071e3;
        pointer-events: none;
    }
`;

const ProgressBar = styled.div`
    width: 100%;
    height: 4px;
    background-color: ${props => props.isSelf ? 'rgba(255, 255, 255, 0.3)' : '#e8e8e8'};
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;

    .progress {
        height: 100%;
        background-color: ${props => props.isSelf ? '#fff' : '#0071e3'};
        width: ${props => props.progress}%;
        transition: width 0.3s ease;
    }
`;

const DragHandle = styled.div`
    width: 4px;
    cursor: col-resize;
    background-color: transparent;
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    transition: background-color 0.2s;

    &:hover {
        background-color: #d2d2d7;
    }

    &.dragging {
        background-color: #0071e3;
    }
`;

const Avatar = styled.div`
    width: ${props => props.size || '40px'};
    height: ${props => props.size || '40px'};
    border-radius: 50%;
    background-image: url(${props => props.src || '/public/images/default-avatar.png'});
    background-size: cover;
    background-position: center;
    cursor: ${props => props.editable ? 'pointer' : 'default'};
    border: 2px solid transparent;
    transition: opacity 0.2s;
    
    &:hover {
        opacity: ${props => props.editable ? 0.8 : 1};
    }
`;

const UserItemWithAvatar = styled(UserItem)`
    padding: 8px 12px;
    margin-bottom: 4px;
    background-color: transparent;
    border-radius: 6px;
    
    &:hover {
        background-color: ${COLORS.hover};
    }

    .user-info {
        color: ${COLORS.text};
        font-size: 14px;
    }
`;

const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 添加链接识别的正则表达式
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// 添加链接样式组件
const Link = styled.a`
    color: ${COLORS.primary};
    text-decoration: none;
    word-break: break-all;
    
    &:hover {
        text-decoration: underline;
    }
`;

// 添加消息内容处理组件
const MessageContent = ({ content }) => {
    if (!content) return null;

    const parts = content.split(URL_REGEX);
    return (
        <div>
            {parts.map((part, index) => {
                if (part.match(URL_REGEX)) {
                    return (
                        <Link
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            {part}
                        </Link>
                    );
                }
                return part;
            })}
        </div>
    );
};

// 添加图片预览组件样式
const ImagePreview = styled.div`
    cursor: pointer;
    
    img {
        max-width: 300px;
        max-height: 200px;
        border-radius: 8px;
        object-fit: cover;
    }
`;

const ImageModal = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    cursor: zoom-out;

    img {
        max-width: 90vw;
        max-height: 90vh;
        object-fit: contain;
    }
`;

// 添加环境变量配置
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

function App() {
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
    const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('username'));
    const [users, setUsers] = useState([]);
    const messageListRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
    const [userId, setUserId] = useState(() => localStorage.getItem('userId'));
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);

        if (localStorage.getItem('username')) {
            newSocket.emit('login', localStorage.getItem('username'), localStorage.getItem('userId'));
        }

        newSocket.on('userId', (newUserId) => {
            setUserId(newUserId);
            localStorage.setItem('userId', newUserId);
        });

        newSocket.on('message', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        newSocket.on('image', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        newSocket.on('file', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        newSocket.on('userList', (userList) => {
            setUsers(userList);
            const currentUser = userList.find(user => user.id === newSocket.id);
            if (currentUser && currentUser.username !== username) {
                setUsername(currentUser.username);
                localStorage.setItem('username', currentUser.username);
            }
        });

        return () => newSocket.close();
    }, []);

    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (username.trim() && socket) {
            localStorage.setItem('username', username);
            socket.emit('login', username, localStorage.getItem('userId'));
            setIsLoggedIn(true);
        }
    };

    const sendMessage = () => {
        if (currentMessage.trim() && socket) {
            socket.emit('message', { content: currentMessage });
            setCurrentMessage('');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file && socket) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch(`${SERVER_URL}/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                socket.emit('image', {
                    imageUrl: `${SERVER_URL}${data.url}`
                });

                // 重置文件输入框
                e.target.value = '';

            } catch (error) {
                console.error('图片上传失败:', error);
            }
        }
    };

    const handleUsernameEdit = () => {
        setIsEditing(true);
        setNewUsername(username);
    };

    const handleUsernameUpdate = (e) => {
        e.preventDefault();
        if (newUsername.trim() && socket && newUsername !== username) {
            socket.emit('updateUsername', { oldUsername: username, newUsername: newUsername });
        }
        setIsEditing(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (file && socket) {
            const uploadId = Date.now().toString();
            // 创建一个临时消息显示上传进度
            const tempMessage = {
                id: uploadId,
                from: username,
                timestamp: new Date().toISOString(),
                fileName: file.name,
                fileSize: file.size,
                uploading: true,
                progress: 0
            };
            setMessages(prev => [...prev, tempMessage]);

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`${SERVER_URL}/upload-file`, {
                    method: 'POST',
                    body: formData,
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(prev => ({
                            ...prev,
                            [uploadId]: progress
                        }));
                    }
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                // 移除临时消息
                setMessages(prev => prev.filter(msg => msg.id !== uploadId));
                // 发送实际文件消息
                socket.emit('file', {
                    fileUrl: `${SERVER_URL}${data.url}`,
                    fileName: data.filename,
                    fileSize: data.size
                });

                e.target.value = '';
            } catch (error) {
                console.error('文件上传失败:', error);
                // 移除临时消息
                setMessages(prev => prev.filter(msg => msg.id !== uploadId));
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (!file) return;

        // 根据文件类型选择上传方式
        const formData = new FormData();
        if (file.type.startsWith('image/')) {
            formData.append('image', file);
            try {
                const response = await fetch(`${SERVER_URL}/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                socket.emit('image', {
                    imageUrl: `${SERVER_URL}${data.url}`
                });
            } catch (error) {
                console.error('图片上传失败:', error);
            }
        } else {
            formData.append('file', file);
            try {
                const response = await fetch(`${SERVER_URL}/upload-file`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                socket.emit('file', {
                    fileUrl: `${SERVER_URL}${data.url}`,
                    fileName: data.filename,
                    fileSize: data.size
                });
            } catch (error) {
                console.error('文件上传失败:', error);
            }
        }
    };

    const handleDragStart = (e) => {
        setIsDraggingSidebar(true);
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const handleDrag = (moveEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            // 限制宽度范围
            if (newWidth >= 280 && newWidth <= 560) {
                setSidebarWidth(newWidth);
            }
        };

        const handleDragEnd = () => {
            setIsDraggingSidebar(false);
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', handleDragEnd);
        };

        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (file && socket) {
            const formData = new FormData();
            formData.append('avatar', file);

            try {
                console.log('开始上传头像:', file.name);
                const response = await fetch(`${SERVER_URL}/upload-avatar`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('头像上传成功:', data.url);
                socket.emit('updateAvatar', `${SERVER_URL}${data.url}`);
                e.target.value = '';
            } catch (error) {
                console.error('头像上传失败:', error);
                // 可以添加一个提示
                alert('头像上传失败: ' + error.message);
            }
        }
    };

    // 添加图片预览组件
    const ImageViewer = ({ src }) => (
        <ImagePreview onClick={() => setPreviewImage(src)}>
            <img src={src} alt="聊天图片" />
        </ImagePreview>
    );

    if (!isLoggedIn) {
        return (
            <Container>
                <form onSubmit={handleLogin} style={{ margin: 'auto', padding: '20px' }}>
                    <Input
                        type="text"
                        placeholder="输入用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <Button type="submit">登录</Button>
                </form>
            </Container>
        );
    }

    return (
        <Container>
            <Sidebar width={sidebarWidth}>
                <h2>在线用户</h2>
                {isEditing ? (
                    <form onSubmit={handleUsernameUpdate}>
                        <Input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            autoFocus
                            onBlur={() => setIsEditing(false)}
                        />
                    </form>
                ) : (
                    <EditableUsername onClick={handleUsernameEdit}>
                        <strong>{username}</strong> (点击修改)
                    </EditableUsername>
                )}
                <UserList>
                    {users
                        .sort((a, b) => {
                            if (a.username === username) return -1;
                            if (b.username === username) return 1;
                            return a.username.localeCompare(b.username);
                        })
                        .map((user) => (
                            <UserItemWithAvatar key={user.id}>
                                <Avatar
                                    src={user.avatar ? `${SERVER_URL}${user.avatar}` : undefined}
                                    editable={user.username === username}
                                    onClick={() => {
                                        if (user.username === username) {
                                            document.getElementById('avatar-upload').click();
                                        }
                                    }}
                                />
                                <div className="user-info">
                                    {user.username} {user.username === username && '(我)'}
                                </div>
                            </UserItemWithAvatar>
                        ))}
                </UserList>
                <DragHandle
                    className={isDraggingSidebar ? 'dragging' : ''}
                    onMouseDown={handleDragStart}
                />
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                    id="avatar-upload"
                />
            </Sidebar>

            <ChatArea>
                <DropZone
                    className={isDragging ? 'dragging' : ''}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <MessageList ref={messageListRef}>
                        {messages.map((msg, index) => (
                            <MessageContainer key={index} isSelf={msg.from === username}>
                                <Avatar
                                    src={users.find(u => u.username === msg.from)?.avatar ?
                                        `${SERVER_URL}${users.find(u => u.username === msg.from)?.avatar}` :
                                        undefined
                                    }
                                    style={{ width: '32px', height: '32px' }}
                                />
                                <Message isSelf={msg.from === username}>
                                    <strong>{msg.from}</strong>
                                    {msg.content ? (
                                        <MessageContent content={msg.content} />
                                    ) : msg.imageUrl ? (
                                        <ImageViewer src={msg.imageUrl} />
                                    ) : msg.fileUrl || msg.uploading ? (
                                        <FileMessage
                                            isSelf={msg.from === username}
                                            uploading={msg.uploading}
                                            onClick={() => !msg.uploading && window.open(msg.fileUrl)}
                                        >
                                            <div className="file-content">
                                                <div className="file-icon">📎</div>
                                                <div className="file-info">
                                                    <div className="file-name">{msg.fileName}</div>
                                                    <div className="file-size">
                                                        {msg.uploading ? '上传中...' : formatFileSize(msg.fileSize)}
                                                    </div>
                                                </div>
                                            </div>
                                            {msg.uploading && (
                                                <ProgressBar
                                                    isSelf={msg.from === username}
                                                    progress={uploadProgress[msg.id] || 0}
                                                >
                                                    <div className="progress" />
                                                </ProgressBar>
                                            )}
                                        </FileMessage>
                                    ) : null}
                                </Message>
                                <Time>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Time>
                            </MessageContainer>
                        ))}
                    </MessageList>

                    <InputArea>
                        <Input
                            type="text"
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="输入消息..."
                            maxLength={2000}
                        />
                        <CharCount isNearLimit={currentMessage.length > 1800}>
                            {currentMessage.length}/2000
                        </CharCount>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                            id="image-upload"
                        />
                        <Button onClick={() => document.getElementById('image-upload').click()}>
                            图片
                        </Button>
                        <input
                            type="file"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            id="file-upload"
                        />
                        <Button onClick={() => document.getElementById('file-upload').click()}>
                            文件
                        </Button>
                        <Button onClick={sendMessage}>发送</Button>
                    </InputArea>
                </DropZone>
            </ChatArea>

            {/* 添加图片预览模态框 */}
            {previewImage && (
                <ImageModal onClick={() => setPreviewImage(null)}>
                    <img
                        src={previewImage}
                        alt="预览图片"
                        onClick={(e) => e.stopPropagation()}
                    />
                </ImageModal>
            )}
        </Container>
    );
}

export default App; 