const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const messageRoutes = require('./routes/messageRoutes');
const reportRoutes = require('./routes/reportRoutes');
const aiRoutes = require('./routes/aiRoutes');

const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Enable trust proxy for Render and reverse proxies (ensures client IP is accurate for rate limiting)
app.set('trust proxy', 1);

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://images.unsplash.com', 'https://via.placeholder.com'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Hardened CORS configuration with credentials support
const normalizedClientUrl = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.trim().replace(/\/+$/, '')
  : null;

const allowedOrigins = new Set(
  [
    normalizedClientUrl,
    'https://campuscart-xuqs.onrender.com',
    'http://localhost:5000',
    'http://localhost:3000',
  ].filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as same-origin static frontend, mobile apps, curl)
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS policy'));
    },
    credentials: true,
  })
);

// Baseline API Rate Limiter to guard against scraping and DoS flooding
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this network. Please try again in 15 minutes.',
  },
});
app.use('/api', globalApiLimiter);

// Body parsers & cookie parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static uploaded media
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve client frontend static files
app.use(express.static(path.join(__dirname, '../client')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Campus Marketplace API is healthy and operational',
    timestamp: new Date().toISOString(),
  });
});

// For any non-API route that doesn't match a static file, serve 404 or index
app.use('/api', notFound);

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
