import { EmailOptions } from "../types/email.types";

export interface IEmailProvider {
  send(options: EmailOptions): Promise<String>; // Return the provider's message ID for tracking
}