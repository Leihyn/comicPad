import crypto from 'crypto';

export const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

export const paginate = (page = 1, limit = 20) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  return { skip, limit: parseInt(limit) };
};

export const formatPrice = (price) => {
  return `${parseFloat(price).toFixed(2)} HBAR`;
};

export const calculatePercentage = (part, total) => {
  if (total === 0) return 0;
  return ((part / total) * 100).toFixed(2);
};

export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const generateSlug = (title, id) => {
  const slug = slugify(title);
  return `${slug}-${id.slice(0, 8)}`;
};

export default {
  generateRandomString,
  slugify,
  paginate,
  formatPrice,
  calculatePercentage,
  truncateText,
  isValidEmail,
  generateSlug
};
