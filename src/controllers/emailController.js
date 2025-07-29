import nodemailer from "nodemailer";

export async function sendEmail(toAddress, subject, text, html) {
  try {
    const transporter = nodemailer.createTransport({
      // service: "Gmail",
      host: 'smtp.gmail.com',
  port: 587, // or 465
  secure: false, // true for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Quentessential App" <${process.env.SMTP_USER}>`,
      to: toAddress,
      subject,
      text,
      html,
    });

    console.log(`✅ Email sent to ${toAddress}: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${toAddress}:`, error);
  }
}

export async function sendInvitationEmail(email, projectName, projectId) {
  const inviteLink = `${process.env.FRONTEND_URL}/signup?projectId=${projectId}`;

  await sendEmail(
    email,
    `You've been invited to join "${projectName}" on Quentessential App`,
    `You have been invited to collaborate on "${projectName}" on Quentessential App. 
Please click the link below to accept the invitation:
${inviteLink}`,
    `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>You're invited to collaborate!</h2>
      <p>You have been invited to work on <strong>${projectName}</strong> 
      using <strong>Quentessential App</strong>.</p>
      <p>Please click the link below to accept the invitation:</p>
      <p><a href="${inviteLink}">${inviteLink}</a></p>
      <br>
      <p>— The Quentessential App Team</p>
    </div>
    `,
  );
}
