require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// ========== MODELS ==========
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  purchasedCourses: [
    {
      courseId: Number,
      orderId: String,
      paymentId: String,
      purchasedAt: Date
    }
  ]
});

const courseSchema = new mongoose.Schema({
  id: Number,
  slug: String,
  title: String,
  description: String,
  price: Number,
  originalPrice: Number,
  level: String,
  duration: String,
  lessons: Number,
  projects: Number,
  rating: Number,
  students: Number,
  thumbnail: String,
  introVideoUrl: String,
  modules: Array
});

const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);

// ========== AUTH HELPERS ==========
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// ========== AUTH ROUTES ==========
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash, purchasedCourses: [] });
    const token = generateToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// ========== COURSES ROUTES ==========
app.get('/api/courses', async (req, res) => {
  const courses = await Course.find({});
  res.json(courses);
});

app.get('/api/courses/:id', async (req, res) => {
  const course = await Course.findOne({ id: Number(req.params.id) });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json(course);
});

// Protect course content
app.get('/api/courses/:id/content', authMiddleware, async (req, res) => {
  const courseId = Number(req.params.id);
  const course = await Course.findOne({ id: courseId });
  if (!course) return res.status(404).json({ message: 'Course not found' });

  const user = await User.findById(req.user.id);
  const hasAccess = user.purchasedCourses.some(c => c.courseId === courseId);
  if (!hasAccess) return res.status(403).json({ message: 'You do not own this course' });

  // Return full modules with video URLs
  res.json({ modules: course.modules });
});

// ========== RAZORPAY ==========
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.post('/api/payment/create-order', authMiddleware, async (req, res) => {
  try {
    const { courseIds } = req.body; // e.g. [1,3]
    const courses = await Course.find({ id: { $in: courseIds } });
    const amount = courses.reduce((sum, c) => sum + c.price, 0);

    const options = {
      amount: amount * 100,
      currency: 'INR',
      receipt: 'receipt_' + Date.now()
    };

    const order = await razorpay.orders.create(options);
    res.json({ order, courses, amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create order' });
  }
});

// Razorpay verification
const crypto = require('crypto');

app.post('/api/payment/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseIds } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    // Payment verified – update user
    const user = await User.findById(req.user.id);
    const now = new Date();
    courseIds.forEach(courseId => {
      if (!user.purchasedCourses.some(c => c.courseId === courseId)) {
        user.purchasedCourses.push({
          courseId,
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          purchasedAt: now
        });
      }
    });
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port', PORT));
