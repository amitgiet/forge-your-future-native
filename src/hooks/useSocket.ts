import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, getAuthToken } from '@/lib/api';

export const useSocket = (userId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const socketURL = API_BASE_URL || 'http://localhost:5002';

    socketRef.current = io(socketURL, {
      transports: ['websocket', 'polling'],
      auth: {
        token: getAuthToken(),
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', userId);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const joinChat = (chatId: string) => {
    socketRef.current?.emit('join_chat', chatId);
  };

  const leaveChat = (chatId: string) => {
    socketRef.current?.emit('leave_chat', chatId);
  };

  const sendMessage = (chatId: string, text: string) => {
    socketRef.current?.emit('send_message', { chatId, text });
  };

  const sendTyping = (chatId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { chatId, isTyping });
  };

  const markAsRead = (chatId: string) => {
    socketRef.current?.emit('mark_read', { chatId });
  };

  const notifyFriendRequestSent = (toUserId: string, fromUser: any) => {
    socketRef.current?.emit('friend_request_sent', { toUserId, fromUser });
  };

  const notifyFriendRequestAccepted = (toUserId: string, user: any) => {
    socketRef.current?.emit('friend_request_accepted', { toUserId, user });
  };

  const notifyFriendsUpdated = (uid: string) => {
    socketRef.current?.emit('friends_updated', { userId: uid });
  };

  const onNewMessage = (callback: (message: any) => void) => {
    socketRef.current?.on('new_message', callback);
    return () => { socketRef.current?.off('new_message', callback); };
  };

  const onUserTyping = (callback: (data: { userId: string; isTyping: boolean }) => void) => {
    socketRef.current?.on('user_typing', callback);
    return () => { socketRef.current?.off('user_typing', callback); };
  };

  const onUserOnline = (callback: (data: { userId: string }) => void) => {
    socketRef.current?.on('user_online', callback);
    return () => { socketRef.current?.off('user_online', callback); };
  };

  const onFriendRequestReceived = (callback: (data: any) => void) => {
    socketRef.current?.on('friend_request_received', callback);
    return () => { socketRef.current?.off('friend_request_received', callback); };
  };

  const onFriendRequestAccepted = (callback: (data: any) => void) => {
    socketRef.current?.on('friend_request_accepted', callback);
    return () => { socketRef.current?.off('friend_request_accepted', callback); };
  };

  const onFriendsListUpdated = (callback: (data: any) => void) => {
    socketRef.current?.on('friends_list_updated', callback);
    return () => { socketRef.current?.off('friends_list_updated', callback); };
  };

  const onMessagesRead = (callback: (data: any) => void) => {
    socketRef.current?.on('messages_read', callback);
    return () => { socketRef.current?.off('messages_read', callback); };
  };

  return {
    socket: socketRef.current,
    connected,
    joinChat,
    leaveChat,
    sendMessage,
    sendTyping,
    markAsRead,
    notifyFriendRequestSent,
    notifyFriendRequestAccepted,
    notifyFriendsUpdated,
    onNewMessage,
    onUserTyping,
    onUserOnline,
    onFriendRequestReceived,
    onFriendRequestAccepted,
    onFriendsListUpdated,
    onMessagesRead,
  };
};
