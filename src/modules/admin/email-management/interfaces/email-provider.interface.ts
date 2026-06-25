export interface IEmailProvider {
  send(options: {
    from: { email: string; name?: string };
    to: string;
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
    attachments?: string[];
  }): Promise<String>; // Return the provider's message ID for tracking
}