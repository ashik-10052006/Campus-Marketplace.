const express = require('express');
const router = express.Router();
const {
  startConversation,
  getConversations,
  getConversationById,
  sendMessage,
  markMessageRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/conversations', protect, startConversation);
router.get('/conversations', protect, getConversations);
router.get('/conversations/:id', protect, getConversationById);
router.post('/conversations/:id/messages', protect, sendMessage);
router.patch('/:id/read', protect, markMessageRead);

module.exports = router;
