"""
AaharAI NutriSync — Notification Manager
Dispatches notifications across Email, SMS, WhatsApp, Push, and In-app channels.
Uses Celery for async task processing with Redis as broker.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class NotificationManager:
    """
    Manages all notification channels.
    Currently provides the interface — actual channel integrations
    (Resend, Twilio, FCM) are configured via environment variables.
    """

    NOTIFICATION_TYPES = {
        "meal_reminder": {
            "default_channels": ["push", "inapp"],
            "schedule": "daily",
            "priority": "medium",
        },
        "grocery_reminder": {
            "default_channels": ["whatsapp", "email"],
            "schedule": "weekly",
            "priority": "low",
        },
        "nutrient_gap_alert": {
            "default_channels": ["email", "push"],
            "schedule": "weekly",
            "priority": "high",
        },
        "glp1_dose_reminder": {
            "default_channels": ["sms", "push"],
            "schedule": "custom",
            "priority": "critical",
        },
        "medicine_food_timing": {
            "default_channels": ["push", "inapp"],
            "schedule": "daily",
            "priority": "high",
        },
        "water_intake": {
            "default_channels": ["push", "inapp"],
            "schedule": "every_2h",
            "priority": "low",
        },
        "weekly_report": {
            "default_channels": ["email"],
            "schedule": "weekly",
            "priority": "medium",
        },
    }

    def __init__(self):
        self.user_preferences = {}

    def configure_user(self, user_id: str, preferences: dict):
        """Set user's notification preferences."""
        self.user_preferences[user_id] = {
            "channels": preferences.get("channels", ["push", "inapp"]),
            "quiet_hours": preferences.get("quiet_hours", {"start": 22, "end": 7}),
            "frequency": preferences.get("frequency", {}),
        }

    async def send(self, user_id: str, notification_type: str,
                   title: str, body: str, data: Optional[dict] = None):
        """Send a notification through configured channels."""
        notif_config = self.NOTIFICATION_TYPES.get(notification_type, {})
        user_prefs = self.user_preferences.get(user_id, {})

        channels = user_prefs.get("channels", notif_config.get("default_channels", ["inapp"]))

        results = {}
        for channel in channels:
            try:
                if channel == "email":
                    results["email"] = await self._send_email(user_id, title, body)
                elif channel == "sms":
                    results["sms"] = await self._send_sms(user_id, body)
                elif channel == "whatsapp":
                    results["whatsapp"] = await self._send_whatsapp(user_id, body)
                elif channel == "push":
                    results["push"] = await self._send_push(user_id, title, body, data)
                elif channel == "inapp":
                    results["inapp"] = await self._send_inapp(user_id, title, body, data)
            except Exception as e:
                logger.error(f"Failed to send {channel} notification: {e}")
                results[channel] = {"status": "failed", "error": str(e)}

        return results

    async def _send_email(self, user_id: str, subject: str, body: str) -> dict:
        """Send email via Resend/SES. Placeholder — configure API key in .env."""
        logger.info(f"📧 Email to {user_id}: {subject}")
        # TODO: Integrate with Resend API
        # import resend
        # resend.api_key = settings.RESEND_API_KEY
        # resend.Emails.send({...})
        return {"status": "queued", "channel": "email"}

    async def _send_sms(self, user_id: str, body: str) -> dict:
        """Send SMS via Twilio/MSG91. Placeholder."""
        logger.info(f"📱 SMS to {user_id}: {body[:50]}...")
        # TODO: Integrate with Twilio
        return {"status": "queued", "channel": "sms"}

    async def _send_whatsapp(self, user_id: str, body: str) -> dict:
        """Send WhatsApp message via Twilio. Placeholder."""
        logger.info(f"💬 WhatsApp to {user_id}: {body[:50]}...")
        # TODO: Integrate with Twilio WhatsApp API
        return {"status": "queued", "channel": "whatsapp"}

    async def _send_push(self, user_id: str, title: str,
                          body: str, data: Optional[dict] = None) -> dict:
        """Send push notification via FCM. Placeholder."""
        logger.info(f"🔔 Push to {user_id}: {title}")
        # TODO: Integrate with Firebase Cloud Messaging
        return {"status": "queued", "channel": "push"}

    async def _send_inapp(self, user_id: str, title: str,
                           body: str, data: Optional[dict] = None) -> dict:
        """Send in-app notification via Supabase Realtime. Placeholder."""
        logger.info(f"📋 In-app to {user_id}: {title}")
        # TODO: Integrate with Supabase Realtime
        return {"status": "delivered", "channel": "inapp"}


# Singleton
notification_manager = NotificationManager()
