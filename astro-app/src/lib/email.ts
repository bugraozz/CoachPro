import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  try {
    // Development fallback or real email
    if (!process.env.SMTP_USER && !import.meta.env?.PROD) {
       console.log('SMTP Config missing, printing email to console:');
       console.log(`To: ${to}\nReset Link: ${resetLink}`);
       return true;
    }
    
    await transporter.sendMail({
      from: `"CoachPro" <${process.env.SMTP_FROM || 'noreply@coachpro.com'}>`,
      to,
      subject: 'Şifre Sıfırlama Talebi - CoachPro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a;">Şifrenizi Sıfırlayın</h2>
          <p style="color: #475569;">CoachPro hesabınızın şifresini sıfırlamak için bir talepte bulunuldu. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; margin-bottom: 20px;">Şifremi Sıfırla</a>
          <p style="color: #475569;">Eğer bu talebi siz yapmadıysanız, bu mesajı görmezden gelebilirsiniz.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">CoachPro Ekibi</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};
