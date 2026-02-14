import io from 'socket.io-client';

// Change this URL if your backend is deployed elsewhere
export const BACKEND_URL = 'http://127.0.0.1:5000'; 
export const socket = io(BACKEND_URL);