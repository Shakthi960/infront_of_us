// seed.js
require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('ERROR: Please set MONGO_URI in your environment or .env file');
  process.exit(1);
}

// If you already have a Course model file, you can replace the schema below with:
// const Course = require('./models/course');
const courseSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
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
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);

// Replace the `introVideoUrl` and `thumbnail` values with your real storage URLs (Azure Blob, S3, etc.)
const courses = [
  {
    id: 1,
    slug: "python-programming-masterclass",
    title: "Python Programming Masterclass",
    description: "Learn Python from scratch to advanced level. Build real-world apps and automations.",
    price: 1999,
    originalPrice: 2999,
    level: "beginner",
    duration: "8 weeks",
    lessons: 45,
    projects: 8,
    rating: 4.8,
    students: 320,
    thumbnail: "https://<your-storage>/images/python-course.jpg",
    introVideoUrl: "https://<your-storage>/videos/python-intro-20s.mp4",
    modules: [
      {
        title: "Python Fundamentals",
        lessons: [
          { title: "Introduction to Python", duration: "20 sec", videoUrl: "https://<your-storage>/videos/python/m1-l1-20s.mp4" }
        ]
      }
    ]
  },
  {
    id: 2,
    slug: "java-development-bootcamp",
    title: "Java Development Bootcamp",
    description: "Comprehensive Java course covering OOP, Spring basics and enterprise patterns.",
    price: 2499,
    originalPrice: 3499,
    level: "intermediate",
    duration: "10 weeks",
    lessons: 52,
    projects: 6,
    rating: 4.7,
    students: 185,
    thumbnail: "https://<your-storage>/images/java-course.jpg",
    introVideoUrl: "https://<your-storage>/videos/java-intro-20s.mp4",
    modules: [
      {
        title: "Java Basics",
        lessons: [
          { title: "Java Introduction", duration: "20 sec", videoUrl: "https://<your-storage>/videos/java/m1-l1-20s.mp4" }
        ]
      }
    ]
  },
  {
    id: 3,
    slug: "html5-modern-web",
    title: "HTML5 & Modern Web Development",
    description: "Master HTML5, semantic markup and build responsive, accessible websites.",
    price: 999,
    originalPrice: 1499,
    level: "beginner",
    duration: "4 weeks",
    lessons: 28,
    projects: 5,
    rating: 4.9,
    students: 450,
    thumbnail: "https://<your-storage>/images/html-course.jpg",
    introVideoUrl: "https://<your-storage>/videos/html-intro-20s.mp4",
    modules: [
      {
        title: "HTML Basics",
        lessons: [
          { title: "HTML Structure", duration: "20 sec", videoUrl: "https://<your-storage>/videos/html/m1-l1-20s.mp4" }
        ]
      }
    ]
  },
  {
    id: 4,
    slug: "css3-advanced-styling",
    title: "CSS3 & Advanced Styling Techniques",
    description: "Advanced CSS: Flexbox, Grid, animations and modern responsive patterns.",
    price: 1499,
    originalPrice: 1999,
    level: "intermediate",
    duration: "6 weeks",
    lessons: 35,
    projects: 7,
    rating: 4.8,
    students: 275,
    thumbnail: "https://<your-storage>/images/css-course.jpg",
    introVideoUrl: "https://<your-storage>/videos/css-intro-20s.mp4",
    modules: [
      {
        title: "CSS Fundamentals",
        lessons: [
          { title: "CSS Selectors", duration: "20 sec", videoUrl: "https://<your-storage>/videos/css/m1-l1-20s.mp4" }
        ]
      }
    ]
  },
  {
    id: 5,
    slug: "javascript-complete-guide",
    title: "JavaScript Complete Guide",
    description: "From fundamentals to ES6+, DOM, async programming and tooling.",
    price: 2999,
    originalPrice: 3999,
    level: "advanced",
    duration: "12 weeks",
    lessons: 60,
    projects: 10,
    rating: 4.9,
    students: 195,
    thumbnail: "https://<your-storage>/images/js-course.jpg",
    introVideoUrl: "https://<your-storage>/videos/js-intro-20s.mp4",
    modules: [
      {
        title: "JavaScript Basics",
        lessons: [
          { title: "JS Introduction", duration: "20 sec", videoUrl: "https://<your-storage>/videos/js/m1-l1-20s.mp4" }
        ]
      }
    ]
  }
];

(async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected.');

    console.log('Clearing existing courses...');
    await Course.deleteMany({});

    console.log(`Inserting ${courses.length} courses...`);
    await Course.insertMany(courses, { ordered: true });

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
})();
