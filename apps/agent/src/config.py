import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ETHERSCAN_API_KEY: str = os.getenv("ETHERSCAN_API_KEY", "")
    FORK_RPC_URL: str = os.getenv("FORK_RPC_URL", "https://eth.llamarpc.com")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    PORT: int = int(os.getenv("PORT", "8000"))
    SANDBOX_TIMEOUT_SECONDS: int = int(os.getenv("SANDBOX_TIMEOUT_SECONDS", "60"))

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
