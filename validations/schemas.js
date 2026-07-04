const Joi = require('joi');

const loginSchema = Joi.object({
    username: Joi.string().required().messages({
        'string.empty': 'Username is required',
        'any.required': 'Username is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    })
});

const billSchema = Joi.object({
    client_id: Joi.string().allow('', null),
    recipientData: Joi.object().unknown(true).allow(null),
    billDate: Joi.string().required().messages({
        'string.empty': 'Bill date is required',
        'any.required': 'Bill date is required'
    }),
    cgstRate: Joi.number().allow('', null),
    sgstRate: Joi.number().allow('', null),
    otherCharges: Joi.number().allow('', null),
    footerData: Joi.object().unknown(true).allow(null),
    notes: Joi.string().allow('', null),
    lineItems: Joi.array().items(Joi.object().unknown(true)).min(1).required().messages({
        'array.min': 'At least one line item is required',
        'any.required': 'At least one line item is required'
    })
});

const updateProfileSchema = Joi.object({
    bill_title: Joi.string().allow('', null),
    company_name: Joi.string().allow('', null),
    company_subtitle: Joi.string().allow('', null),
    company_address: Joi.string().allow('', null),
    company_phones: Joi.string().allow('', null),
    company_gstin: Joi.string().allow('', null),
    company_pan: Joi.string().allow('', null),
    company_wef: Joi.string().allow('', null),
    default_cgst: Joi.number().allow('', null),
    default_sgst: Joi.number().allow('', null),
    bank_details: Joi.array().items(Joi.object().unknown(true)).allow(null)
});

const updateColumnsSchema = Joi.object({
    columns: Joi.array().items(Joi.object().unknown(true)).required().messages({
        'any.required': 'columns array required'
    })
});

const updateRecipientFieldsSchema = Joi.object({
    fields: Joi.array().items(Joi.object().unknown(true)).required().messages({
        'any.required': 'fields array required'
    })
});

const updateFooterFieldsSchema = Joi.object({
    fields: Joi.array().items(Joi.object().unknown(true)).required().messages({
        'any.required': 'fields array required'
    })
});

const createUserSchema = Joi.object({
    username: Joi.string().required().messages({
        'string.empty': 'Username is required',
        'any.required': 'Username is required'
    }),
    displayName: Joi.string().required().messages({
        'string.empty': 'Display name is required',
        'any.required': 'Display name is required'
    }),
    email: Joi.string().allow('', null),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    }),
    role: Joi.string().valid('admin', 'user').allow('', null).messages({
        'any.only': 'Role must be "admin" or "user"'
    })
});

const updateUserSchema = Joi.object({
    displayName: Joi.string().allow('', null),
    email: Joi.string().allow('', null),
    password: Joi.string().allow('', null),
    role: Joi.string().valid('admin', 'user').allow('', null).messages({
        'any.only': 'Role must be "admin" or "user"'
    })
});

module.exports = {
    loginSchema,
    billSchema,
    updateProfileSchema,
    updateColumnsSchema,
    updateRecipientFieldsSchema,
    updateFooterFieldsSchema,
    createUserSchema,
    updateUserSchema
};
