import { Mail } from "fastforwardit";
import 'dotenv/config';
import path from 'path';

const validateEnv = () => {
  if (!process.env.APP_MAIL || !process.env.APP_PASS) {
    throw new Error('Missing email configuration: APP_MAIL or APP_PASS');
  }
};

validateEnv();

const mailer = new Mail({
  transporterOptions: {
    service: "gmail",
    auth: {
      user: process.env.APP_MAIL!,
      pass: process.env.APP_PASS!
    }
  },
  defaultFrom: `${process.env.APP_MAIL}`
});

export const test = async (): Promise<void> => {
  try {
    await mailer.sendTest();
    console.log('✅ Email test sent successfully');
  } catch (error) {
    console.error('❌ Email test failed:', error);
    throw error;
  }
};


function simpleMarkdownToHtml(text: string): string {
  if (!text) return "";
  
  // Converts **Bold**
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Converts * Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Converts ### Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  
  // Converts - bullet_points
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  
  // Converts \n Line Break
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

export const mail_user = async (to: string, content: string): Promise<void> => {
  try {
    const templatePath = path.join(process.cwd(), 'src/utils/template.html');
    
    if (!to || !content) {
      throw new Error('Email recipient and content are required');
    }

    const formattedContent = simpleMarkdownToHtml(content);

    await mailer.sendWithTemplate({
      to: to,
      subject: "🚀 Your Content Results are Ready",
      template: templatePath,
      variables: {
        content: formattedContent
      }
    });
    
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
};