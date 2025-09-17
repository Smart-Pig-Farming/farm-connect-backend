import nodemailer from "nodemailer";
import crypto from "crypto";

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Validate required environment variables
    if (!process.env.EMAIL_USER) {
      throw new Error(
        "Environment variable EMAIL_USER is missing. Please set it in your environment configuration."
      );
    }
    if (!process.env.EMAIL_PASSWORD) {
      throw new Error(
        "Environment variable EMAIL_PASSWORD is missing. Please set it in your environment configuration."
      );
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASSWORD!, // App password for Gmail
      },
    });
  }

  /**
   * Check if email service is properly configured
   */
  isConfigured(): boolean {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
  }

  /**
   * Verify email service connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email service connection failed:", error);
      return false;
    }
  }

  // Generate 4-digit OTP using cryptographically secure random generation
  generateOTP(): string {
    return crypto.randomInt(1000, 9999).toString();
  }

  // Send OTP email for password reset
  async sendPasswordResetOTP(
    email: string,
    otp: string,
    userName: string
  ): Promise<void> {
    const mailOptions = {
      from: {
        name: "FarmConnect",
        address: process.env.EMAIL_USER!,
      },
      to: email,
      subject: "Reset Your FarmConnect Password",
      html: this.getPasswordResetEmailTemplate(userName, otp),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset OTP sent to ${email}`);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw new Error("Failed to send password reset email");
    }
  }

  // Email template for password reset
  private getPasswordResetEmailTemplate(userName: string, otp: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - FarmConnect</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            padding: 20px 0;
            min-height: 100vh;
          }
          
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background: transparent;
          }
          
          .container {
            background: #ffffff;
            margin: 20px;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          
          .header {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="25" cy="25" r="2" fill="white" opacity="0.1"/><circle cx="75" cy="25" r="1.5" fill="white" opacity="0.1"/><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/><circle cx="25" cy="75" r="1.5" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="2" fill="white" opacity="0.1"/></svg>');
            pointer-events: none;
          }
          
          .logo-container {
            position: relative;
            z-index: 1;
          }
          
          .logo {
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          
          .logo-icon {
            display: inline-block;
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            margin-right: 12px;
            vertical-align: middle;
            text-align: center;
            line-height: 40px;
            font-size: 20px;
          }
          
          .subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            font-weight: 400;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .title {
            font-size: 28px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
            text-align: center;
          }
          
          .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 24px;
          }
          
          .message {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 32px;
            line-height: 1.7;
          }
          
          .otp-container {
            background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
            border: 2px solid #f97316;
            border-radius: 16px;
            padding: 32px;
            text-align: center;
            margin: 32px 0;
            position: relative;
            overflow: hidden;
          }
          
          .otp-container::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(135deg, #f97316, #ea580c);
            border-radius: 16px;
            z-index: -1;
          }
          
          .otp-label {
            font-size: 14px;
            font-weight: 500;
            color: #92400e;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 16px;
          }
          
          .otp-code {
            font-size: 42px;
            font-weight: 700;
            letter-spacing: 12px;
            color: #92400e;
            font-family: 'Inter', monospace;
            background: #ffffff;
            padding: 20px 32px;
            border-radius: 12px;
            display: inline-block;
            border: 2px solid rgba(249, 115, 22, 0.2);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          
          .security-notice {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border: 1px solid #fca5a5;
            border-radius: 12px;
            padding: 20px;
            margin: 32px 0;
            position: relative;
          }
          
          .security-notice::before {
            content: '⚠️';
            position: absolute;
            top: 20px;
            left: 20px;
            font-size: 20px;
          }
          
          .security-notice-content {
            margin-left: 40px;
          }
          
          .security-title {
            font-weight: 600;
            color: #dc2626;
            margin-bottom: 8px;
          }
          
          .security-text {
            color: #7f1d1d;
            font-size: 14px;
          }
          
          .security-tips {
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
          }
          
          .security-tips h3 {
            color: #374151;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
          }
          
          .tips-list {
            list-style: none;
            padding: 0;
          }
          
          .tips-list li {
            color: #4b5563;
            font-size: 14px;
            margin-bottom: 8px;
            padding-left: 24px;
            position: relative;
          }
          
          .tips-list li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: 600;
          }
          
          .footer {
            background: #f9fafb;
            padding: 32px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          
          .footer-content {
            color: #6b7280;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .footer-brand {
            color: #374151;
            font-weight: 600;
            margin-bottom: 8px;
          }
          
          .footer-legal {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 16px;
          }
          
          /* Simplified trust line for maximum email-client compatibility */
          .trustline {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            line-height: 1.6;
            margin: 24px 0;
          }
          .trustline .label {
            color: #374151;
            font-weight: 500;
          }
          .trustline .sep {
            color: #d1d5db;
            margin: 0 10px;
          }
          
          .trust-indicators {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin: 24px 0;
          }
          
          .trust-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #6b7280;
            font-size: 12px;
          }
          
          .trust-icon {
            width: 16px;
            height: 16px;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(249, 115, 22, 0.3);
            flex-shrink: 0;
          }
          
          .trust-icon svg {
            width: 8px !important;
            height: 8px !important;
            fill: white !important;
            stroke: white !important;
            stroke-width: 1.5px !important;
            color: white !important;
          }
          
          .trust-icon svg path {
            fill: white !important;
            stroke: white !important;
          }
          
          .trust-icon svg circle {
            fill: none !important;
            stroke: white !important;
          }
          
          @media (max-width: 640px) {
            .container {
              margin: 0;
              border-radius: 0;
            }
            
            .header, .content, .footer {
              padding-left: 20px;
              padding-right: 20px;
            }
            
            .otp-code {
              font-size: 36px;
              letter-spacing: 8px;
              padding: 16px 24px;
            }
            
            .trust-indicators {
              flex-direction: column;
              gap: 12px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <div class="logo">
                  <span class="logo-icon">🐷</span>
                  FarmConnect
                </div>
                <div class="subtitle">Precision Pig Farming Platform</div>
              </div>
            </div>
            
            <div class="content">
              <h1 class="title">Password Reset Request</h1>
              
              <div class="greeting">
                Hello <strong>${userName}</strong>,
              </div>
              
              <div class="message">
                We received a secure request to reset your FarmConnect account password. To proceed with your password reset, please use the verification code below:
              </div>
              
              <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="security-notice">
                <div class="security-notice-content">
                  <div class="security-title">Time-Sensitive Security Code</div>
                  <div class="security-text">This verification code will expire in <strong>5 minutes</strong> for your account security.</div>
                </div>
              </div>
              
              <div class="message">
                If you didn't request this password reset, please ignore this email or contact our support team immediately if you have security concerns.
              </div>
              
              <div class="security-tips">
                <h3>🔒 Security Guidelines</h3>
                <ul class="tips-list">
                  <li>Never share this code with anyone - FarmConnect will never ask for it</li>
                  <li>This code can only be used once and expires automatically</li>
                  <li>Always verify the sender email address before entering codes</li>
                  <li>Report suspicious emails to our security team</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-content">
                <div class="footer-brand">The FarmConnect Team</div>
                <div>Empowering precision pig farming through technology</div>
                
                <div class="trustline">
                  <span class="label">Secure Platform</span>
                  <span class="sep">|</span>
                  <span class="label">Privacy Protected</span>
                  <span class="sep">|</span>
                  <span class="label">Verified Account</span>
                </div>
                
                <div class="footer-legal">
                  This is an automated security message. Please do not reply to this email.<br>
                  © 2025 FarmConnect. All rights reserved. | Precision Pig Farming Solutions
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send credentials to newly created user
  async sendUserCredentials(
    email: string,
    username: string,
    temporaryPassword: string,
    fullName: string,
    role: string
  ): Promise<void> {
    const mailOptions = {
      from: {
        name: "FarmConnect",
        address: process.env.EMAIL_USER!,
      },
      to: email,
      subject: "Welcome to FarmConnect - Your Account Credentials",
      html: this.getUserCredentialsEmailTemplate(
        email,
        temporaryPassword,
        fullName,
        role
      ),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`User credentials sent to ${email}`);
    } catch (error) {
      console.error("Error sending user credentials email:", error);
      throw new Error("Failed to send user credentials email");
    }
  }

  // Email template for user credentials
  private getUserCredentialsEmailTemplate(
    username: string,
    temporaryPassword: string,
    fullName: string,
    role: string
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to FarmConnect - Your Account is Ready!</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            padding: 20px 0;
            min-height: 100vh;
          }
          
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background: transparent;
          }
          
          .container {
            background: #ffffff;
            margin: 20px;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          
          .header {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="white" opacity="0.15"/><circle cx="80" cy="20" r="1.5" fill="white" opacity="0.1"/><circle cx="50" cy="40" r="1" fill="white" opacity="0.2"/><circle cx="30" cy="70" r="1.5" fill="white" opacity="0.1"/><circle cx="70" cy="80" r="2" fill="white" opacity="0.15"/></svg>');
            pointer-events: none;
          }
          
          .logo-container {
            position: relative;
            z-index: 1;
          }
          
          .logo {
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          
          .logo-icon {
            display: inline-block;
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            margin-right: 12px;
            vertical-align: middle;
            text-align: center;
            line-height: 40px;
            font-size: 20px;
          }
          
          .header-title {
            color: #ffffff;
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          
          .header-subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            font-weight: 400;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
          }
          
          .message {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 32px;
            line-height: 1.7;
          }
          
          .credentials-container {
            background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
            border: 2px solid #f97316;
            border-radius: 16px;
            padding: 32px;
            margin: 32px 0;
            position: relative;
            overflow: hidden;
          }
          
          .credentials-container::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(135deg, #f97316, #ea580c);
            border-radius: 16px;
            z-index: -1;
          }
          
          .credentials-title {
            font-size: 18px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 24px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .credential-item {
            display: flex;
            align-items: center;
            background: #ffffff;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 12px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(249, 115, 22, 0.2);
          }
          
          .credential-item:last-child {
            margin-bottom: 0;
          }
          
          .credential-label {
            font-weight: 600;
            width: 100px;
            color: #374151;
            font-size: 14px;
          }
          
          .credential-value {
            flex: 1;
            color: #1f2937;
            font-family: 'Inter', monospace;
            font-weight: 500;
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            font-size: 14px;
          }
          
          .security-notice {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border: 1px solid #fca5a5;
            border-radius: 12px;
            padding: 20px;
            margin: 32px 0;
            position: relative;
          }
          
          .security-notice::before {
            content: '🔐';
            position: absolute;
            top: 20px;
            left: 20px;
            font-size: 20px;
          }
          
          .security-notice-content {
            margin-left: 40px;
          }
          
          .security-title {
            font-weight: 600;
            color: #dc2626;
            margin-bottom: 8px;
          }
          
          .security-text {
            color: #7f1d1d;
            font-size: 14px;
          }
          
          .steps-container {
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
          }
          
          .steps-title {
            color: #374151;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
          }
          
          .steps-list {
            list-style: none;
            padding: 0;
          }
          
          .steps-list li {
            color: #4b5563;
            font-size: 15px;
            margin-bottom: 12px;
            padding-left: 40px;
            position: relative;
          }
          
          .steps-list li::before {
            content: counter(step-counter);
            counter-increment: step-counter;
            position: absolute;
            left: 0;
            top: 0;
            background: #f97316;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
          }
          
          .steps-list {
            counter-reset: step-counter;
          }
          
          .cta-container {
            text-align: center;
            margin: 32px 0;
          }
          
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: #ffffff !important;
            text-decoration: none !important;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
          }
          
          .cta-button:hover {
            color: #ffffff !important;
            transform: translateY(-1px);
            box-shadow: 0 6px 12px -1px rgba(0, 0, 0, 0.15);
          }
          
          .cta-button:visited {
            color: #ffffff !important;
          }
          
          .cta-button:link {
            color: #ffffff !important;
          }
          
          .cta-button:active {
            color: #ffffff !important;
          }
          
          .footer {
            background: #f9fafb;
            padding: 32px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          
          .footer-content {
            color: #6b7280;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .footer-brand {
            color: #374151;
            font-weight: 600;
            margin-bottom: 8px;
          }
          
          .footer-legal {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 16px;
          }
          
          .trust-indicators {
            display: flex;
            justify-content: center;
            gap: 32px;
            margin: 24px 0;
            padding: 20px;
            background: rgba(249, 115, 22, 0.05);
            border-radius: 12px;
            border: 1px solid rgba(249, 115, 22, 0.1);
          }
          
          .trust-item {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #374151;
            font-size: 13px;
            font-weight: 500;
            padding: 8px 12px;
            background: #ffffff;
            border-radius: 20px;
            border: 1px solid rgba(249, 115, 22, 0.2);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
          }
          
          .trust-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            border-color: rgba(249, 115, 22, 0.3);
          }
          
          .trust-icon {
            width: 20px;
            height: 20px;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3);
            flex-shrink: 0;
            min-width: 20px;
            min-height: 20px;
            position: relative;
            margin-right: 1px;
          }
          
          .trust-icon svg {
            width: 10px !important;
            height: 10px !important;
            fill: white !important;
            stroke: white !important;
            stroke-width: 1.5px !important;
            color: white !important;
          }
          
          .trust-icon svg path {
            fill: white !important;
            stroke: white !important;
          }
          
          .trust-icon svg circle {
            fill: none !important;
            stroke: white !important;
          }
          
          @media (max-width: 640px) {
            .container {
              margin: 0;
              border-radius: 0;
            }
            
            .header, .content, .footer {
              padding-left: 20px;
              padding-right: 20px;
            }
            
            .credential-item {
              flex-direction: column;
              align-items: flex-start;
              gap: 8px;
            }
            
            .credential-label {
              width: auto;
            }
            
            .credential-value {
              width: 100%;
            }
            
            .trust-indicators {
              flex-direction: column;
              gap: 12px;
              padding: 16px;
            }
            
            .trust-item {
              justify-content: center;
              padding: 10px 16px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <h1 class="header-title">Welcome to FarmConnect!</h1>
                <div class="header-subtitle">Your account has been created successfully</div>
              </div>
            </div>
            
            <div class="content">
              <div class="greeting">Hello ${fullName}! 👋</div>
              
              <div class="message">
                Your <strong>${role}</strong> account has been created by an administrator. Below are your secure login credentials to access the FarmConnect platform:
              </div>
              
              <div class="credentials-container">
                <div class="credentials-title">Your Login Credentials</div>
                
                <div class="credential-item">
                  <span class="credential-label">Email:</span>
                  <span class="credential-value">${username}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Password:</span>
                  <span class="credential-value">${temporaryPassword}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Role:</span>
                  <span class="credential-value">${role}</span>
                </div>
              </div>
              
              <div class="security-notice">
                <div class="security-notice-content">
                  <div class="security-title">Important Security Information</div>
                  <div class="security-text">This is a <strong>temporary password</strong>. You will be required to create a new secure password during your first login for account security.</div>
                </div>
              </div>
              
              <div class="steps-container">
                <div class="steps-title">🚀 Getting Started with FarmConnect</div>
                <ol class="steps-list">
                  <li>Click the "Login to FarmConnect" button below</li>
                  <li>Enter your email and temporary password</li>
                  <li>Create a new secure password when prompted</li>
                  <li>Complete your profile setup</li>
                  <li>Start your precision farming journey!</li>
                </ol>
              </div>
              
              <div class="cta-container">
                <a href="${
                  process.env.FRONTEND_URL || "http://localhost:5174"
                }/signin" class="cta-button">
                  Login to FarmConnect →
                </a>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-content">
                <div class="footer-brand">The FarmConnect Team</div>
                <div>Empowering precision pig farming through technology</div>
                
                <div class="trustline">
                  <span class="label">Secure Platform</span>
                  <span class="sep">|</span>
                  <span class="label">Privacy Protected</span>
                  <span class="sep">|</span>
                  <span class="label">Verified Account</span>
                </div>
                
                <div class="footer-legal">
                  If you have any questions, please contact your administrator.<br>
                  © 2025 FarmConnect. All rights reserved. | Precision Pig Farming Solutions
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Test email connection
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("Email service connection verified");
      return true;
    } catch (error) {
      console.error("Email service connection failed:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
