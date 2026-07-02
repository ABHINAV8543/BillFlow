const AppError = require('../utils/AppError');

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    const value = Object.values(err.keyValue)[0];
    const message = `Duplicate field value: '${value}'. Please use another value!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
    error.message = err.message;

    // Mongoose specific error handlers
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);

    // If it's an API request, return JSON
    if (req.originalUrl.startsWith('/api')) {
        if (error.isOperational) {
            return res.status(error.statusCode).json({
                status: error.status,
                message: error.message
            });
        }
        // Programming or other unknown error: don't leak error details
        console.error('ERROR 💥', err);
        return res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    }

    // Render generic error page for non-API requests
    if (error.isOperational) {
        return res.status(error.statusCode).render('error', {
            title: 'Something went wrong',
            message: error.message,
            statusCode: error.statusCode,
            user: req.user || null,
            activePage: 'error'
        });
    }

    // Programming or other unknown error
    console.error('ERROR 💥', err);
    return res.status(error.statusCode).render('error', {
        title: 'Something went wrong',
        message: 'Please try again later.',
        statusCode: 500,
        user: req.user || null,
        activePage: 'error'
    });
};
