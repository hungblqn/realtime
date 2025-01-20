import express from 'express';
import cors from 'cors';
import { PORT, mongoDBURL, FEAddress } from './config.js';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);

// Cấu hình CORS cho cả Express và Socket.IO
const corsOptions = {
    origin: [FEAddress],  // FEAddress là địa chỉ frontend
    methods: ['GET', 'POST'],
    credentials: true,  // Cho phép gửi cookies, nếu cần
};

// Cấu hình CORS cho Express
app.use(cors(corsOptions));  // Đảm bảo rằng Express chấp nhận yêu cầu từ frontend

// Cấu hình Socket.IO với CORS
const io = new Server(server, {
    cors: corsOptions,  // Sử dụng cùng một cấu hình CORS cho Socket.IO
});

// Middleware
app.use(bodyParser.json({ limit: '1mb' }));
app.use(cookieParser());

// Kết nối MongoDB
mongoose
    .connect(mongoDBURL)
    .then(() => {
        console.log('Đã kết nối với MongoDB');
    })
    .catch((error) => console.log(error));

// Dữ liệu phòng chat và tin nhắn
let rooms = {}; // Lưu trữ thông tin các phòng và tin nhắn

// Hàng đợi chờ chat
let waitingUser = null;

// Socket.IO events
io.on('connection', (socket) => {
    console.log(`Người dùng kết nối: ${socket.id}`);

    socket.on('joinQueue', () => {
        if (waitingUser) {
            const roomId = `room-${uuidv4()}`;
            socket.join(roomId);
            waitingUser.socket.join(roomId);

            rooms[roomId] = {
                players: [waitingUser.id, socket.id],
                messages: [],
            };

            io.to(roomId).emit('startChat', { roomId });
            console.log(`Phòng chat được tạo: ${roomId}`);
            waitingUser = null;
        } else {
            waitingUser = { id: socket.id, socket };
            socket.emit('waiting', 'Đang tìm kiếm đối thủ...');
        }
    });

    socket.on('sendMessage', ({ roomId, message }) => {
        if (rooms[roomId]) {
            rooms[roomId].messages.push({ sender: socket.id, message });
            io.to(roomId).emit('receiveMessage', { sender: socket.id, message });
        }
    });

    socket.on('leaveRoom', (roomId) => {
        if (rooms[roomId]) {
            io.to(roomId).emit('endChat'); // Thông báo cho cả hai người
            io.socketsLeave(roomId); // Rời phòng
            delete rooms[roomId]; // Xóa phòng khỏi danh sách
            console.log(`Phòng ${roomId} đã bị hủy.`);
        }
    });

    socket.on('videoSignal', ({ roomId, signal }) => {
        socket.to(roomId).emit('videoSignal', { sender: socket.id, signal });
    });

    socket.on('disconnect', () => {
        console.log(`Người dùng ngắt kết nối: ${socket.id}`);
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null;
        }
    });
});

// Khởi chạy server
server.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});
