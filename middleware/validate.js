const AppError = require('../utils/AppError');

const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
        
        if (error) {
            // Combine all Joi error messages into a single string
            const message = error.details.map(err => err.message).join(', ');
            return next(new AppError(message, 400));
        }

        // Replace req body with validated/type-coerced value
        req[property] = value;
        next();
    };
};

module.exports = validate;
