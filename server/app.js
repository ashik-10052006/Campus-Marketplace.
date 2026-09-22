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
      return callback(null, false);
    },
    credentials: true,
  })
);

// Baseline API Rate Limiter to guard against scraping and DoS flooding
// Excludes GET chat polling so active chatting students on shared campus Wi-Fi are never blocked
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // 1500 requests per IP per window (handles NAT & active campus usage)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' && (req.originalUrl || '').startsWith('/api/messages'),
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

// Clean URLs: permanently redirect any URL ending in .html to its clean version (e.g. /index.html -> /, /products.html -> /products)
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.endsWith('.html')) {
    if (req.path === '/index.html') {
      const query = req.url.slice(req.path.length);
      return res.redirect(301, '/' + (query || ''));
    }
    const cleanPath = req.path.slice(0, -5);
    const query = req.url.slice(req.path.length);
    return res.redirect(301, cleanPath + (query || ''));
  }
  next();
});

// Serve client frontend static files (supports clean URLs without .html)
app.use(express.static(path.join(__dirname, '../client'), { extensions: ['html'] }));

// Serve uploaded assets when local storage is used (dotfiles strictly ignored)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { dotfiles: 'ignore', maxAge: '1d' }));

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

// API routes 404 handler
app.use('/api', notFound);

// Serve custom 404.html page for unmatched non-API client routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../client/404.html'));
});

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
