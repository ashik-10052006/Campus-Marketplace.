const Report = require('../models/Report');
const Product = require('../models/Product');
const { VALID_REPORT_REASONS, VALID_REPORT_STATUSES } = require('../utils/validators');

// @desc    Submit a report on a product listing
// @route   POST /api/reports
// @access  Private (Authenticated students)
const createReport = async (req, res, next) => {
  try {
    const { productId, reason, description } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    if (!reason || !VALID_REPORT_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Reason must be one of: ${VALID_REPORT_REASONS.join(', ')}`,
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Reported product not found' });
    }

    const report = await Report.create({
      product: productId,
      reportedBy: req.user._id,
      reason,
      description: (description || '').trim(),
      status: 'PENDING',
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Administrators will review the listing.',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reports (Admin only)
// @route   GET /api/reports
// @access  Private/Admin
const getReports = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && VALID_REPORT_STATUSES.includes(status)) {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .populate('reportedBy', 'name email phone')
      .populate({
        path: 'product',
        populate: { path: 'seller', select: 'name email' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: {
        reports,
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

// @desc    Update report status (Admin only)
// @route   PATCH /api/reports/:id/status
// @access  Private/Admin
const updateReportStatus = async (req, res, next) => {
  try {
    let { status, removeProduct } = req.body;

    // Handle case if status was passed nested inside an object
    if (typeof status === 'object' && status !== null) {
      if (status.removeProduct !== undefined && removeProduct === undefined) {
        removeProduct = status.removeProduct;
      }
      status = status.status;
    }

    if (typeof status === 'string') {
      status = status.trim().toUpperCase();
    }

    if (!status || !VALID_REPORT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_REPORT_STATUSES.join(', ')}`,
      });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = status;
    await report.save();

    // If admin also elects to remove the offending product
    if (removeProduct === true || removeProduct === 'true') {
      await Product.findByIdAndUpdate(report.product, { status: 'REMOVED' });
    }

    res.status(200).json({
      success: true,
      message: `Report status updated to ${status}`,
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  getReports,
  updateReportStatus,
};
