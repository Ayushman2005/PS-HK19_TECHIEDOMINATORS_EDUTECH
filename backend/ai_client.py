import os
import json
import google.generativeai as genai
from ollama import AsyncClient
from config import settings

class AIClient:
    def __init__(self):
        self.use_gemini = bool(settings.gemini_api_key)
        
        if self.use_gemini:
            print("[AI] Using Google Gemini Engine")
            genai.configure(api_key=settings.gemini_api_key)
            self.gemini_model = genai.GenerativeModel(settings.gemini_model)
        else:
            print("[AI] Using Local Ollama Engine")
            # Connects to your local Ollama server
            self.ollama_client = AsyncClient(host="http://localhost:11434")
            self.model_name = "llama3"

    async def complete(self, prompt: str, max_tokens: int = 1500) -> dict:
        """Asynchronous completion using either Gemini or Local Ollama."""
        if self.use_gemini:
            return await self._complete_gemini(prompt, max_tokens)
        else:
            return await self._complete_ollama(prompt, max_tokens)

    async def _complete_gemini(self, prompt: str, max_tokens: int) -> dict:
        try:
            # We use a thread-safe wrapper or just call it since it's a simple API call
            # Note: generativeai's generate_content is synchronous by default, 
            # but we can use generate_content_async.
            response = await self.gemini_model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=max_tokens,
                    temperature=0.7,
                )
            )
            return {"text": response.text, "web_sources": []}
        except Exception as e:
            return {"text": f"[Gemini Error] {str(e)}", "web_sources": []}

    async def _complete_ollama(self, prompt: str, max_tokens: int) -> dict:
        try:
            response = await self.ollama_client.generate(
                model=self.model_name,
                prompt=prompt,
                options={"num_predict": max_tokens},
            )
            return {"text": response["response"], "web_sources": []}
        except Exception as e:
            return {
                "text": f"[Ollama Error] Is Ollama running? Details: {str(e)}",
                "web_sources": [],
            }
