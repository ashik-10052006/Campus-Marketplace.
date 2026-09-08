const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Please provide a reason for the report'],
      enum: {
        values: [
          'Spam',
          'Scam',
          'Inappropriate Content',
          'Wrong Information',
          'Duplicate Listing',
          'Other',
        ],
        message: 'Invalid report reason',
      },
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'REVIEWED', 'RESOLVED', 'REJECTED'],
        message: 'Status must be PENDING, REVIEWED, RESOLVED, or REJECTED',
      },
      default: 'PENDING',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
