const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const billsController = require('../controllers/billsController');
const validate = require('../middleware/validate');
const { billSchema } = require('../validations/schemas');

router.get('/', catchAsync(billsController.getBills));

router.get('/new', catchAsync(billsController.getNewBillForm));

router.get('/:id', catchAsync(billsController.getBill));

router.get('/:id/edit', catchAsync(billsController.getEditBillForm));


// API ROUTES (return JSON for AJAX)

router.post('/', validate(billSchema), catchAsync(billsController.createBill));

router.put('/:id', validate(billSchema), catchAsync(billsController.updateBill));

router.delete('/:id', catchAsync(billsController.deleteBill));

module.exports = router;
