import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ServerAddress } from '../../config';

const socket = io(ServerAddress);

const VideoChat = () => {
    const [roomId, setRoomId] = useState(null);
    const [status, setStatus] = useState('');
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);

    useEffect(() => {
        const setupSocketListeners = () => {
            socket.on('startChat', ({ roomId }) => {
                setRoomId(roomId);
                setStatus('Đã tìm được đối thủ, bắt đầu thiết lập kết nối...');
                startVideoChat();
            });

            socket.on('videoSignal', async ({ sender, signal }) => {
                if (peerConnection.current) {
                    if (signal.type === 'offer') {
                        await peerConnection.current.setRemoteDescription(
                            new RTCSessionDescription(signal)
                        );
                        const answer = await peerConnection.current.createAnswer();
                        await peerConnection.current.setLocalDescription(answer);
                        socket.emit('videoSignal', { roomId, signal: answer });
                    } else if (signal.type === 'answer') {
                        await peerConnection.current.setRemoteDescription(
                            new RTCSessionDescription(signal)
                        );
                    } else if (signal.candidate) {
                        await peerConnection.current.addIceCandidate(
                            new RTCIceCandidate(signal)
                        );
                    }
                }
            });

            socket.on('endChat', endVideoChat);
        };

        const startLocalStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                localVideoRef.current.srcObject = stream;
            } catch (err) {
                console.error('Lỗi truy cập camera/micro:', err);
                alert('Vui lòng cấp quyền truy cập camera/micro để sử dụng.');
            }
        };

        setupSocketListeners();
        startLocalStream();

        return () => {
            socket.disconnect();
            if (peerConnection.current) peerConnection.current.close();
        };
    }, []);

    const handleJoinQueue = () => {
        setStatus('Đang tìm kiếm đối thủ...');
        socket.emit('joinQueue');
    };

    const startVideoChat = async () => {
        const localStream = localVideoRef.current.srcObject;

        peerConnection.current = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        localStream.getTracks().forEach((track) =>
            peerConnection.current.addTrack(track, localStream)
        );

        peerConnection.current.ontrack = (event) => {
            console.log('Đã nhận track:', event);
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Gửi ICE candidate:", event.candidate);
                socket.emit('videoSignal', { roomId, signal: event.candidate });
            }
        };

        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);

        console.log("Gửi offer:", offer);
        socket.emit('videoSignal', { roomId, signal: offer });
    };

    const endVideoChat = () => {
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        localVideoRef.current.srcObject = null;
        remoteVideoRef.current.srcObject = null;
        setRoomId(null);
        setStatus('Đã kết thúc chat.');
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Video Chat</h1>
            <p className="text-gray-600">{status}</p>
            <div className="flex">
                <video ref={localVideoRef} autoPlay muted className="w-1/2 border" />
                <video ref={remoteVideoRef} autoPlay className="w-1/2 border" />
            </div>
            {roomId ? (
                <button onClick={endVideoChat} className="bg-red-500 text-white px-4 py-2 mt-4">
                    Kết thúc
                </button>
            ) : (
                <button onClick={handleJoinQueue} className="bg-blue-500 text-white px-4 py-2 mt-4">
                    Tìm đối thủ
                </button>
            )}
        </div>
    );
};

export default VideoChat;
