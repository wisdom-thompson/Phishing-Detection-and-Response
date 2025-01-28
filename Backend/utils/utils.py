import re
import logging
from typing import List

def extract_urls(text: str) -> List[str]:
    """Extract URLs from the given text.

    Args:
        text (str): The input text from which to extract URLs.

    Returns:
        List[str]: A list of unique extracted URLs.
    """
    # Regular expression to match URLs
    url_pattern = (
        r'https?://'  # Protocol
        r'(?:(?:[-\w.]|(?:%[\da-fA-F]{2}))+|'  # Domain name
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|'  # OR IPv4
        r'\[?[a-fA-F0-9]*:[a-fA-F0-9:]+\]?)'  # OR IPv6
        r'(?::\d+)?'  # Optional port
        r'(?:/?|[/?]\S+)$'  # Path and optional query parameters
    )
    
    try:
        urls = re.findall(url_pattern, text)
        unique_urls = list(set(urls))  # Remove duplicates
        logging.info(f"Extracted {len(unique_urls)} unique URLs from the text.")
        return unique_urls
    except Exception as e:
        logging.error(f"Error extracting URLs: {e}")
        return []