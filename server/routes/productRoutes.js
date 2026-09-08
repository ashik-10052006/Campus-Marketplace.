const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  markProductSold,
  getMyListings,
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { validateProduct } = require('../middleware/validationMiddleware');

// Public catalog
router.get('/', getProducts);

// User's own listings (MUST be defined before /:id)
router.get('/my-listings', protect, getMyListings);

// Create product
router.post('/', protect, upload.single('image'), validateProduct, createProduct);

// Specific product operations
router.get('/:id', getProductById);
router.put('/:id', protect, upload.single('image'), updateProduct);
router.delete('/:id', protect, deleteProduct);
router.patch('/:id/sold', protect, markProductSold);

module.exports = router;
