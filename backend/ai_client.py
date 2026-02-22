import ollama
from ollama import AsyncClient


class AIClient:
    def __init__(self):
        # Connects to your local Ollama server
        self.client = AsyncClient(host="http://localhost:11434")

        # You can change this to 'mistral' or 'phi3' if you prefer
        self.model_name = "llama3"

    async def complete(self, prompt: str, max_tokens: int = 1500) -> dict:
        """Asynchronous completion using Local Ollama."""
        try:
            response = await self.client.generate(
                model=self.model_name,
                prompt=prompt,
                options={"num_predict": max_tokens},
            )

            text = response["response"]

            # Note: Local models do not have built-in Google Search grounding.
            # We return an empty list to keep the frontend from breaking.
            return {"text": text, "web_sources": []}

        except Exception as e:
            return {
                "text": f"[AI Error] Is Ollama running? Run 'ollama run llama3' in your terminal. Details: {str(e)}",
                "web_sources": [],
            }
