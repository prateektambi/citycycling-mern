# Availability System Overview

This document outlines the full stack implementation of the product availability system in the City Cycling application.

## 1. Data Model (`Product.js` Model)

The core source of truth for availability is the `Product` model.

*   **`inventoryCount` (Number):** The base total number of physical units available for a product. This is updated when new Items are added or retired.
*   **`availability` (Map):** A pre-calculated map where:
    *   **Key:** Date string in `YYYY-MM-DD` format.
    *   **Value:** Number of units available on that specific date.
    *   This map covers a rolling window (default 120 days) and is updated asynchronously to keep read operations fast.

## 2. Backend Logic

### A. Availability Calculation (`availabilityUpdater.js`)
This utility function `updateProductAvailability(productId)` is responsible for populating the `availability` map.
1.  **Scope**: It looks ahead for a configured window (e.g., 120 days).
2.  **Initialization**: For every day in the window, it sets the available count to `inventoryCount`.
3.  **Consumption**: It finds all active orders (status: `On-Hold`, `Confirmed`, `In-Progress`) containing the product.
4.  **Subtraction**: For each booking in those orders, it subtracts the booking quantity from the availability count for every day in the booking range.
    *   **Same-Day Turnaround**: The `isLastDayAvailable` flag defaults to `true`. This means the return date is EXCLUDED from occupancy calculations, allowing another order to start on the same day (e.g., return at 10 AM, rent at 2 PM).
5.  **Persistence**: The updated map is saved back to the Product document.

### B. Stock Validation (`availability.js`)
This utility `isTotalStockAvailable(productId, requestedBookings, excludeOrderId)` is used *before* allowing an order to be created or updated.
*   It performs a real-time check by querying all conflicting orders in the database for the requested dates.
*   It does *not* rely solely on the pre-calculated map to ensure absolute correctness during the critical transaction phase.
*   It ensures `Daily Occupancy + New Request <= Total Inventory`.

### C. Triggers (Controllers)
The availability map is recalculated ("repaired") automatically in the following scenarios:

*   **Order Creation (`orderController.js`):**
    *   Validation: Calls `isTotalStockAvailable` to prevent overbooking.
    *   Update: After a successful order creation, it triggers `updateProductAvailability` in the background (fire-and-forget).
*   **Order Update (`orderController.js`):**
    *   Validation: Checks availability for new dates/quantities, excluding the current order's previous state.
    *   Update: Triggers recalculation for all products involved in the order (both old and new).
        *   **Note**: Toggling the `isLastDayAvailable` field on an existing order counts as an update and will immediately trigger this recalculation, updating the map to reflect the freed-up days.
*   **Order Cancellation (`orderController.js`):**
    *   Action: Sets order status to `Cancelled` and releases inventory.
    *   Update: Triggers recalculation to restore availability.
*   **Item Management (`itemController.js`):**
    *   Action: When a physical Item is marked as `maintenance` or `retired`, the base `inventoryCount` decreases.
    *   Update: Triggers `syncProductInventory` -> `updateProductAvailability` to reflect lower capacity.

### D. Manual Repair Endpoint
*   **Route**: `POST /api/products/repair/:id`
*   **Purpose**: A fallback mechanism to force a full recalculation if the map ever gets out of sync. It counts actual `Available` items and then rebuilds the map.

## 3. Frontend Implementation

### A. Catalogue Page (`Catalogue.jsx`)
Allows users to filter products based on availability.
*   **Logic**: Uses the `product.availability` map directly for instant client-side filtering.
*   **Filters**:
    *   `Today`: Checks if availability > 0 for the next 2 days.
    *   `Weekend`: Checks availability for the upcoming Saturday/Sunday.
    *   `7 Days`: Checks availability for the next 7 days.

### B. Product Page (`ProductPage.jsx`)
Displays a visual calendar of availability.
*   **Visuals**:
    *   **Green**: Available (> 0 units).
    *   **Red/Gray**: Unavailable or Sold Out.
*   **Data Source**: Reads directly from `product.availability` map.
*   **UI**: Shows exact "X Left" counts for each day.

### C. Admin Interfaces
*   **Create/Manage Order**: The admin forms rely on the backend validation (`isTotalStockAvailable`) when submitting. If stock is low, the server rejects the request with a specific error message.
*   **Manage Product**: Includes a "Repair Sync" button that calls the manual repair endpoint.

## Summary of Flow
1.  **User/Admin Request**: "I want to book Bike X for next weekend."
2.  **Validation**: Server checks real-time DB if `Total Inventory - Existing Bookings >= Requested Qty`.
3.  **Transaction**: If valid, Order is saved.
4.  **Background Update**: Server recalculates the 120-day availability map for Bike X.
5.  **Frontend Update**: Next time anyone loads the Catalogue or Product page, the `availability` map reflects the new lower stock for those dates.
