const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const clientsController = require('../controllers/clientsController');

router.get('/', catchAsync(clientsController.searchClients));

router.get('/:id', catchAsync(clientsController.getClient));

module.exports = router;
