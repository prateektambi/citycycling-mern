# CityCycling Platform Features

Current feature set as of Feb 2026.

## 🚀 Admin Portal
The command center for store operations.

### 1. ☀️ Morning Dashboard
*   **Real-time Overview**: Instant view of today's operational load.
*   **Financial Alerts**:
    *   **Overdue Tracker**: Automatically calculates debts based on *Cost Till Today* vs *Amount Paid*.
    *   **Pending Settlements**: Tracks returned orders waiting for deposit refund/closure.
    *   **Pending Refunds**: Tracks orders tagged for refunds.
*   **Operational Schedules** (Next 7 Days):
    *   Upcoming Deliveries & Pickups.
    *   Upcoming Returns.
*   **Actionable Cards**: One-click Call / WhatsApp / Status Update directly from the dashboard.

### 2. 📦 Order Management
*   **Create Order**: Admin-led booking for walk-ins or phone requests.
    *   Live inventory check (prevents double-booking).
    *   Flexible pricing (Daily, Weekly, Monthly rates).
*   **Manage Order (The "Brain")**:
    *   **Financials**: Record partial payments (Cash/UPI/Card), track deposits, issue refunds.
    *   **Logistics**: specific delivery/pickup slots and charges.
    *   **Dynamic Pricing**: System calculates "Cost Till Today" for early returns or extensions.
    *   **WhatsApp Integration**: Send pre-filled templates (Booking Confirmed, Payment Due, Location, etc.) directly to customer.
*   **Workflow Control**: Status transitions (On-Hold → Confirmed → In-Progress → Returned → Completed).
    *   **Tags**: Custom tags like `Prepped`, `Damage-Assessment`, `Missing-Accessory`.
    *   **P&L Tracking**: Record actual delivery and return costs separately from customer-billed charges to calculate Profit & Loss accurately.
*   **Order Dashboard**: Intelligent default filtering shows only active orders (`On-Hold` to `Returned`) to keep the workspace clean, while allowing deep search across historical completed/cancelled data.
*   **Automated Admin Alerts**: Instant email notifications for new online bookings and when a user directly cancels an order.

### 3. 👥 User Management
*   **Customer Database**: Search users by Name, Email, or Phone.
*   **Profile Access**: View customer's order history and contact details.
*   **Credential Sharing**: Send one-click WhatsApp message with generated login credentials.

### 4. 🚲 Inventory & Fleet
*   **Dual-Layer Inventory**:
    *   **Catalogue Products**: The "Marketing" view (e.g., "City Hybrid - Medium").
    *   **Physical Items**: The "Asset" view (Unique ID for every physical bike).
*   **Asset Tracking**: Status tracking for each physical bike (Available, Rented, Maintenance, Lost).
*   **Calendar Sync**: Booking system blocks inventory to prevent overlaps.

---

## 🛒 Customer Portal
Web interface for end-users.

### 1. Browsing & Account
*   **Catalogue**: Browse available bikes with filtering.
*   **Product Details**: Specs, sizing, and images.
*   **User Dashboard**:
    *   **My Orders**: View active and past rentals with full financial breakdown.
    *   **Profile**: Manage contact info and addresses.

### 2. Authentication
*   **Secure Access**: JWT-based authentication.
*   **Social Login**:
    *   **Google**: One Tap popup + button on login/register pages.
    *   **LinkedIn**: OAuth 2.0 with OpenID Connect.
*   **Email Verification**: Token-based email proof.
*   **Password Management**: Forgot/Reset password flows via email.

### 3. Community & Content
*   **Blog/Journal**: Read latest stories, event announcements, and tips.
    *   Powered by Sanity Headless CMS for rapid content publishing.
    *   Dynamic rendering with optimized images and modular content blocks.

### 4. 🛒 E-Commerce & Booking
*   **Multi-Product Cart**: Add multiple bikes, adjust quantities, select rental dates, and view live availability.
*   **Online Booking & Checkout**: Transparent breakdown of rental cost, logistics, and refundable deposits before confirming a booking.
*   **Order Tracking & Actions**: View past and active rentals. Users can seamlessly cancel `On-Hold` orders directly, and are prompted to reach out for active modifications.

---
## ⚙️ Infrastructure & Tech
*   **Role-Based Access**: Strict separation between Admin and User capabilities.
*   **Analytics**: Integrated Google Analytics 4 (GA4) support.
*   **Notifications**:
    *   **Email**: Transactional emails for auth events.
    *   **WhatsApp**: Admin-triggered operational updates.
