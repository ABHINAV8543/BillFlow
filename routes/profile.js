const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const profileController = require('../controllers/profileController');
const validate = require('../middleware/validate');
const { updateProfileSchema, updateColumnsSchema, updateRecipientFieldsSchema, updateFooterFieldsSchema } = require('../validations/schemas');

router.route('/')
    .get(catchAsync(profileController.getProfile))
    .patch(validate(updateProfileSchema), catchAsync(profileController.updateProfile));

router.put('/columns', validate(updateColumnsSchema), catchAsync(profileController.updateColumns));

router.put('/recipient-fields', validate(updateRecipientFieldsSchema), catchAsync(profileController.updateRecipientFields));

router.put('/footer-fields', validate(updateFooterFieldsSchema), catchAsync(profileController.updateFooterFields));

module.exports = router;
