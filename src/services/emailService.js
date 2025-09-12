const nodemailer = require('nodemailer');
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, FROM_NAME } = process.env;

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

// Function to send an email
const sendEmail = async (to, subject, text, html) => {
    const mailOptions = {
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`, // sender address
        to, // list of receivers
        subject, // Subject line
        text, // plain text body
        html, // html body
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email: ', error);
        throw error;
    }
};

module.exports = {
    sendEmail,
};