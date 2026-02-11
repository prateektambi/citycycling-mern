# CityCycling Color Palette Documentation

This document outlines the color systems used across the CityCycling application to ensure consistency and brand identity.

## 1. Global Design System
The core brand identity is built around **Blue (`blue-600`)** and **Gray/White** for a clean, professional, and trustworthy look.

| Usage | Color Class | Hex (Approx) | Context |
| :--- | :--- | :--- | :--- |
| **Primary Brand** | `bg-blue-600` | #2563EB | Buttons, Links, Highlights |
| **Backgrounds** | `bg-gray-50` | #F9FAFB | Page Backgrounds (Off-white) |
| **Surface** | `bg-white` | #FFFFFF | Cards, Containers |
| **Headings** | `text-gray-900` | #111827 | Main Titles |
| **Body Text** | `text-gray-500` | #6B7280 | Descriptions, Subtitles |
| **Accents** | `bg-blue-50` | #EFF6FF | Icon Backgrounds, Subtle Highlights |

---

## 2. Page-Specific Palettes

### 🏠 Home Page (`HomePage.jsx`)
Uses vibrant gradients and distinct colors to highlight features.

*   **Hero Section:**
    *   Gradient Text: `from-blue-400 to-emerald-300`
    *   Overlay: `from-black/80 via-black/40`
*   **Features:**
    *   Fleet: **Blue** (`bg-blue-50`, `text-blue-600`)
    *   Rates: **Green** (`bg-green-50`, `text-green-600`)
    *   Delivery: **Purple** (`bg-purple-50`, `text-purple-600`)
*   **Dark Hub Section:** Deep dark theme (`bg-gray-900`, `text-white`) with **Blue** glimmers.

### 🚲 Catalogue Page (`Catalogue.jsx`)
Uses a **Cool & Premium** palette to distinguish bike categories.

| Category | Theme Base | Gradient | Emotion |
| :--- | :--- | :--- | :--- |
| **MTB** | **Slate** | `from-slate-50` | Tough, Metallic, Rugged |
| **Road Bike** | **Sky Blue** | `from-sky-50` | Airy, Fast, Light |
| **Hybrid** | **Cyan** | `from-cyan-50` | Modern, Urban, Fresh |
| **Electric** | **Indigo** | `from-indigo-50` | Tech, Power, Electric |
| **Kids** | **Teal** | `from-teal-50` | Playful, Safe |

### 📦 Product Page (`ProductPage.jsx`)
Focuses on clarity and trust signals.

*   **Availability:**
    *   Available: **Green** (`bg-green-50`, `text-green-700`)
    *   Out of Stock: **Red** (`bg-red-50`, `text-red-500`)
*   **Security Deposit:** **Orange** (`bg-orange-50`, `text-orange-900`, `border-orange-100`) - Used to draw attention to important financial info.
*   **Pricing:** **Emerald** (`text-emerald-600`) for "Weekly Saver" to indicate money-saving.

### 🔐 Auth Pages (`Login.jsx`, `Register.jsx`)
Clean and minimal to focus on the form.
*   **Brand:** `text-blue-600`
*   **Inputs:** `bg-gray-50`, `focus:ring-blue-500`
*   **Errors:** `bg-red-50`, `text-red-600`

### 🛡️ Admin Dashboard (`AdminLayout.jsx`)
Functional and high-contrast.
*   **Sidebar Active:** `bg-blue-50`, `text-blue-600`
*   **Sidebar Idle:** `text-gray-600`, `hover:bg-gray-50`
*   **Mobile Header:** `bg-blue-600`, `text-white`
