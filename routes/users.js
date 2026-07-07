const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const usersController = require('../controllers/usersController');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validations/schemas');

// All routes in this file require admin
router.use(requireAdmin);

router.route('/')
    .get(catchAsync(usersController.getUsers))
    .post(validate(createUserSchema), catchAsync(usersController.createUser));

router.route('/:id')
    .patch(validate(updateUserSchema), catchAsync(usersController.updateUser))
    .delete(catchAsync(usersController.deleteUser));

module.exports = router;
