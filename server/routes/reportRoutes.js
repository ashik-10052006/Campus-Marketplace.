const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  updateReportStatus,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const { validateReport } = require('../middleware/validationMiddleware');

router.post('/', protect, validateReport, createReport);
router.get('/', protect, adminOnly, getReports);
router.patch('/:id/status', protect, adminOnly, updateReportStatus);

module.exports = router;
