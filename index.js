const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// ১. এক্সপ্রেস এর জন্য CORS কনফিগারেশন
app.use(cors());

// বেস রুট (Render সার্ভার সচল আছে কিনা তা ব্রাউজারে চেক করার জন্য)
app.get('/', (req, res) => {
  res.send('Luminous Chat Backend is Running Successfully!');
});

const server = http.createServer(app);

// ২. সকেট এর জন্য ডাইনামিক CORS কনফিগারেশন
const io = new Server(server, {
  cors: {
    // এখানে তোমার লোকালহোস্ট এবং গিটহাবে পুশ করার পর পাওয়া Vercel-এর লাইভ ডোমেইন দুটিই অ্যাক্সেস পাবে
    origin: [
      "http://localhost:3000", 
      "https://your-frontend.vercel.app" // 👈 ডিপ্লয় করার পর এখানে তোমার আসল Vercel URL-টি বসিয়ে আরেকবার পুশ করে দিও
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // চ্যাট রুমে জয়েন করা
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  // রিয়েল-টাইম মেসেজ পাঠানো ও ব্রডকাস্ট করা
  socket.on('send_message', async (data) => {
    const { room_id, sender_id, content, image_url, created_at } = data;

    // ১. সুপার ফাস্ট রিলে: সাথে সাথে রুমে থাকা অন্য মেম্বারকে পাঠানো (উইদাউট রিফ্রেশ)
    socket.to(room_id).emit('receive_message', data);

    try {
      // ২. ব্যাকগ্রাউন্ড সিঙ্ক: ডাটাবেজে মেসেজ রাইট করা
      await supabase.from('messages').insert([
        { room_id, sender_id, content, image_url, created_at }
      ]);
    } catch (error) {
      console.error("Database sync failed:", error);
    }
  });

  // লাইভ টাইপিং ইন্ডিকেটর ইভেন্ট
  socket.on('typing', (data) => {
    socket.to(data.room_id).emit('display_typing', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ৩. ডাইনামিক পোর্ট হ্যান্ডলিং (Render বা অন্য যেকোনো প্রডাকশন হোস্টের জন্য)
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Socket server is running on port ${PORT}`));