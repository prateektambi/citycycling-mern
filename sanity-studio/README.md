# Sanity CMS Setup & Configuration

This guide details how the CityCycling platform integrates with Sanity CMS for managing the Blog/Journal and Event content.

## 1. Local Development Setup
The `sanity-studio` directory contains the admin studio.
1. Run `npm install` inside the `sanity-studio` directory.
2. Run `npm run dev` to start the studio locally at `http://localhost:3333`.

## 2. Dataset Visibility (Crucial for Frontend)
If your frontend `BlogList.jsx` or API fetch queries return an empty array `[]` but you know posts exist, the dataset is likely set to Private.

For a public blog, the dataset should be public. Since API tokens may not have permission to change this via CLI:
1. Go to your Sanity Dashboard at [sanity.io/manage](https://www.sanity.io/manage).
2. Select your Project (Project ID: `bdo5kfci`).
3. Navigate to **Datasets**.
4. Change the `production` dataset visibility to **Public**.

## 3. CORS Configuration
Sanity will block requests from unauthorized domains. You MUST add both your local environment and production domains to the CORS list.

1. Go to your Sanity Dashboard -> **API** tab.
2. Under **CORS Origins**, click **Add CORS origin**.
3. Add `http://localhost:5173` (Check "Allow credentials").
4. Add your production URL (e.g., `https://citycycling.in` and `https://www.citycycling.in`) (Check "Allow credentials").

## 4. Frontend Client (`sanityClient.js`)
* **`useCdn` flag**: Set `useCdn: true` in production for faster edge caching. If you are actively debugging newly published posts and they aren't showing up, you can temporarily set it to `false` to bypass the cache.
* **API Token**: Since the dataset is public, the frontend does **not** need a `VITE_SANITY_API_TOKEN` to read posts.
