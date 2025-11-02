import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

/**
 * Email notification service
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'noreply@comicpad.io';
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    try {
      if (!process.env.EMAIL_HOST) {
        logger.warn('Email service not configured');
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      // Verify connection
      await this.transporter.verify();
      logger.info('Email service initialized');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  /**
   * Send email
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      if (!this.transporter) {
        logger.warn('Email service not available');
        return false;
      }

      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text
      });

      logger.info(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    const html = `
      <h1>Welcome to Comic Pad!</h1>
      <p>Hi ${user.username},</p>
      <p>Thank you for joining Comic Pad, the future of digital comic books.</p>
      <p>Get started by:</p>
      <ul>
        <li>Exploring amazing comics from talented creators</li>
        <li>Connecting your Hedera wallet</li>
        <li>Building your collection</li>
      </ul>
      <p>Happy collecting!</p>
      <p>The Comic Pad Team</p>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: 'Welcome to Comic Pad!',
      html,
      text: 'Welcome to Comic Pad! Thank you for joining us.'
    });
  }

  /**
   * Send NFT purchase confirmation
   */
  async sendPurchaseConfirmation(user, transaction) {
    const html = `
      <h1>Purchase Confirmation</h1>
      <p>Hi ${user.username},</p>
      <p>Your purchase was successful!</p>
      <p><strong>Comic:</strong> ${transaction.comic.title}</p>
      <p><strong>Price:</strong> ${transaction.price} HBAR</p>
      <p><strong>Serial Number:</strong> #${transaction.serialNumber}</p>
      <p><strong>Transaction ID:</strong> ${transaction.transactionId}</p>
      <p><a href="${transaction.explorerUrl}">View on Hedera Explorer</a></p>
      <p>You can now read your comic in your collection!</p>
      <p>Happy reading!</p>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: 'Comic Purchase Confirmation',
      html,
      text: `Your purchase of ${transaction.comic.title} was successful!`
    });
  }

  /**
   * Send NFT sale notification
   */
  async sendSaleNotification(seller, transaction) {
    const html = `
      <h1>Sale Notification</h1>
      <p>Hi ${seller.username},</p>
      <p>Great news! Your NFT has been sold!</p>
      <p><strong>Comic:</strong> ${transaction.comic.title}</p>
      <p><strong>Price:</strong> ${transaction.price} HBAR</p>
      <p><strong>Serial Number:</strong> #${transaction.serialNumber}</p>
      <p><strong>Platform Fee:</strong> ${transaction.platformFee} HBAR</p>
      <p><strong>Net Earnings:</strong> ${transaction.price - transaction.platformFee} HBAR</p>
      <p><a href="${transaction.explorerUrl}">View on Hedera Explorer</a></p>
    `;

    return await this.sendEmail({
      to: seller.email,
      subject: 'Your NFT Has Been Sold!',
      html,
      text: `Your NFT ${transaction.comic.title} has been sold for ${transaction.price} HBAR`
    });
  }

  /**
   * Send bid notification
   */
  async sendBidNotification(seller, listing, bid) {
    const html = `
      <h1>New Bid on Your Auction</h1>
      <p>Hi ${seller.username},</p>
      <p>You have received a new bid on your auction!</p>
      <p><strong>Comic:</strong> ${listing.comic.title}</p>
      <p><strong>Bid Amount:</strong> ${bid.amount} HBAR</p>
      <p><strong>Current High Bid:</strong> ${listing.auction.currentBid} HBAR</p>
      <p><strong>Time Remaining:</strong> ${this.getTimeRemaining(listing.auction.endTime)}</p>
      <p><a href="${process.env.FRONTEND_URL}/marketplace/listing/${listing._id}">View Listing</a></p>
    `;

    return await this.sendEmail({
      to: seller.email,
      subject: 'New Bid on Your Auction',
      html,
      text: `New bid of ${bid.amount} HBAR on your auction`
    });
  }

  /**
   * Send auction won notification
   */
  async sendAuctionWonNotification(winner, listing) {
    const html = `
      <h1>Congratulations! You Won the Auction</h1>
      <p>Hi ${winner.username},</p>
      <p>You are the winning bidder!</p>
      <p><strong>Comic:</strong> ${listing.comic.title}</p>
      <p><strong>Winning Bid:</strong> ${listing.auction.currentBid} HBAR</p>
      <p><strong>Serial Number:</strong> #${listing.serialNumber}</p>
      <p>The NFT has been transferred to your wallet.</p>
      <p><a href="${process.env.FRONTEND_URL}/collection">View Your Collection</a></p>
    `;

    return await this.sendEmail({
      to: winner.email,
      subject: 'You Won the Auction!',
      html,
      text: `You won the auction for ${listing.comic.title}`
    });
  }

  /**
   * Send offer notification
   */
  async sendOfferNotification(owner, offer) {
    const html = `
      <h1>New Offer on Your NFT</h1>
      <p>Hi ${owner.username},</p>
      <p>You have received an offer on your NFT!</p>
      <p><strong>Comic:</strong> ${offer.comic.title}</p>
      <p><strong>Offer Amount:</strong> ${offer.amount} HBAR</p>
      <p><strong>From:</strong> ${offer.offerer.username}</p>
      ${offer.message ? `<p><strong>Message:</strong> ${offer.message}</p>` : ''}
      <p><a href="${process.env.FRONTEND_URL}/offers">View Offers</a></p>
    `;

    return await this.sendEmail({
      to: owner.email,
      subject: 'New Offer on Your NFT',
      html,
      text: `New offer of ${offer.amount} HBAR on your NFT`
    });
  }

  /**
   * Send offer accepted notification
   */
  async sendOfferAcceptedNotification(offerer, offer) {
    const html = `
      <h1>Your Offer Was Accepted!</h1>
      <p>Hi ${offerer.username},</p>
      <p>Great news! Your offer has been accepted!</p>
      <p><strong>Comic:</strong> ${offer.comic.title}</p>
      <p><strong>Price:</strong> ${offer.amount} HBAR</p>
      <p>The NFT has been transferred to your wallet.</p>
      <p><a href="${process.env.FRONTEND_URL}/collection">View Your Collection</a></p>
    `;

    return await this.sendEmail({
      to: offerer.email,
      subject: 'Your Offer Was Accepted!',
      html,
      text: `Your offer for ${offer.comic.title} was accepted`
    });
  }

  /**
   * Send new follower notification
   */
  async sendNewFollowerNotification(user, follower) {
    const html = `
      <h1>New Follower</h1>
      <p>Hi ${user.username},</p>
      <p>${follower.username} is now following you!</p>
      <p><a href="${process.env.FRONTEND_URL}/profile/${follower._id}">View Profile</a></p>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: 'New Follower',
      html,
      text: `${follower.username} is now following you`
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const html = `
      <h1>Password Reset Request</h1>
      <p>Hi ${user.username},</p>
      <p>You requested to reset your password.</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html,
      text: `Reset your password: ${resetUrl}`
    });
  }

  /**
   * Helper: Get time remaining
   */
  getTimeRemaining(endTime) {
    const now = new Date();
    const diff = endTime - now;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    
    return `${hours}h ${minutes}m`;
  }
}

export default new EmailService();