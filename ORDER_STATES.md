# Order State Management System

The order management system uses a **State Machine** based on two layers:
1.  **Primary Order Status** (The lifecycle stage of the order)
2.  **Secondary Tags** (Operational flags or issues needing attention)

## 1. Primary Order States
There are **6 defined states** that an order can move through.

| State | Description | Transitions Out |
| :--- | :--- | :--- |
| **`On-Hold`** | **Default state.** Created when a user places an order. Inventory is blocked immediately. | → `Confirmed`<br>→ `Cancelled` |
| **`Confirmed`** | The booking is confirmed. Operational tags are usually active here. | → `In-Progress`<br>→ `Cancelled` |
| **`In-Progress`** | The bike/items have been handed over to the customer. | → `Returned`<br>→ `Cancelled` |
| **`Returned`** | The customer has returned the items, but the order is not yet closed (e.g., pending inspection or refund). | → `Completed` |
| **`Completed`** | Final state. Payment is fully settled, inventory is released, and no further action is needed. | *None* |
| **`Cancelled`** | The order was cancelled. Inventory is released immediately. | *None* |

---

## 2. Secondary Tags
Tags are used to flag specific conditions without blocking the main state flow.

### Operational Tags (Active during Confirmed)
*   `Prepped`: The bike is ready for handover.
*   `Delivery-Pending`: The item is waiting to be delivered to the customer.
*   `Awaiting-Pickup`: The item is ready at the shop for the customer to pick up.

### Issue Tags (Active during In-Progress / Returned)
*   `Overdue`: Added automatically if the return date has passed.
*   `Damage-Assessment`: Flagged if damage is reported during return.
*   `Missing-Accessory`: Flagged if items are missing upon return.

### Accounting Tags
*   `Refund-Pending`: Added automatically on cancellation if money needs to be returned.
*   `Pending-Settlement`: Use this when final calculation is needed before closing.

---

## 3. Transition Logic & Side Effects

Here is how the system handles moving between these states:

### A. `On-Hold` → `Confirmed`
*   **Triggers:** Manual confirmation by Admin.
*   **Auto-Actions:**
    *   Removes `Delivery-Pending` tag (if previously auto-added).
    *   Sends **"Booking Confirmed"** WhatsApp message.

### B. `Confirmed` → `In-Progress`
*   **Triggers:** Bike handover to customer.
*   **Auto-Actions:**
    *   **Removes** operational tags: `Prepped`, `Awaiting-Pickup`.
    *   Sends **"Bike Handed Over"** WhatsApp message.

### C. `In-Progress` → `Returned`
*   **Triggers:** Customer returns the item.
*   **Auto-Actions:**
    *   **Checks Date:** If `Now > EndDate`, automatically adds the **`Overdue`** tag.
    *   Sends **"Return Received"** WhatsApp message.

### D. `Returned` → `Completed`
*   **Condition:** Payment Status MUST be `Paid`. (Cannot complete if `Unpaid` or `Partial`).
*   **Auto-Actions:**
    *   **Clears ALL Tags**.
    *   Releases Inventory Block (Safety check).
    *   Sends **"Order Completed"** WhatsApp message.

### E. `*` → `Cancelled`
*   **Triggers:** Cancellation from any active state.
*   **Auto-Actions:**
    *   **Releases Inventory** immediately.
    *   **Checks Payment:** If `TotalPaid > 0`, automatically adds **`Refund-Pending`** tag.
    *   Sends **"Order Cancelled"** WhatsApp message.
