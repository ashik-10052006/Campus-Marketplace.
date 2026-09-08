const Product = require('../models/Product');
const Category = require('../models/Category');
const { uploadImage } = require('../services/storageService');
const { isValidPrice, VALID_CONDITIONS } = require('../utils/validators');

// @desc    Get all products with search, filter, sort, pagination
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      condition,
      minPrice,
      maxPrice,
      status,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const query = {};

    // 1. Status Filter: Default to 'AVAILABLE' unless explicitly requested or admin
    if (status && ['AVAILABLE', 'SOLD', 'REMOVED'].includes(status)) {
      query.status = status;
    } else {
      query.status = 'AVAILABLE';
    }

    // 2. Search query (case-insensitive across name and description)
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { description: regex }];
    }

    // 3. Category Filter (can be category ID or Category name)
    if (category && category !== 'all') {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = category;
      } else {
        const foundCategory = await Category.findOne({
          name: new RegExp(`^${category.trim()}$`, 'i'),
        });
        if (foundCategory) {
          query.category = foundCategory._id;
        }
      }
    }

    // 4. Condition Filter
    if (condition && VALID_CONDITIONS.includes(condition)) {
      query.condition = condition;
    }

    // 5. Price Range Filter
    const hasMin = minPrice !== undefined && minPrice !== '' && !isNaN(Number(minPrice));
    const hasMax = maxPrice !== undefined && maxPrice !== '' && !isNaN(Number(maxPrice));

    if (hasMin || hasMax) {
      query.price = {};
      if (hasMin) {
        query.price.$gte = Number(minPrice);
      }
      if (hasMax) {
        query.price.$lte = Number(maxPrice);
      }
    }

    // 6. Sorting
    let sortOptions = { createdAt: -1 }; // default newest
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'price_asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { price: -1 };
    }

    // 7. Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('seller', 'name email phone profileImage')
      .populate('category', 'name')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name email phone profileImage createdAt')
      .populate('category', 'name description');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new product listing
// @route   POST /api/products
// @access  Private (Students/Admins)
const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, condition } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a product image',
      });
    }

    // Resolve Category if passed as name or id
    let categoryId = category;
    if (!category.match(/^[0-9a-fA-F]{24}$/)) {
      const foundCategory = await Category.findOne({
        name: new RegExp(`^${category.trim()}$`, 'i'),
      });
      if (!foundCategory) {
        return res.status(400).json({
          success: false,
          message: 'Selected category does not exist',
        });
      }
      categoryId = foundCategory._id;
    }

    // Upload image to local disk or Cloudinary
    const imageUrl = await uploadImage(req.file, 'products');

    const product = await Product.create({
      seller: req.user._id, // Strictly use authenticated user
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      category: categoryId,
      condition,
      imageUrl,
      status: 'AVAILABLE',
    });

    const populatedProduct = await Product.findById(product._id)
      .populate('seller', 'name email phone profileImage')
      .populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Product listed successfully',
      data: { product: populatedProduct },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product listing
// @route   PUT /api/products/:id
// @access  Private (Owner or Admin)
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Ownership check: must be the seller or an administrator
    const isOwner = product.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this listing',
      });
    }

    const { name, description, price, category, condition, status } = req.body;

    if (name) product.name = name.trim();
    if (description) product.description = description.trim();
    if (price && isValidPrice(price)) product.price = Number(price);
    if (condition && VALID_CONDITIONS.includes(condition)) product.condition = condition;
    if (status && ['AVAILABLE', 'SOLD', 'REMOVED'].includes(status)) product.status = status;

    if (category) {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        product.category = category;
      } else {
        const foundCategory = await Category.findOne({
          name: new RegExp(`^${category.trim()}$`, 'i'),
        });
        if (foundCategory) {
          product.category = foundCategory._id;
        }
      }
    }

    // If new image uploaded
    if (req.file) {
      const imageUrl = await uploadImage(req.file, 'products');
      product.imageUrl = imageUrl;
    }

    const updatedProduct = await product.save();
    const populated = await Product.findById(updatedProduct._id)
      .populate('seller', 'name email phone profileImage')
      .populate('category', 'name');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product: populated },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete / Soft remove a product
// @route   DELETE /api/products/:id
// @access  Private (Owner or Admin)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const isOwner = product.seller.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove this listing',
      });
    }

    if (isAdmin) {
      // Admins soft-remove to preserve audit history or can hard delete
      product.status = 'REMOVED';
      await product.save();
    } else {
      await Product.findByIdAndDelete(req.params.id);
    }

    res.status(200).json({
      success: true,
      message: 'Product removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark product as sold
// @route   PATCH /api/products/:id/sold
// @access  Private (Owner only)
const markProductSold = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the product seller can mark this item as sold',
      });
    }

    product.status = 'SOLD';
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product marked as sold',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's listings
// @route   GET /api/products/my-listings
// @access  Private
const getMyListings = async (req, res, next) => {
  try {
    const products = await Product.find({ seller: req.user._id })
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { products },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  markProductSold,
  getMyListings,
};
