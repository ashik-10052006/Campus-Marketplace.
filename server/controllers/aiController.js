const Category = require('../models/Category');
const Product = require('../models/Product');
const {
  generateProductDescription,
  improveProductDescription,
  suggestCategory,
  listingAssistant,
  getMessageSuggestions,
  classifyReport,
  chatWithAssistant,
} = require('../services/aiService');

// @desc    Generate product description using Claude AI
// @route   POST /api/ai/generate-description
// @access  Private
const handleGenerateDescription = async (req, res, next) => {
  try {
    const { name, category, condition, price } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required for description generation',
      });
    }

    const description = await generateProductDescription({
      name: name.trim(),
      category: category || 'General',
      condition: condition || 'GOOD',
      price: price || 0,
    });

    res.status(200).json({
      success: true,
      message: 'Description generated successfully',
      data: { description },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Improve existing product description using Claude AI
// @route   POST /api/ai/improve-description
// @access  Private
const handleImproveDescription = async (req, res, next) => {
  try {
    const { currentDescription, name, category } = req.body;

    if (!currentDescription || !currentDescription.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a draft description to improve',
      });
    }

    const improvedDescription = await improveProductDescription({
      currentDescription: currentDescription.trim(),
      name: name || '',
      category: category || '',
    });

    res.status(200).json({
      success: true,
      message: 'Description polished successfully',
      data: { description: improvedDescription },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suggest appropriate category using Claude AI
// @route   POST /api/ai/suggest-category
// @access  Private
const handleSuggestCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required for category recommendation',
      });
    }

    const categories = await Category.find({}, 'name');

    const suggestedCategory = await suggestCategory({
      name: name.trim(),
      description: (description || '').trim(),
      availableCategories: categories,
    });

    res.status(200).json({
      success: true,
      message: 'Category suggested successfully',
      data: { category: suggestedCategory },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Smart listing assistant parsing notes into structured listing
// @route   POST /api/ai/listing-assistant
// @access  Private
const handleListingAssistant = async (req, res, next) => {
  try {
    const { rawNotes } = req.body;

    if (!rawNotes || !rawNotes.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter notes about your item',
      });
    }

    const categories = await Category.find({}, 'name');

    const structuredListing = await listingAssistant({
      rawNotes: rawNotes.trim(),
      availableCategories: categories,
    });

    res.status(200).json({
      success: true,
      message: 'Listing details prepared successfully',
      data: { listing: structuredListing },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get contextual message reply suggestions
// @route   POST /api/ai/message-suggestions
// @access  Private
const handleMessageSuggestions = async (req, res, next) => {
  try {
    const { productName, productPrice, conversationContext } = req.body;

    const suggestions = await getMessageSuggestions({
      productName,
      productPrice,
      conversationContext,
    });

    res.status(200).json({
      success: true,
      data: { suggestions },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Classify listing report using Claude AI
// @route   POST /api/ai/classify-report
// @access  Private
const handleClassifyReport = async (req, res, next) => {
  try {
    const { reason, description, productName, productDescription } = req.body;

    const classification = await classifyReport({
      reason,
      description,
      productName,
      productDescription,
    });

    res.status(200).json({
      success: true,
      data: { classification },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Campus AI Assistant interactive conversation
// @route   POST /api/ai/assistant
// @access  Public / Optional Auth
const handleAiAssistant = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Retrieve lightweight contextual data from the marketplace
    let categories = [];
    let sampleProducts = [];
    try {
      [categories, sampleProducts] = await Promise.all([
        Category.find({}, 'name').lean(),
        Product.find({ status: 'AVAILABLE' })
          .populate('category', 'name')
          .select('name price category condition')
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
      ]);
    } catch (dbErr) {
      console.warn('Marketplace context fetch warning:', dbErr.message);
    }

    const catalogContext = {
      categories: categories.map((c) => c.name),
      products: sampleProducts,
    };

    const reply = await chatWithAssistant({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      user: req.user || null,
      catalogContext,
    });

    res.status(200).json({
      success: true,
      data: { reply },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleGenerateDescription,
  handleImproveDescription,
  handleSuggestCategory,
  handleListingAssistant,
  handleMessageSuggestions,
  handleClassifyReport,
  handleAiAssistant,
};
