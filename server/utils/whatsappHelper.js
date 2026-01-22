// server/utils/whatsappHelper.js

/**
 * WhatsApp Message Templates
 * Each template is a function that generates a message based on order data
 */

const MESSAGE_TEMPLATES = {
    order_created: (order) => {
        const firstBike = order.bookings[0];
        const startDate = new Date(firstBike.startDate).toLocaleDateString('en-IN');
        return `Hi ${order.customer.name}! 🚴

Thank you for your rental inquiry with CityCycling! 

*Order ID:* ${order.orderId}
*Bikes:* ${order.bookings.map(b => `${b.quantity}x ${b.productCode || b.name}`).join(', ')}
*Rental Start:* ${startDate}
*Total Amount:* ₹${order.financials.grandTotal}

Your booking is currently *On-Hold*. We'll confirm availability and get back to you shortly!

Questions? Call us at +91-8971552453`;
    },

    booking_confirmed: (order) => {
        const firstBike = order.bookings[0];
        const startDate = new Date(firstBike.startDate).toLocaleDateString('en-IN');
        const endDate = new Date(firstBike.endDate).toLocaleDateString('en-IN');
        const paymentDue = order.financials.grandTotal - order.financials.paymentHistory.reduce((s,p) => s + p.amount, 0);
        
        return `Great news ${order.customer.name}! ✅

Your booking is *CONFIRMED*!

*Order ID:* ${order.orderId}
*Bikes:* ${order.bookings.map(b => `${b.quantity}x ${b.productCode || b.name}`).join(', ')}
*Duration:* ${startDate} to ${endDate}

${order.logistics.delivery.type === 'Home-Delivery' 
    ? `🚚 *Home Delivery* scheduled` 
    : `📍 *Self-Pickup* from our store at Mayfair Anthem, Marathahalli`}

${paymentDue > 0 ? `*Payment Due:* ₹${paymentDue}` : ''}

See you soon! 🎉`;
    },

    bike_handed_over: (order) => {
        const endDate = new Date(order.bookings[0].endDate).toLocaleDateString('en-IN');
        return `Happy Riding ${order.customer.name}! 🚴‍♂️

Your bike(s) are now with you. Have a great ride!

*Order ID:* ${order.orderId}
*Return Date:* ${endDate}

${order.logistics.return.type === 'Home-Collection' 
    ? `🏠 We'll collect from your location on the return date` 
    : `📍 Please return to our store by ${endDate}`}

*Important:* Please check the bike condition before riding. Report any issues immediately!

Ride safe! 🛡️`;
    },

    return_received: (order) => {
        const hasOverdue = order.tags.includes('Overdue');
        const hasDamage = order.tags.includes('Damage-Assessment');
        const pendingSettlement = order.financials.grandTotal - order.financials.paymentHistory.reduce((s,p) => s + p.amount, 0) + order.financials.totalDeposit;
        
        let message = `Thank you ${order.customer.name}! 🙏

We've received your bike(s) back.

*Order ID:* ${order.orderId}`;

        if (hasDamage) {
            message += `\n\n⚠️ *Damage Assessment in Progress*\nOur team is inspecting the bike. We'll share the assessment report shortly.`;
        }

        if (hasOverdue) {
            message += `\n\n⏰ *Late Return*\nYour return was after the scheduled date. Overdue charges may apply.`;
        }

        if (pendingSettlement > 0) {
            message += `\n\n*Pending Settlement:* ₹${pendingSettlement}`;
        }
        
        message += `\n\nWe'll process your final settlement and refund shortly!`;

        return message;
    },

    order_cancelled: (order) => {
        const totalPaid = order.financials.paymentHistory.reduce((s,p) => s + p.amount, 0);
        
        return `Hi ${order.customer.name},

Your order *${order.orderId}* has been cancelled as requested.

${totalPaid > 0 
    ? `💰 *Refund Due:* ₹${totalPaid}\nWe'll process this within 2-3 business days.` 
    : ''}

We hope to serve you again soon! 🚴

Have questions? Call us at +91-8971552453`;
    },

    order_completed: (order) => {
        return `Thank you ${order.customer.name}! ⭐

Your order *${order.orderId}* is now *COMPLETED*.

${order.financials.totalDeposit > 0 
    ? `✅ *Security Deposit Refunded:* ₹${order.financials.totalDeposit}` 
    : ''}

We'd love to hear about your experience! Please rate us on Google.

See you on your next ride! 🚴‍♀️`;
    },

    damage_reported: (order) => {
        return `Hi ${order.customer.name},

We've noted some damage on the bike from order *${order.orderId}*.

*Status:* Under Assessment 🔍

Our team is evaluating the damage. We'll share:
- Detailed damage report
- Repair costs (if applicable)
- Settlement amount

We'll contact you within 24 hours.

Questions? Call us at +91-8971552453`;
    },

    overdue_reminder: (order) => {
        const daysOverdue = Math.ceil((new Date() - new Date(order.bookings[0].endDate)) / (1000 * 60 * 60 * 24));
        
        return `Hi ${order.customer.name},

Your rental for order *${order.orderId}* was due ${daysOverdue} day(s) ago.

Please return the bike ASAP to avoid additional charges.

⏰ *Overdue Charges Apply*

${order.logistics.return.type === 'Home-Collection' 
    ? `Need collection? Let us know!` 
    : `Return to: Mayfair Anthem, Marathahalli`}

Contact: +91-8971552453`;
    },

    // --- NEW DASHBOARD TEMPLATES ---

    pickup_reminder: (order) => {
        return `Hi ${order.customer.name}! 🚲

Just checking in - are you planning to pick up your bike rental today?

*Order:* ${order.orderId}
*Location:* Mayfair Anthem, Marathahalli
*Shop Hours:* 10:00 AM - 8:00 PM

Please let us know your expected arrival time so we can have everything ready!`;
    },

    delivery_coordination: (order) => {
        return `Hi ${order.customer.name},

We have your bike delivery scheduled for today! 🚚

*Order:* ${order.orderId}
*Address:* ${order.customer.address}

Could you please confirm a convenient time slot for us to drop off the bike?

Thanks!`;
    },

    extension_check: (order) => {
        return `Hi ${order.customer.name},

Hope you're enjoying the ride! 🚴‍♂️

Your rental is ending soon (Order: ${order.orderId}). 

Would you like to:
1. *Extend* your booking? 
2. *Return* the bike as scheduled?

Let us know, and we'll help you out!`;
    },

    payment_due: (order) => {
        const balance = order.financials.grandTotal - order.financials.paymentHistory.reduce((s,p) => s + p.amount, 0);
        
        if (balance <= 0) {
            return `Hi ${order.customer.name},

Thank you for your payment! Your order *${order.orderId}* is fully paid.

We appreciate your business! 🙏`;
        }
        
        return `Hi ${order.customer.name},

Friendly reminder regarding your order *${order.orderId}*.

There is a pending balance of *₹${balance}*.

Please complete the payment via UPI to this number or pay at the store/delivery.

Thank you!`;
    }
};

/**
 * Generate a WhatsApp URL with pre-filled message
 * @param {String} phone - Customer phone number
 * @param {String} message - Pre-filled message text
 * @returns {String} WhatsApp URL
 */
function generateWhatsAppURL(phone, message) {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Send WhatsApp message (or generate URL for manual sending)
 * @param {Object} order - Order document
 * @param {String} templateName - Name of message template
 * @returns {Object} Result with URL and message
 */
async function sendWhatsAppMessage(order, templateName) {
    try {
        const template = MESSAGE_TEMPLATES[templateName];
        
        if (!template) {
            console.warn(`[WhatsApp] Unknown template: ${templateName}`);
            return null;
        }

        const message = template(order);
        const url = generateWhatsAppURL(order.customer.phone, message);

        console.log(`[WhatsApp] Generated message for ${order.orderId} (${templateName})`);
        console.log(`[WhatsApp] URL: ${url}`);

        // In production, you could:
        // 1. Use WhatsApp Business API to send automatically
        // 2. Queue the message for batch sending
        // 3. Store in DB for admin to send manually via UI

        return {
            success: true,
            url,
            message,
            phone: order.customer.phone
        };

    } catch (error) {
        console.error('[WhatsApp] Error generating message:', error);
        return null;
    }
}

/**
 * Generate manual WhatsApp link for admin UI
 * Useful for "Send WhatsApp" buttons in the interface
 */
function getWhatsAppLinkForUI(order, templateName) {
    const template = MESSAGE_TEMPLATES[templateName];
    if (!template) return null;

    const message = template(order);
    return generateWhatsAppURL(order.customer.phone, message);
}

module.exports = {
    sendWhatsAppMessage,
    generateWhatsAppURL,
    getWhatsAppLinkForUI,
    MESSAGE_TEMPLATES
};