import scraper
import llm_processor
import sanity_sync
import json
import time

def main():
    print("Starting Cycling Event Scraper Agent...")
    
    # 1. Scrape Data
    sources = [
        {"name": "BBCH", "fetcher": scraper.fetch_bbch},
        {"name": "Audax India", "fetcher": scraper.fetch_audax},
        {"name": "Townscript", "fetcher": scraper.fetch_townscript}
    ]
    
    all_events = []
    
    for source in sources:
        print(f"\n--- Processing {source['name']} ---")
        try:
            raw_text = source['fetcher']()
            if not raw_text:
                print(f"No data fetched for {source['name']}")
                continue
                
            print(f"Fetched {len(raw_text)} chars. Sending to Gemini...")
            
            # Process with Gemini
            events = llm_processor.process_data(raw_text)
            
            if events:
                print(f"Extracted {len(events)} events from {source['name']}:")
                for e in events:
                    print(f" - {e.get('title')} ({e.get('publishedAt')})")
                all_events.extend(events)
            else:
                print("No events extracted.")
                
        except Exception as e:
            print(f"Error processing {source['name']}: {e}")
            
    print(f"\nTotal events found: {len(all_events)}")
    
    # 2. Sync to Sanity
    print("\n--- Syncing to Sanity ---")
    for event in all_events:
        try:
            sanity_sync.create_post(event)
        except Exception as e:
            print(f"Failed to sync event {event.get('title')}: {e}")
            
    print("\nJob Complete.")

if __name__ == "__main__":
    main()
