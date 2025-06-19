import { IEmailClient } from './IEmailClient';
import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import * as nodemailer from 'nodemailer';

export interface GmailConfig {
  email: string;
  password: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
}

export class GmailClient implements IEmailClient {
  private config: GmailConfig;
  private transporter: nodemailer.Transporter;

  constructor(config: GmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email,
        pass: config.password,
      },
    });
  }

  public async sendCandidateEmail(candidate: StartupJobsPayload, recruiteeResponse: any): Promise<void> {
    const subject = this.config.subjectTemplate 
      ? this.config.subjectTemplate.replace('{position}', candidate.position)
      : `Application for ${candidate.position} received`;

    const body = this.config.bodyTemplate
      ? this.config.bodyTemplate
          .replace(/{name}/g, candidate.name)
          .replace(/{position}/g, candidate.position)
          .replace(/{recruiteeId}/g, recruiteeResponse.data.candidate.id)
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
      : `Dear ${candidate.name},\n\nThank you for applying for the ${candidate.position} position. We have received your application and it has been added to our system (ID: ${recruiteeResponse.data.candidate.id}).\n\nWe will review your application and get back to you soon.\n\nBest regards,\nThe Recruitment Team`;

    console.log('Email body:', body);

    await this.transporter.sendMail({
      from: `"Talent Acquisition Team" <${this.config.email}>`,
      to: candidate.email,
      subject,
      html: body,
    });
  }
} 