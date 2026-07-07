const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const billsController = require('../controllers/billsController');
const validate = require('../middleware/validate');
const { billSchema } = require('../validations/schemas');

router.route('/')
    .get(catchAsync(billsController.getBills))
    .post(validate(billSchema), catchAsync(billsController.createBill));


router.get('/new', catchAsync(billsController.getNewBillForm));

router.get('/:id/edit', catchAsync(billsController.getEditBillForm));

router.route('/:id')
    .get(catchAsync(billsController.getBill))
    .put(validate(billSchema), catchAsync(billsController.updateBill))
    .delete(catchAsync(billsController.deleteBill));

module.exports = router;
