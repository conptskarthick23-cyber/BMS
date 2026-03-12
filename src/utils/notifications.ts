/**
 * Notification Utilities (WhatsApp via TextMeBot, Email via EmailJS, Browser Notifications)
 * 
 * Free / No-backend implementation for Firebase React apps.
 */

// TextMeBot WhatsApp API (Free) — routed through our Next.js API proxy to avoid CORS
export async function sendWhatsAppAlert(phone: string, apikey: string, message: string): Promise<boolean> {
    if (!phone || !apikey) return false;

    // Sanitize phone: remove spaces, dashes, parentheses — keep only digits and leading +
    const cleanPhone = phone.replace(/[\s\-()]/g, '');

    try {
        const response = await fetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, apikey, message }),
        });

        const data = await response.json();

        if (!data.success) {
            console.warn('WhatsApp alert failed:', data.error || data);
        }

        return data.success === true;
    } catch (error) {
        console.warn('Failed to send WhatsApp alert:', error);
        return false;
    }
}

// EmailJS API (Free 200/mo)
export async function sendEmailAlert(
    serviceId: string,
    templateId: string,
    publicKey: string,
    userEmail: string,
    alertTitle: string,
    alertMessage: string
) {
    if (!serviceId || !templateId || !publicKey || !userEmail) return false;

    try {
        const data = {
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            template_params: {
                to_email: userEmail,
                alert_title: alertTitle,
                alert_message: alertMessage,
                time: new Date().toLocaleString(),
            }
        };

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to send Email alert via EmailJS:', error);
        return false;
    }
}

// Browser Desktop Notifications
export function sendBrowserNotification(title: string, message: string) {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    try {
        new Notification(title, {
            body: message,
            icon: '/favicon.ico',
            tag: `bms-alert-${Date.now()}`, // unique tag to allow multiple notifications
        });
        return true;
    } catch (error) {
        console.error('Failed to send browser notification:', error);
        return false;
    }
}
