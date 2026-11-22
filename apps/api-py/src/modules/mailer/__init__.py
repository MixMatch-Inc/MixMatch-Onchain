import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

from src.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EmailMessageInput:
    to: str
    subject: str
    text: str


class Mailer:
    def send(self, message: EmailMessageInput) -> None:
        if not settings.SMTP_HOST:
            if settings.ENVIRONMENT == "production":
                raise RuntimeError("SMTP_HOST is required in production")
            logger.info("email to=%s subject=%s body=%s", message.to, message.subject, message.text)
            return

        email = EmailMessage()
        email["From"] = settings.MAIL_FROM
        email["To"] = message.to
        email["Subject"] = message.subject
        email.set_content(message.text)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as client:
            client.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                client.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            client.send_message(email)


mailer = Mailer()
