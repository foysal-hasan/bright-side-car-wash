export interface MailSendOptions {
  from?: { email: string; name?: string };
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  attachments?: string[];
}

export interface IMailProvider {
  send(options: MailSendOptions): Promise<string>;
}
