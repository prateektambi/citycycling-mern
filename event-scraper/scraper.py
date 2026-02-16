import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import json
import os
import time
import sys

# Force UTF-8 for Windows console
sys.stdout.reconfigure(encoding='utf-8')

def fetch_bbch():
    """Scrapes bbch.in for racing events."""
    url = "https://bbch.in/races/" 
    print(f"Scraping BBCH: {url}")
    try:
        response = requests.get(url, timeout=20)
        # Fallback to home if races/ fails or returns 404
        if response.status_code != 200:
             print("BBCH /races failed, trying root...")
             response = requests.get("https://bbch.in/", timeout=20)

        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        text_content = soup.get_text(separator='\n', strip=True)
        return f"SOURCE: BBCH.IN\nURL: {url}\nCONTENT:\n{text_content[:20000]}" # Limit size for LLM
    except Exception as e:
        print(f"Error scraping BBCH: {e}")
        return ""

def fetch_audax():
    """Scrapes Audax India for Bangalore events."""
    url = "https://www.audaxindia.in/events.php"
    print(f"Scraping Audax India: {url}")
    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Filter for Bangalore events? 
        # For now, let's grab the whole table or list and let the LLM filter for 'Bangalore'.
        # The page likely has a huge list. 
        # We can extract text and prepend "Context: Filter for Bangalore events".
        
        text_content = soup.get_text(separator='\n', strip=True)
        return f"SOURCE: AUDAXINDIA.IN\nURL: {url}\nCONTENT:\n{text_content[:30000]}"
    except Exception as e:
        print(f"Error scraping Audax: {e}")
        return ""

def fetch_townscript():
    """Scrapes Townscript for cycling events."""
    url = "https://www.townscript.com/cities/bengaluru/cycling-events" 
    print(f"Scraping Townscript: {url}")
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, timeout=60000)
            
            # Wait for some content to load - maybe event cards?
            try:
                page.wait_for_selector(".event-card", timeout=10000) 
            except:
                print("Townscript: No event cards found immediately, waiting a bit more...")
                time.sleep(5)
            
            content = page.content()
            browser.close()
            
            soup = BeautifulSoup(content, 'html.parser')
            text_content = soup.get_text(separator='\n', strip=True)
            return f"SOURCE: TOWNSCRIPT\nURL: {url}\nCONTENT:\n{text_content[:20000]}"
            
    except Exception as e:
        print(f"Error scraping Townscript: {e}")
        return ""

if __name__ == "__main__":
    print("Starting scraper test run...")
    
    # 1. BBCH
    bbch_data = fetch_bbch()
    print(f"BBCH Data Length: {len(bbch_data)}")
    
    # 2. Audax
    audax_data = fetch_audax()
    print(f"Audax Data Length: {len(audax_data)}")
    
    # 3. Townscript
    ts_data = fetch_townscript()
    print(f"Townscript Data Length: {len(ts_data)}")
    
    # Save raw outputs for inspection
    with open("debug_scraped_data.txt", "w", encoding="utf-8") as f:
        f.write(bbch_data + "\n" + "="*50 + "\n")
        f.write(audax_data + "\n" + "="*50 + "\n")
        f.write(ts_data + "\n")
        
    print("Finished. debug_scraped_data.txt written.")
