import dotEnv from 'dotenv'
dotEnv.config()
import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});


export const generateVerificationMail = (email, otp) => {
  return {
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: 'Verify Your Food Bridge Account ✅',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px;">
        <div style="max-width: 520px; margin: auto; background: #ffffff; border-radius: 14px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">

          <h1 style="text-align: center; color: #5a4bda; margin-bottom: 10px;">
            Welcome to Food Bridge 🎉
          </h1>

          <p style="text-align: center; color: #777; font-size: 15px;">
            Secure • Fast • Reliable Chat Platform
          </p>

          <p style="font-size: 16px; color: #333; margin-top: 30px;">
            Hello 👋,<br><br>
            Thanks for signing up! To activate your account, please use the verification code below:
          </p>

          <div style="text-align: center; margin: 35px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; font-size: 26px; font-weight: bold; padding: 14px 35px; border-radius: 10px; letter-spacing: 3px;">
              ${otp}
            </div>
          </div>

          <p style="font-size: 15px; color: #555;">
            ⏰ This code will expire in <strong>5 minutes</strong>.<br>
            🔒 Please do not share it with anyone.
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

          <p style="font-size: 13px; color: #aaa; text-align: center;">
            © ${new Date().getFullYear()} FoodBridge. All rights reserved.
          </p>
        </div>
      </div>
    `
  }
}



export const generatePasswordResetMail = (email, otp) => {
  return {
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: 'Reset Your Password 🔐',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #ff512f, #dd2476); padding: 40px;">
        <div style="max-width: 520px; margin: auto; background: #ffffff; border-radius: 14px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">

          <h1 style="text-align: center; color: #dd2476; margin-bottom: 10px;">
            Password Reset 🔒
          </h1>

          <p style="text-align: center; color: #777; font-size: 15px;">
            Secure Account Recovery System
          </p>

          <p style="font-size: 16px; color: #333; margin-top: 30px;">
            Hello 👋,<br><br>
            We received a request to reset your password. Please use the OTP below to continue:
          </p>

          <div style="text-align: center; margin: 35px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #ff512f, #dd2476); color: #fff; font-size: 26px; font-weight: bold; padding: 14px 35px; border-radius: 10px; letter-spacing: 3px;">
              ${otp}
            </div>
          </div>

          <p style="font-size: 15px; color: #555;">
            ⏰ OTP expires in <strong>5 minutes</strong>.<br>
            ❗If you didn’t request a reset, please ignore this email.
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

          <p style="font-size: 13px; color: #aaa; text-align: center;">
            © ${new Date().getFullYear()} FoodBridge. All rights reserved.
          </p>

        </div>
      </div>
    `
  }
}


export const generateDeliveryAcceptMail = (email, orderDetails) => {
  return {
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: 'Delivery Accepted! 🚚 - Food Bridge',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; background: #f4f7f6; padding: 40px;">
        <div style="max-width: 550px; margin: auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
          
          <div style="background: linear-gradient(135deg, #00b09b, #96c93d); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Delivery Confirmed!</h1>
            <p style="color: #e0f2f1; margin: 10px 0 0 0;">Great news! Your delivery has been accepted.</p>
          </div>

          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">
              Hello 👋,<br><br>
              We’re happy to let you know that your delivery request for <strong>Order #${orderDetails.orderId}</strong> has been accepted and is being processed.
            </p>

            <div style="background: #f9f9f9; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #eee;">
              <h3 style="margin-top: 0; color: #444; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Delivery Details</h3>
              <table style="width: 100%; font-size: 14px; color: #555;">
                <tr>
                  <td style="padding: 5px 0;"><strong>Item:</strong></td>
                  <td style="text-align: right;">${orderDetails.itemName}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;"><strong>Accepted By:</strong></td>
                  <td style="text-align: right;">${orderDetails.delivererName}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;"><strong>Estimated Time:</strong></td>
                  <td style="text-align: right;">${orderDetails.eta || 'Soon'}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #666; line-height: 1.5;">
              You can track the progress or contact the delivery partner directly through the Food Bridge app. Thank you for being a part of our community!
            </p>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.APP_URL}/orders" style="background: #00b09b; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">View Order Status</a>
            </div>
          </div>

          <div style="background: #fdfdfd; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #aaa; margin: 0;">
              © ${new Date().getFullYear()} Food Bridge. Helping hands, happy hearts.
            </p>
          </div>
        </div>
      </div>
    `
  }
}