# Admin Morning Dashboard Guide

The **Admin Dashboard** is your daily command center. It gives you an instant snapshot of what needs attention **today**.

## 📊 Summary Bar
Top-level metrics to check the pulse of operations:
- **Overdue**: Critical! Number of orders with unpaid dues.
- **Deliveries**: Deliveries scheduled for the next 7 days.
- **Returns**: Returns scheduled for the next 7 days.
- **Settlement**: Returned orders waiting for security deposit refund/closure.
- **Refunds**: Orders tagged `Refund-Pending`.

---

## 🚨 Critical Sections (Action Required)

### 1. 🔴 Overdue Orders
**Logic**: Shows orders where `Cost Till Today` > `Amount Paid`.
- **Amber Amount**: "To Pay" (The customer owes this amount **now**).
- **Green Amount**: "Credit" (The customer has paid in advance).
- **Action**: Use the **WhatsApp** button to send a payment reminder.

### 2. 🟠 Overdue Returns
**Logic**: Active orders where the `End Date` has passed.
- These customers have kept the bike longer than booked.
- **Action**: Call or WhatsApp to request return or extension.

### 3. 🟣 Pending Settlement
**Logic**: Orders marked as `Returned` but not yet `Completed`.
- The bike is back, but you haven't refunded the deposit or closed the order.
- **Action**: Check bike damage → deduct if needed → refund deposit → mark `Completed`.

### 4. 🟡 Needs Prep
**Logic**: Confirmed orders starting soon that are NOT tagged `Prepped`.
- **Action**: Get the bike ready, clean/service it, then toggle the `Prepped` tag on the card.

### 5. 🟠 Pending Refunds
**Logic**: Any order (Cancelled or Active) tagged with `Refund-Pending`.
- **Action**: Process the refund in the order details page, then remove the tag.

---

## 📅 Operational Sections (Next 7 Days)

- **Upcoming Deliveries**: Confirmed orders starting in the next 7 days.
- **Upcoming Pickups**: Customer coming to pick up from store.
- **Upcoming Returns**: Customers scheduled to return bikes.
- **Upcoming Orders**: All future bookings starting soon.

> **💡 Pro Tip**: Look for the **TODAY** badge to prioritize immediate tasks.

---

## ⚡ Quick Actions

On every card, you can:
- **📞 Call**: One-tap dial.
- **💬 WhatsApp**: Opens a pre-filled message with Order ID.
- **STATUS**: Change order status (e.g., from `Confirmed` → `In-Progress`) directly without opening the full page.
- **TAGS**: Quickly mark as `Prepped` or `Overdue` using the toggle buttons.

---

## ❓ FAQ

**Q: Why does "Overdue" show an amount even if they paid the deposit?**
A: The calculation uses `Rent Cost Till Today`. Even if they paid a deposit, if their daily rental usage exceeds what they paid (minus deposit), they owe money.

**Q: A cancelled order is showing "Refund Pending"?**
A: Yes, if you cancelled an order but forgot to refund the payment, it will stay here until you process it and remove the tag.
