const axios = require('axios');

class SMSService {
  constructor() {
    this.baseUrl = 'https://smschilly.in/app/smsapi/index.php';
    this.userKey =  '566A86EC8D0552';
    this.senderId =  'DDESPL';
    this.campaign = '7600';
    this.routeId = '101456';
    this.templateId = '1707175759144612640';
    this.peId = '1701168992645972214';
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP via SMSChilly API
  async sendOTP(phoneNumber, otp, purpose = 'login', userName = 'User') {
    try {
      // Clean phone number (remove +91, spaces, etc.)
      const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
      
      if (cleanPhone.length !== 10) {
        throw new Error('Invalid phone number format');
      }

      // Create message based on purpose - using the exact template format
      let message;
      switch (purpose) {
        case 'login':
        case 'verification':
          message = `Hi ${userName}, your login OTP is ${otp}. This code is valid for 10 minutes. EDUDD`;
          break;
        case 'registration':
          message = `Hi ${userName}, your login OTP is ${otp}. This code is valid for 10 minutes. EDUDD`;
          break;
        case 'password_reset':
          message = `Hi ${userName}, your login reset OTP is ${otp}. This code is valid for 10 minutes. EDUDD`;
          break;
        case 'phone_verification':
          message = `Hi ${userName}, your login verification OTP is ${otp}. This code is valid for 10 minutes. EDUDD`;
          break;
        default:
          message = `Hi ${userName}, your login OTP is ${otp}. This code is valid for 10 minutes. EDUDD`;
      }

      // Prepare request parameters according to the working URL format
      const params = new URLSearchParams({
        key: this.userKey,
        campaign: this.campaign,
        routeid: this.routeId,
        type: 'text',
        contacts: cleanPhone,
        senderid: this.senderId,
        msg: message,
        template_id: this.templateId,
        pe_id: this.peId
      });

      const fullUrl = `${this.baseUrl}?${params.toString()}`;
      console.log('Sending SMS with URL:', fullUrl.replace(this.userKey, process.env.SMS_API_KEY ));

      // Send SMS using GET method as per the working URL format
      const response = await axios.get(fullUrl, {
        timeout: 30000
      });

      console.log('SMS API Response:', response.data);

      // Check if response indicates success
      if (response.status === 200 && response.data) {
        return {
          success: true,
          messageId: response.data.msg_id || 'sent',
          message: 'OTP sent successfully'
        };
      } else {
        throw new Error('Failed to send SMS');
      }

    } catch (error) {
      console.error('SMS sending failed:', error.message);
      
      if (error.response?.data) {
        console.error('SMS API Error Response:', error.response.data);
        throw new Error(error.response.data.message || 'Failed to send OTP');
      }
      
      throw new Error(error.message || 'SMS service unavailable');
    }
  }

  // Check SMS balance using SMSChilly API
  async checkBalance() {
    try {
      const response = await axios.post(`${this.baseUrl}/check_balance`, {
        user_key: this.userKey
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 'true' || response.data.status === true) {
        return {
          success: true,
          balance: parseInt(response.data.balance)
        };
      } else {
        throw new Error(response.data.message || 'Failed to check balance');
      }

    } catch (error) {
      console.error('Balance check failed:', error.message);
      throw new Error('Failed to check SMS balance');
    }
  }

  // Check delivery status using SMSChilly API
  async checkDeliveryStatus(messageId) {
    try {
      const response = await axios.post(`${this.baseUrl}/delivery_report`, {
        user_key: this.userKey,
        msg_id: messageId
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 'true' || response.data.status === true) {
        return {
          success: true,
          status: response.data.dlr_status
        };
      } else {
        throw new Error(response.data.message || 'Failed to get delivery status');
      }

    } catch (error) {
      console.error('Delivery status check failed:', error.message);
      throw new Error('Failed to check delivery status');
    }
  }

  // Validate Indian phone number format
  validatePhoneNumber(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number pattern
    return phoneRegex.test(cleanPhone);
  }

  // Format phone number for display
  formatPhoneNumber(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[\s+\-()]/g, '').replace(/^(\+91|91)/, '');
    if (cleanPhone.length === 10) {
      return `+91${cleanPhone}`;
    }
    return phoneNumber;
  }

  // Test SMS service connection
  async testConnection() {
    try {
      console.log('Testing SMS service connection...');
      const balance = await this.checkBalance();
      console.log(`SMS Service connected. Balance: ${balance.balance}`);
      return balance;
    } catch (error) {
      console.error('SMS Service connection failed:', error.message);
      throw error;
    }
  }
}

module.exports = new SMSService();