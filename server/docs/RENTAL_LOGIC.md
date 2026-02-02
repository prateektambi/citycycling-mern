# Rental & Balance Calculation Logic

This document outlines the logic used to calculate the "Current Cost" and "Balance/Overdue" status for active rentals.

## 1. Core Principle
For active orders (`In-Progress`, `Returned`), the system calculates the **Cost Till Today** dynamically rather than relying on the predetermined end date. This allows for real-time tracking of overdue payments based on actual usage.

## 2. Duration Calculation
*   **Start Date**: The booking's start date (00:00:00).
*   **End Date**: Today's date (00:00:00).
*   **Formula**: `Days Elapsed = ceil( (Today - StartDate) / ms_per_day ) + 1`
    *   *Note: Taking a bike today counts as 1 day of usage.*

## 3. Pricing Rules

### A. Weekly Rentals
The system applies a smart logic to ensure the customer gets the best (or standard) rate between "Full Weeks" and "Week + Extra Days".

**Rule 1: Minimum One Week**
*   If `Days Elapsed <= 7`: Cost = `1 Week Rate`.

**Rule 2: Smart Ceiling (for > 7 Days)**
For durations longer than a week, the system compares two methods and picks the cheaper one:

1.  **Ceiling Method (Standard)**: Rounds up partial weeks to the next full week.
    *   `Weeks Charged = ceil(Days / 7)`
    *   `Cost = Weeks Charged * WeeklyRate`
    *   *Example: 20 Days (2w 6d) -> Charged as 3 Weeks.*

2.  **Mixed Method (Pro-Rata Extras)**: Charges full weeks plus specific daily extra rates.
    *   `Full Weeks = floor(Days / 7)`
    *   `Extra Days = Days % 7`
    *   `Cost = (Full Weeks * WeeklyRate) + (Extra Days * DailyExtraRate)`
    *   *Example: 22 Days (3w 1d) -> Charged as 3 Weeks + 1 Day Extra.*
        *(Because 3 Weeks + 1 Day is usually cheaper than rounding up to 4 Weeks).*

**Selection Logic**: `Final Cost = Min(Ceiling Method, Mixed Method)`

### B. Monthly Rentals
*   **Formula**: `Months Charged = ceil(Days / 30)`
*   `Cost = Months Charged * MonthlyRate`

### C. Daily Rentals
*   **Formula**: `Cost = Days Elapsed * DailyRate`

## 4. Balance & Overdue Status
The displayed status on the Order List and Manage Order pages is derived as follows:

1.  **Total Usage Cost**: Sum of current rental costs for all items + Logistics Charges.
2.  **Net Paid**: `Total Payments - Total Refunds`.
3.  **Current Balance**: `Total Usage Cost - Net Paid`.

**Status Labels:**
*   **Overdue (Red)**: Balance > 0 (Customer owes money for usage up to today).
*   **Balance (Green)**: Balance < 0 (Customer has paid more than current usage).
