import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

/**
 * Validation middleware - checks for validation errors
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed:', {
      errors: errors.array(),
      url: req.originalUrl,
      body: req.body
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }

  next();
};

export default validate;