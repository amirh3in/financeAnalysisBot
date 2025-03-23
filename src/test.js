const io = require('socket.io-client');
const socket = io('http://localhost:3000', {
  path: '/hub',
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('connect_error', (err) => {
  console.log('Connection error:', err);
});
