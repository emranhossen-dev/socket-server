const io = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000';
const ROOM_ID = 'integration-test-room';

function createClient(name) {
  const socket = io(SOCKET_URL, { reconnection: false });

  socket.on('connect', () => {
    console.log(`${name} connected:`, socket.id);
    socket.emit('join_room', ROOM_ID);
  });

  socket.on('receive_message', (data) => {
    console.log(`${name} received message:`, data);
  });

  socket.on('connect_error', (err) => {
    console.error(`${name} connect_error:`, err.message);
  });

  return socket;
}

async function runTest() {
  const c1 = createClient('ClientA');
  const c2 = createClient('ClientB');

  // wait for both to connect
  await new Promise((res) => setTimeout(res, 1000));

  console.log('ClientA sending message to room...');
  c1.emit('send_message', {
    room_id: ROOM_ID,
    sender_id: 'clientA',
    content: 'Hello from ClientA',
    image_url: null,
    created_at: new Date().toISOString(),
  });

  // wait to observe messages
  await new Promise((res) => setTimeout(res, 2000));

  c1.disconnect();
  c2.disconnect();

  console.log('Test complete.');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
});
