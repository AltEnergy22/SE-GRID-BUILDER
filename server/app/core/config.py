from pathlib import Path
from pydantic_settings import BaseSettings
import logging
from pythonjsonlogger import jsonlogger


class Settings(BaseSettings):
    grids_path: Path = Path("grids")
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"


def setup_logging():
    """Set up structured JSON logging."""
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Remove default handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create JSON formatter
    json_formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(name)s %(levelname)s %(message)s"
    )
    
    # Console handler with JSON formatting
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(json_formatter)
    logger.addHandler(console_handler)


settings = Settings()
setup_logging() 