/**
 * Analytics utility
 * Tracks user events and app usage (privacy-friendly, local only)
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: Date;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events

  /**
   * Track an event
   */
  track(eventName: string, properties?: Record<string, unknown>) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: new Date(),
    };

    this.events.push(event);

    // Keep only last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // In development, log to console
    if (import.meta.env.DEV) {
      console.log('[Analytics]', eventName, properties);
    }

    // In production, you could send to analytics service
    // Example: sendToAnalyticsService(event);
  }

  /**
   * Get all events (for debugging)
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = [];
  }

  /**
   * Export events as JSON
   */
  export(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

export const analytics = new Analytics();

// Track page views
export function trackPageView(pageName: string) {
  analytics.track('page_view', { page: pageName });
}

// Track product actions
export function trackProductAction(action: string, productId?: string) {
  analytics.track('product_action', { action, productId });
}

// Track feature usage
export function trackFeatureUsage(feature: string, details?: Record<string, unknown>) {
  analytics.track('feature_usage', { feature, ...details });
}

