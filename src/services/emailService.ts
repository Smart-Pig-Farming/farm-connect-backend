import nodemailer from "nodemailer";

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || "piggydata25@gmail.com",
        pass: process.env.EMAIL_PASSWORD, // App password for Gmail
      },
    });
  }

  // Generate 4-digit OTP
  generateOTP(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
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
        address: process.env.EMAIL_USER || "piggydata25@gmail.com",
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
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #f97316;
            margin-bottom: 10px;
          }
          .title {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 20px;
          }
          .otp-container {
            background-color: #fef3c7;
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #92400e;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            color: #6b7280;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #f97316;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🐷 FarmConnect</div>
            <h1 class="title">Password Reset Request</h1>
          </div>
          
          <p>Hello <strong>${userName}</strong>,</p>
          
          <p>We received a request to reset your FarmConnect account password. Use the verification code below to proceed with your password reset:</p>
          
          <div class="otp-container">
            <div style="font-size: 16px; color: #374151; margin-bottom: 10px;">Your verification code is:</div>
            <div class="otp-code">${otp}</div>
          </div>
          
          <div class="warning">
            <strong>⏰ Important:</strong> This verification code will expire in <strong>5 minutes</strong> for security reasons.
          </div>
          
          <p>If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.</p>
          
          <p>For security reasons:</p>
          <ul>
            <li>Never share this code with anyone</li>
            <li>FarmConnect will never ask for your password via email</li>
            <li>This code can only be used once</li>
          </ul>
          
          <div class="footer">
            <p>Best regards,<br>The FarmConnect Team</p>
            <p>This is an automated message, please do not reply to this email.</p>
            <p>© 2025 FarmConnect. All rights reserved.</p>
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
