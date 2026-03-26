const { createTransporter, emailConfig } = require('../config/emailConfig');

/**
 * Sends an email notification to admins for order lifecycle events.
 * 
 * @param {Object} order - The order document from MongoDB.
 * @param {string} action - The action performed (e.g., 'created', 'cancelled').
 */
const sendAdminOrderNotification = async (order, action) => {
    try {
        const adminEmailsStr = process.env.ADMIN_EMAILS;
        if (!adminEmailsStr) {
            console.warn('[EmailHelper] ADMIN_EMAILS not set in environment. Skipping admin notification.');
            return;
        }

        // Parse comma-separated emails
        const adminEmails = adminEmailsStr.split(',').map(e => e.trim()).filter(e => e);
        if (adminEmails.length === 0) {
            console.warn('[EmailHelper] ADMIN_EMAILS is empty. Skipping notification.');
            return;
        }

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.error('[EmailHelper] EMAIL_USER or EMAIL_PASSWORD not set. Cannot send notification.');
            return;
        }

        const transporter = createTransporter();
        const customerName = order.customer?.name || 'Customer';
        const orderId = order.orderId;
        
        // Subject tailored for Gmail threading
        const subject = `Order: ${orderId} - ${customerName}`;
        
        let actionText = action === 'created' ? 'A new order has been created.' : 'An order has been cancelled.';
        const actionColor = action === 'created' ? '#2e7d32' : '#d32f2f'; // Green for created, Red for cancelled
        
        let productsList = '';
        if (order.bookings && order.bookings.length > 0) {
            productsList = '<ul>' + order.bookings.map(b => {
                const price = b.totalPrice ? b.totalPrice : (b.appliedRate * b.quantity);
                return `<li>Product ID: ${b.product} | Qty: ${b.quantity} | Total: ₹${price}</li>`;
            }).join('') + '</ul>';
        }

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                <h2 style="color: ${actionColor}; border-bottom: 2px solid ${actionColor}; padding-bottom: 10px;">
                    Order ${action.charAt(0).toUpperCase() + action.slice(1)}
                </h2>
                <p style="font-size: 16px;">Hello Admin,</p>
                <p style="font-size: 16px; font-weight: bold;">${actionText}</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Order Details</h3>
                    <ul style="list-style: none; padding: 0; line-height: 1.6;">
                        <li><strong>Order ID:</strong> ${orderId}</li>
                        <li><strong>Status:</strong> <span style="background: #e0e0e0; padding: 3px 8px; border-radius: 4px;">${order.orderStatus}</span></li>
                        <li><strong>Customer Name:</strong> ${customerName}</li>
                        ${order.customer?.phone ? `<li><strong>Phone:</strong> ${order.customer.phone}</li>` : ''}
                        ${order.customer?.email ? `<li><strong>Email:</strong> ${order.customer.email}</li>` : ''}
                        <li><strong>Grand Total:</strong> <span style="color: #2e7d32; font-weight: bold;">₹${order.financials?.grandTotal || 0}</span></li>
                    </ul>
                </div>

                ${productsList ? `<div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Items</h3>
                    ${productsList}
                </div>` : ''}
                
                <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
                    Please check the admin dashboard for full details.<br/>
                    CityCycling System
                </p>
            </div>
        `;

        const mailOptions = {
            from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
            to: adminEmails.join(', '),
            subject: subject,
            html: html
        };

        console.log(`[EmailHelper] Attempting to send admin notification to: ${adminEmails.join(', ')}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailHelper] ✅ Admin notification sent for order ${orderId} (${action}) - MessageId: ${info.messageId}`);
    } catch (error) {
        console.error(`[EmailHelper] ❌ Failed to send admin notification for order ${order.orderId}:`, error);
    }
};

module.exports = {
    sendAdminOrderNotification
};
