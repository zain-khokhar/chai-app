// ============================================================
// ChaiKhata — Utility functions
// ============================================================

/**
 * Generates a random 4-digit delivery code (1000–9999)
 */
export function generateDeliveryCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Format an integer PKR amount
 */
export function formatPKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-PK')}`;
}

/**
 * Validate a Pakistani phone number (03XXXXXXXXX)
 */
export function isValidPakistaniPhone(phone: string): boolean {
  return /^03\d{9}$/.test(phone.trim());
}

/**
 * Validate a 6-digit PIN
 */
export function isValidPIN(pin: string): boolean {
  return /^\d{6}$/.test(pin.trim());
}

/**
 * Format a timestamp to a readable time string
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-PK', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a timestamp to a readable date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get a greeting based on the current hour
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Combine class names (cn utility)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get a readable status label for order status
 */
export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PLACED: 'Order Placed',
    ACCEPTED: 'Accepted',
    ASSIGNED: 'Worker Assigned',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };
  return labels[status] ?? status;
}

/**
 * Get a readable cash status label
 */
export function getCashStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NOT_DUE: 'Not Due',
    AWAITING_CUSTOMER_CONFIRMATION: 'Awaiting Confirmation',
    CUSTOMER_CONFIRMED: 'Customer Confirmed',
    OWNER_SETTLED: 'Settled',
    DISPUTED: 'Disputed',
  };
  return labels[status] ?? status;
}
