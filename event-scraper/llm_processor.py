import google.generativeai as genai
import os
from dotenv import load_dotenv
import json
import datetime

load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in .env")

genai.configure(api_key=api_key)

# Model setup
# Using gemini-1.5-pro for best performance on complex extraction
model = genai.GenerativeModel('gemini-flash-latest') 

def process_data(raw_text):
    """
    Sends raw text to Gemini and expects a strict JSON response
    compliant with Sanity's Post schema.
    """
    
    current_date = datetime.date.today().isoformat()
    
    prompt = f"""
    You are an expert data extraction agent. 
    Analyze the following text which contains cycling event information.
    Extract distinct events and format them as a JSON array.
    
    Target Schema (Sanity 'post' type):
    - title: String (Official name of the event)
    - slug: String (SEO-friendly, kebab-case, unique)
    - publishedAt: ISO 8601 Date String (Date of the event). If time is available, include it. If multiple dates, use the start date.
    - body: String (A concise summary of the event description. Do NOT use Markdown, just plain text. Include location and key details.)
    - registrationLink: String (URL for registration if found)
    - location: String (City/Area where the event happens)
    
    Context:
    - Today's date is {current_date}. 
    - Only include future events or events happening today.
    - If the text mentions 'Bangalore' or 'Bengaluru', prioritize those.
    - If no explicit year is mentioned, assume the upcoming occurrence relative to today.
    
    Output Constraint:
    - Return ONLY valid JSON.
    - No markdown formatting (no ```json code blocks).
    - Return an empty array [] if no relevant events are found.
    
    Raw Text:
    {raw_text}
    """
    
    import time
    from google.api_core import exceptions

    retries = 3
    for attempt in range(retries):
        try:
            response = model.generate_content(prompt)
            # Clean response if it contains markdown code blocks
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
                
            return json.loads(text.strip())
        except exceptions.ResourceExhausted as e:
            print(f"Quota exceeded. Retrying in 60 seconds... (Attempt {attempt + 1}/{retries})")
            time.sleep(60)
        except Exception as e:
            print(f"Error processing with LLM: {e}")
            if "429" in str(e):
                 print(f"Quota exceeded (generic error). Retrying in 60 seconds... (Attempt {attempt + 1}/{retries})")
                 time.sleep(60)
            else:
                return []
    return []

if __name__ == "__main__":
    # Test with dummy data
    sample_text = """
    Upcoming Race: Nandi Hill Climb
    Date: 25th Dec 2026.
    Location: Nandi Hills, Bangalore.
    Register at www.bbch.in
    """
    result = process_data(sample_text)
    print(json.dumps(result, indent=2))
