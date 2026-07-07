const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const usersController = require('../controllers/usersController');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validations/schemas');

// All routes in this file require admin
router.use(requireAdmin);

router.get('/', catchAsync(usersController.getUsers));

router.post('/', validate(createUserSchema), catchAsync(usersController.createUser));

router.patch('/:id', validate(updateUserSchema), catchAsync(usersController.updateUser));

router.delete('/:id', catchAsync(usersController.deleteUser));

module.exports = router;
