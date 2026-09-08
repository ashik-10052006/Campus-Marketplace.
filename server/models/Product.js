const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Product must have a seller'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide product description'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please provide product price'],
      min: [0.01, 'Price must be greater than 0'],
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please specify product category'],
      index: true,
    },
    condition: {
      type: String,
      required: [true, 'Please specify product condition'],
      enum: {
        values: ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'],
        message: 'Condition must be NEW, LIKE_NEW, GOOD, or FAIR',
      },
    },
    imageUrl: {
      type: String,
      required: [true, 'Please provide product image'],
    },
    status: {
      type: String,
      enum: {
        values: ['AVAILABLE', 'SOLD', 'REMOVED'],
        message: 'Status must be AVAILABLE, SOLD, or REMOVED',
      },
      default: 'AVAILABLE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for search, filtering, and sorting
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1, status: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
