import * as nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({});
async function test() {
  const info = await transporter.sendMail({ from: 'test' });
}
