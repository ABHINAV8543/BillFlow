const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const dashboardController = require('../controllers/dashboardController');

router.get('/', catchAsync(dashboardController.getDashboard));

module.exports = router;
