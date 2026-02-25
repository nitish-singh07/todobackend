import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendOTP = async (email: string, otp: string) => {
    const mailOptions = {
        from: `"MindStash" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verification Code for MindStash',
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #6200EE;">Verification Code</h2>
                <p>Use the following code to verify your account:</p>
                <div style="background: #f4f4f4; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 10px; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        `,
    };

    return transporter.sendMail(mailOptions);
};
