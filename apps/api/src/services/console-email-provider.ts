/**
 * Console-based email provider for development and test environments.
 * Implements the IEmailProvider interface using console logging.
 */
import {
  IEmailProvider,
  AnyEmailPayload,
  EmailTemplateName,
} from './email-provider';
import { renderTemplate } from './email-templates';

export class ConsoleEmailProvider implements IEmailProvider {
  async send(payload: AnyEmailPayload): Promise<void> {
    try {
      const rendered = renderTemplate(payload.template, payload);
      
      console.log(
        `\n[EMAIL] Template: ${payload.template}\n` +
        `[EMAIL] To: ${payload.to}\n` +
        `[EMAIL] Subject: ${rendered.subject}\n` +
        `[EMAIL] Text Preview:\n${rendered.text}\n` +
        `${'─'.repeat(60)}\n`,
      );
    } catch (error) {
      console.error(`[EMAIL] Failed to render template ${payload.template}:`, error);
      // Fallback to basic logging
      console.log(
        `\n[EMAIL] Template: ${payload.template}\n` +
        `[EMAIL] To: ${payload.to}\n` +
        `[EMAIL] Variables: ${JSON.stringify(payload.variables, null, 2)}\n`,
      );
    }
  }

  async isHealthy(): Promise<boolean> {
    return true; // Console is always healthy
  }
}
