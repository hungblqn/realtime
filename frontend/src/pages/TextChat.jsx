import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { BEAddress } from '../../../backend/config';

const socket = io(BEAddress);

const TextChat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [roomId, setRoomId] = useState(null);
    const [status, setStatus] = useState(''); // Trạng thái tìm kiếm hoặc chat

    useEffect(() => {
        // Lắng nghe sự kiện từ server
        socket.on('waiting', (msg) => setStatus(msg));
        socket.on('startChat', ({ roomId }) => {
            setRoomId(roomId);
            setStatus('Đã kết nối với đối thủ.');
        });
        socket.on('receiveMessage', ({ sender, message }) => {
            // Xác định tên người gửi
            const senderName = sender === socket.id ? 'Me' : 'Anonymous';  // Nếu là người hiện tại thì "Me", còn lại là "Anonymous"
            setMessages((prev) => [...prev, { sender: senderName, message }]);
        });
        socket.on('endChat', () => {
            setMessages([]);  // Xoá tin nhắn khi kết thúc chat
            setRoomId(null);
            setStatus('Đối thủ đã rời phòng.');
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleSendMessage = () => {
        if (input.trim() && roomId) {
            // Gửi tin nhắn tới server
            socket.emit('sendMessage', { roomId, message: input });
    
            // Không thêm tin nhắn vào messages ngay lập tức, đợi server phản hồi
            setInput('');
        }
    };
    

    const handleEndChat = () => {
        if (roomId) {
            socket.emit('leaveRoom', roomId);
            setMessages([]);  // Xoá tin nhắn khi kết thúc trò chuyện
            setRoomId(null);
            setStatus('Bạn đã rời phòng.');
        }
    };

    const handleJoinQueue = () => {
        socket.emit('joinQueue');
        setStatus('Đang tìm kiếm đối thủ...');
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Text Chat</h1>
            <p className="text-gray-500">{status}</p>
            {roomId ? (
                <>
                    <div className="border p-2 h-64 overflow-y-scroll">
                        {messages.map((msg, index) => (
                            <p key={index}>
                                <strong>{msg.sender}:</strong> {msg.message}
                            </p>
                        ))}
                    </div>
                    <div className="mt-2 flex">
                        <input
                            className="border p-2 flex-1"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button
                            className="bg-blue-500 text-white px-4"
                            onClick={handleSendMessage}
                        >
                            Gửi
                        </button>
                        <button
                            className="bg-red-500 text-white px-4 ml-2"
                            onClick={handleEndChat}
                        >
                            Kết thúc
                        </button>
                    </div>
                </>
            ) : (
                <button
                    className="bg-green-500 text-white px-4 py-2 mt-4"
                    onClick={handleJoinQueue}
                >
                    Tìm đối thủ
                </button>
            )}
        </div>
    );
};

export default TextChat;
