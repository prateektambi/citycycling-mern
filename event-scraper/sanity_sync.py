import requests
import os
import json
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

PROJECT_ID = os.getenv("SANITY_PROJECT_ID", "bdo5kfci").strip()
DATASET = os.getenv("SANITY_DATASET", "production").strip()
API_TOKEN = os.getenv("SANITY_API_TOKEN", "").strip()

API_URL = f"https://{PROJECT_ID}.api.sanity.io/v2022-03-07/data/query/{DATASET}"
MUTATION_URL = f"https://{PROJECT_ID}.api.sanity.io/v2022-03-07/data/mutate/{DATASET}"

def check_duplicate(title, published_at):
    """
    Check if a post with the same title and date already exists.
    Returns the document ID if found, else None.
    """
    query = f'*[_type == "post" && title == "{title}" && publishedAt == "{published_at}"][0]._id'
    try:
        response = requests.get(
            API_URL, 
            params={'query': query},
            headers={'Authorization': f'Bearer {API_TOKEN}'}
        )
        response.raise_for_status()
        result = response.json().get('result')
        return result
    except Exception as e:
        print(f"Error checking duplicate: {e}")
        return None

def create_post(event_data):
    """
    Creates a new draft post in Sanity.
    """
    if not API_TOKEN:
        print("Error: SANITY_API_TOKEN is missing.")
        return

    # Check for duplicates
    if check_duplicate(event_data['title'], event_data['publishedAt']):
        print(f"Skipping duplicate: {event_data['title']}")
        return

    # Construct the Sanity document
    mutations = {
        "mutations": [
            {
                "create": {
                    "_type": "post",
                    "title": event_data['title'],
                    "slug": {
                        "_type": "slug",
                        "current": event_data['slug']
                    },
                    "publishedAt": event_data['publishedAt'],
                    "body": [
                        {
                            "_type": "block",
                            "children": [
                                {
                                    "_type": "span",
                                    "text": event_data['body']
                                }
                            ]
                        },
                         {
                            "_type": "block",
                            "children": [
                                {
                                    "_type": "span",
                                    "text": f"Location: {event_data.get('location', 'TBD')}"
                                }
                            ]
                        },
                        {
                            "_type": "block",
                            "children": [
                                {
                                    "_type": "span",
                                    "text": f"Register here: {event_data.get('registrationLink', 'N/A')}"
                                }
                            ]
                        }
                    ]
                    # Note: 'author' and 'mainImage' are left empty for now as requested or can be added later.
                }
            }
        ]
    }

    try:
        response = requests.post(
            MUTATION_URL,
            json=mutations,
            headers={
                'Authorization': f'Bearer {API_TOKEN}',
                'Content-Type': 'application/json'
            }
        )
        if response.status_code >= 400:
            print(f"Error Status: {response.status_code}")
            print(f"Error Body: {response.text}")
        response.raise_for_status()
        print(f"Successfully created post: {event_data['title']}")
        return response.json()
    except Exception as e:
        print(f"Error creating post: {e}")
        if hasattr(e, 'response') and e.response:
             print(e.response.text)

if __name__ == "__main__":
    # Test data
    sample_event = {
        "title": "Test Event from Scraper Agent",
        "slug": "test-event-scraper-agent",
        "publishedAt": datetime.now().isoformat(),
        "body": "This is a test event created by the automated agent.",
        "location": "Bangalore",
        "registrationLink": "https://example.com"
    }
    
    # Only run if token is present
    if API_TOKEN:
        create_post(sample_event)
    else:
        print("Skipping Sanity test due to missing token.")
