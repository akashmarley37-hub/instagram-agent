"""
AI Service — Caption & Hashtag Generation via OpenAI GPT-4o.
Production implementation: Zero mock data, zero demo responses.
Requires valid OPENAI_API_KEY in environment variables.
"""
import json
import logging
from typing import Optional, List
from app.config.settings import settings

logger = logging.getLogger(__name__)


class OpenAINotConfiguredError(ValueError):
    """Raised when OpenAI API key is missing or not configured."""
    pass


def _build_prompt(
    topic: str,
    tone: str,
    language: str,
    media_context: Optional[str] = None,
    brand_instructions: Optional[str] = None
) -> str:
    """Build a structured prompt for AI content generation."""
    tone_instructions = {
        "professional": "formal, authoritative, and informative. Use complete sentences. Avoid slang.",
        "friendly": "warm, conversational, and relatable. Use emojis sparingly. Sound like a friend.",
        "creative": "imaginative, expressive, and artistic. Use vivid language and metaphors.",
        "minimal": "short, concise, and impactful. Say more with less. Minimal emojis.",
        "promotional": "persuasive, exciting, and action-oriented. Create urgency without being pushy.",
        "inspirational": "uplifting, motivational, and emotionally resonant. Inspire action.",
    }

    tone_desc = tone_instructions.get(tone.lower(), tone_instructions["friendly"])
    media_part = f"\nMedia context: {media_context}" if media_context else ""
    brand_part = f"\nBrand guidelines: {brand_instructions}" if brand_instructions else ""

    return f"""You are an expert Instagram content creator and social media strategist.

Generate an Instagram post for the following:

Topic: {topic}
Tone: {tone} — {tone_desc}
Language: {language}{media_part}{brand_part}

Rules:
- Caption must be authentic, engaging, and appropriate for Instagram
- Caption length: 100-250 words for detailed tones, 20-60 words for minimal
- Include 1-3 relevant emojis naturally in the caption (not at the end in a cluster)
- Hashtags: 8-15 highly relevant hashtags, mix of popular and niche
- Hashtags must be directly relevant to the topic and tone
- Do NOT use generic overused hashtags like #love #instagood unless truly relevant
- Call to action: one clear, natural CTA that invites engagement
- IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanation

Return this exact JSON structure:
{{
  "caption": "your caption text here",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "call_to_action": "your call to action here"
}}"""


class AIService:
    """
    AI content generation service using real OpenAI API.
    Raises OpenAINotConfiguredError when OPENAI_API_KEY is not configured.
    """

    def __init__(self):
        self._client = None

    def _get_client(self):
        if not settings.is_openai_configured:
            raise OpenAINotConfiguredError(
                "OpenAI API key is not configured. Please set OPENAI_API_KEY in backend/.env to enable AI generation."
            )
        try:
            from openai import AsyncOpenAI
            return AsyncOpenAI(api_key=settings.openai_api_key)
        except ImportError:
            raise RuntimeError("openai python package is not installed.")

    async def generate_content(
        self,
        topic: str,
        tone: str = "friendly",
        language: str = "English",
        media_context: Optional[str] = None,
        brand_instructions: Optional[str] = None,
    ) -> dict:
        """
        Generate caption + hashtags for an Instagram post using real OpenAI GPT-4o.
        Raises OpenAINotConfiguredError when OpenAI API key is missing.
        """
        if not settings.is_openai_configured:
            raise OpenAINotConfiguredError(
                "OpenAI API key is not configured. Please set OPENAI_API_KEY in backend/.env to enable AI generation."
            )

        client = self._get_client()
        prompt = _build_prompt(topic, tone, language, media_context, brand_instructions)

        try:
            response = await client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert Instagram content creator. Always respond with valid JSON only."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=settings.openai_max_tokens,
                temperature=0.8,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content
            data = json.loads(raw)

            caption = data.get("caption", "").strip()
            hashtags = data.get("hashtags", [])
            cta = data.get("call_to_action", "").strip()

            if not caption:
                raise ValueError("OpenAI returned an empty caption. Please try again.")

            # Ensure hashtags start with #
            hashtags = [
                h if h.startswith("#") else f"#{h}"
                for h in hashtags
                if h and isinstance(h, str)
            ][:20]

            logger.info(f"OpenAI generation successful: {len(hashtags)} hashtags generated")
            return {
                "caption": caption,
                "hashtags": hashtags,
                "call_to_action": cta,
                "is_demo": False
            }

        except json.JSONDecodeError as e:
            logger.error(f"OpenAI response JSON parse error: {e}")
            raise ValueError("OpenAI returned invalid JSON response format. Please try again.")
        except Exception as e:
            if isinstance(e, OpenAINotConfiguredError):
                raise
            err_str = str(e)
            logger.error(f"OpenAI generation error ({type(e).__name__}): {err_str}")
            if "credit_balance_exhausted" in err_str or "insufficient_quota" in err_str:
                raise ValueError(
                    "OpenAI quota exceeded: You have no credits remaining on your OpenAI account. "
                    "Please add credits at https://platform.openai.com/settings/organization/billing/."
                )
            if "invalid_api_key" in err_str:
                raise ValueError("OpenAI API key is invalid. Please check OPENAI_API_KEY in backend/.env.")
            raise ValueError(f"OpenAI generation failed: {err_str}")

    async def regenerate_content(
        self,
        caption: str,
        hashtags: List[str],
        adjustment: str,
        topic: Optional[str] = None,
        tone: Optional[str] = None,
    ) -> dict:
        """
        Adjust existing content using real OpenAI GPT-4o.
        Raises OpenAINotConfiguredError when OpenAI API key is missing.
        adjustment: shorten | professional | casual | engaging | regenerate
        """
        if not settings.is_openai_configured:
            raise OpenAINotConfiguredError(
                "OpenAI API key is not configured. Please set OPENAI_API_KEY in backend/.env to enable AI generation."
            )

        client = self._get_client()

        adjustment_instructions = {
            "shorten": "Make the caption significantly shorter (under 60 words) while keeping the key message.",
            "professional": "Rewrite in a more professional, formal tone. Remove casual language and emojis.",
            "casual": "Rewrite in a more casual, friendly, conversational tone. Add warmth and personality.",
            "engaging": "Make the caption more engaging and interactive. Add a compelling hook and stronger CTA.",
            "regenerate": f"Completely rewrite with a fresh perspective on the topic: {topic or 'original topic'}. Different angle, same topic.",
        }

        instruction = adjustment_instructions.get(adjustment, adjustment_instructions["engaging"])

        prompt = f"""You are an expert Instagram copywriter.

Current caption:
{caption}

Current hashtags:
{', '.join(hashtags)}

Task: {instruction}

Return ONLY valid JSON:
{{
  "caption": "adjusted caption",
  "hashtags": ["#tag1", "#tag2"],
  "call_to_action": "cta text"
}}"""

        try:
            response = await client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert Instagram content creator. Always respond with valid JSON only."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=settings.openai_max_tokens,
                temperature=0.9,
                response_format={"type": "json_object"},
            )

            data = json.loads(response.choices[0].message.content)
            new_hashtags = [
                h if h.startswith("#") else f"#{h}"
                for h in data.get("hashtags", hashtags)
                if h and isinstance(h, str)
            ][:20]

            return {
                "caption": data.get("caption", caption).strip(),
                "hashtags": new_hashtags,
                "call_to_action": data.get("call_to_action", "").strip(),
                "is_demo": False
            }

        except Exception as e:
            if isinstance(e, OpenAINotConfiguredError):
                raise
            err_str = str(e)
            logger.error(f"Regeneration error ({type(e).__name__}): {err_str}")
            if "credit_balance_exhausted" in err_str or "insufficient_quota" in err_str:
                raise ValueError(
                    "OpenAI quota exceeded: You have no credits remaining on your OpenAI account. "
                    "Please add credits at https://platform.openai.com/settings/organization/billing/."
                )
            if "invalid_api_key" in err_str:
                raise ValueError("OpenAI API key is invalid. Please check OPENAI_API_KEY in backend/.env.")
            raise ValueError(f"OpenAI regeneration failed: {err_str}")


# Singleton
ai_service = AIService()
