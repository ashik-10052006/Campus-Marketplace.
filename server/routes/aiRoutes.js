const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  handleGenerateDescription,
  handleImproveDescription,
  handleSuggestCategory,
  handleListingAssistant,
  handleMessageSuggestions,
  handleClassifyReport,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Dedicated rate limiter for AI operations to prevent API abuse
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 40, // 40 AI queries per 10 minutes
  message: {
    success: false,
    message: 'Too many AI requests. Please wait a few minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);
router.use(aiLimiter);

router.post('/generate-description', handleGenerateDescription);
router.post('/improve-description', handleImproveDescription);
router.post('/suggest-category', handleSuggestCategory);
router.post('/listing-assistant', handleListingAssistant);
router.post('/message-suggestions', handleMessageSuggestions);
router.post('/classify-report', handleClassifyReport);

module.exports = router;
