const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Product = require('../models/Product');

// @desc    Start or find existing conversation for a product
// @route   POST /api/messages/conversations
// @access  Private
const startConversation = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Owner cannot start a conversation with themselves
    if (product.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot initiate a conversation on your own listing',
      });
    }

    // Check if conversation already exists between this buyer and seller for this product
    let conversation = await Conversation.findOne({
      buyer: req.user._id,
      seller: product.seller,
      product: product._id,
    })
      .populate('buyer', 'name profileImage email phone')
      .populate('seller', 'name profileImage email phone')
      .populate('product', 'name price imageUrl status');

    if (!conversation) {
      conversation = await Conversation.create({
        buyer: req.user._id,
        seller: product.seller,
        product: product._id,
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('buyer', 'name profileImage email phone')
        .populate('seller', 'name profileImage email phone')
        .populate('product', 'name price imageUrl status');
    }

    res.status(200).json({
      success: true,
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all conversations for current user
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }],
    })
      .populate('buyer', 'name profileImage')
      .populate('seller', 'name profileImage')
      .populate('product', 'name price imageUrl status')
      .sort({ lastMessageAt: -1 })
      .lean();

    // Attach unread messages count for current user
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: req.user._id },
          isRead: false,
        });
        return {
          ...conv,
          unreadCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { conversations: conversationsWithUnread },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single conversation with its messages
// @route   GET /api/messages/conversations/:id
// @access  Private (Participants only)
const getConversationById = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('buyer', 'name email phone profileImage')
      .populate('seller', 'name email phone profileImage')
      .populate('product', 'name price imageUrl status');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Strict participant authorization: changing URL must NEVER expose another user's chat
    const buyerId = conversation.buyer
      ? (conversation.buyer._id ? conversation.buyer._id.toString() : conversation.buyer.toString())
      : '';
    const sellerId = conversation.seller
      ? (conversation.seller._id ? conversation.seller._id.toString() : conversation.seller.toString())
      : '';
    const userId = req.user._id.toString();

    const isBuyer = buyerId === userId;
    const isSeller = sellerId === userId;

    if (!isBuyer && !isSeller && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a participant in this conversation',
      });
    }

    // Mark messages sent by the other party as read
    await Message.updateMany(
      {
        conversation: conversation._id,
        sender: { $ne: req.user._id },
        isRead: false,
      },
      { isRead: true }
    );

    const messages = await Message.find({ conversation: conversation._id })
      .populate('sender', 'name profileImage')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message within a conversation
// @route   POST /api/messages/conversations/:id/messages
// @access  Private (Participants only)
const sendMessage = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty' });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const buyerId = conversation.buyer
      ? (conversation.buyer._id ? conversation.buyer._id.toString() : conversation.buyer.toString())
      : '';
    const sellerId = conversation.seller
      ? (conversation.seller._id ? conversation.seller._id.toString() : conversation.seller.toString())
      : '';
    const userId = req.user._id.toString();

    const isBuyer = buyerId === userId;
    const isSeller = sellerId === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a participant in this conversation',
      });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text: text.trim(),
    });

    conversation.lastMessage = text.trim();
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate(
      'sender',
      'name profileImage'
    );

    res.status(201).json({
      success: true,
      data: { message: populatedMessage },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark specific message as read
// @route   PATCH /api/messages/:id/read
// @access  Private
const markMessageRead = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.isRead = true;
    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message marked as read',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startConversation,
  getConversations,
  getConversationById,
  sendMessage,
  markMessageRead,
};
