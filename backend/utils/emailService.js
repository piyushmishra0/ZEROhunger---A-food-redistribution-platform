const ErrorResponse = require('./errorResponse');

class EmailService {
  constructor() {
    this.sentEmails = []; // Stores "sent" emails for testing
  }

  // Mock email sending - just stores the email in memory
  async sendEmail({ email, subject, message }) {
    try {
      const emailRecord = {
        to: email,
        subject,
        text: message,
        timestamp: new Date().toISOString()
      };

      this.sentEmails.push(emailRecord);
      console.log('[Mock Email]', emailRecord); // Log instead of sending
      
      return true;
    } catch (err) {
      console.error('Email mock failed:', err);
      throw new ErrorResponse('Email service error', 500);
    }
  }

  // Mock bulk email sending
  async sendBulkNotification(emails, donation) {
    const subject = 'New Donation Available Nearby';
    const message = `New donation: ${donation.foodType} (${donation.quantity} servings)`;
    
    emails.forEach(email => {
      this.sendEmail({
        email,
        subject,
        message
      });
    });

    return true;
  }

  // Get all "sent" emails (for testing)
  getSentEmails() {
    return this.sentEmails;
  }

  // Clear mock email records (for testing)
  clearSentEmails() {
    this.sentEmails = [];
  }
}

module.exports = EmailService;