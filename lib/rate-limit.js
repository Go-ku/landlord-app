// lib/utils/rate-limit.js - Comprehensive rate limiting library
import { LRUCache } from 'lru-cache';

// In-memory token cache for rate limiting
const tokenCache = new LRUCache({
  max: 1000, // Maximum number of tokens to store
  ttl: 5 * 60 * 1000, // 5 minutes TTL
  updateAgeOnGet: true, // Reset TTL on access
  updateAgeOnHas: false,
});

// Different rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  // API endpoints
  API_STRICT: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 requests per minute
  API_MODERATE: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 requests per minute
  API_LENIENT: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  
  // Authentication
  AUTH_LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 login attempts per 15 minutes
  AUTH_REGISTER: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 registrations per hour
  AUTH_PASSWORD_RESET: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 password resets per hour
  
  // Payments
  PAYMENT_MOMO: { windowMs: 60 * 1000, maxRequests: 3 }, // 3 MoMo payments per minute
  PAYMENT_GENERAL: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 payments per minute
  
  // File uploads
  FILE_UPLOAD: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 uploads per minute
  
  // Search and data fetching
  SEARCH: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 searches per minute
  DATA_FETCH: { windowMs: 60 * 1000, maxRequests: 50 }, // 50 data fetches per minute
  
  // Notifications
  NOTIFICATION_SEND: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 notifications per minute
  
  // Property and lease operations
  PROPERTY_CREATE: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 property creations per hour
  LEASE_CREATE: { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10 lease creations per hour
};

/**
 * Rate limiter class with advanced features
 */
export class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute default
    this.maxRequests = options.maxRequests || 10;
    this.skipOnError = options.skipOnError || false;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
    this.onLimitReached = options.onLimitReached || null;
    this.name = options.name || 'default';
  }

  // Default key generator using IP address
  defaultKeyGenerator(request) {
    return this.getClientIdentifier(request);
  }

  // Extract client identifier from request
  getClientIdentifier(request) {
    // Try to get IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwarded.split(',')[0].trim();
    }
    
    if (realIp) {
      return realIp;
    }
    
    if (cfConnectingIp) {
      return cfConnectingIp;
    }
    
    // Fallback for development/testing
    return 'unknown-ip';
  }

  // Check if request should be rate limited
  async check(request, customKey = null) {
    try {
      const key = customKey || this.keyGenerator(request);
      const identifier = `${this.name}:${key}`;
      
      // Get current window data
      const now = Date.now();
      const windowStart = now - this.windowMs;
      
      // Get existing data from cache
      let windowData = tokenCache.get(identifier) || {
        requests: [],
        firstRequest: now
      };

      // Remove expired requests
      windowData.requests = windowData.requests.filter(timestamp => timestamp > windowStart);
      
      // Check if limit exceeded
      if (windowData.requests.length >= this.maxRequests) {
        // Calculate reset time
        const oldestRequest = Math.min(...windowData.requests);
        const resetTime = oldestRequest + this.windowMs;
        
        // Call limit reached callback if provided
        if (this.onLimitReached) {
          this.onLimitReached(key, windowData.requests.length, this.maxRequests);
        }
        
        return {
          success: false,
          error: 'Rate limit exceeded',
          limit: this.maxRequests,
          remaining: 0,
          resetTime: new Date(resetTime),
          retryAfter: Math.ceil((resetTime - now) / 1000)
        };
      }

      // Add current request
      windowData.requests.push(now);
      
      // Update cache
      tokenCache.set(identifier, windowData, this.windowMs);

      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - windowData.requests.length,
        resetTime: new Date(now + this.windowMs),
        retryAfter: 0
      };

    } catch (error) {
      console.error('Rate limiter error:', error);
      
      if (this.skipOnError) {
        return {
          success: true,
          limit: this.maxRequests,
          remaining: this.maxRequests,
          resetTime: new Date(Date.now() + this.windowMs),
          retryAfter: 0
        };
      }
      
      throw error;
    }
  }

  // Reset rate limit for a specific key
  reset(request, customKey = null) {
    const key = customKey || this.keyGenerator(request);
    const identifier = `${this.name}:${key}`;
    tokenCache.delete(identifier);
  }

  // Get current status without incrementing
  getStatus(request, customKey = null) {
    const key = customKey || this.keyGenerator(request);
    const identifier = `${this.name}:${key}`;
    
    const windowData = tokenCache.get(identifier);
    if (!windowData) {
      return {
        limit: this.maxRequests,
        remaining: this.maxRequests,
        resetTime: new Date(Date.now() + this.windowMs)
      };
    }

    const now = Date.now();
    const windowStart = now - this.windowMs;
    const validRequests = windowData.requests.filter(timestamp => timestamp > windowStart);

    return {
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - validRequests.length),
      resetTime: new Date(Math.min(...validRequests) + this.windowMs)
    };
  }
}

/**
 * User-based rate limiter (requires authentication)
 */
export class UserRateLimiter extends RateLimiter {
  constructor(options = {}) {
    super(options);
    this.getUserId = options.getUserId || this.defaultGetUserId;
  }

  async defaultGetUserId(request) {
    // You'll need to implement session extraction here
    // This is a placeholder that should be replaced with actual session logic
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;
    
    try {
      // Extract user ID from JWT or session
      // This is pseudocode - implement based on your auth system
      const token = authHeader.replace('Bearer ', '');
      const decoded = await verifyToken(token); // Implement this function
      return decoded.userId;
    } catch (error) {
      return null;
    }
  }

  async check(request, customKey = null) {
    if (customKey) {
      return super.check(request, customKey);
    }

    const userId = await this.getUserId(request);
    if (!userId) {
      // Fall back to IP-based limiting for unauthenticated users
      return super.check(request);
    }

    return super.check(request, `user:${userId}`);
  }
}

/**
 * Adaptive rate limiter that adjusts limits based on usage patterns
 */
export class AdaptiveRateLimiter extends RateLimiter {
  constructor(options = {}) {
    super(options);
    this.baseLimit = options.maxRequests;
    this.maxLimit = options.maxLimit || this.baseLimit * 3;
    this.minLimit = options.minLimit || Math.max(1, Math.floor(this.baseLimit / 2));
    this.adaptationFactor = options.adaptationFactor || 0.1;
  }

  async check(request, customKey = null) {
    const key = customKey || this.keyGenerator(request);
    const identifier = `${this.name}:${key}`;
    
    // Get usage history
    const historyKey = `${identifier}:history`;
    let history = tokenCache.get(historyKey) || {
      successfulRequests: 0,
      failedRequests: 0,
      lastAdjustment: Date.now()
    };

    // Adjust limit based on recent behavior
    const now = Date.now();
    const timeSinceAdjustment = now - history.lastAdjustment;
    
    if (timeSinceAdjustment > this.windowMs) {
      const totalRequests = history.successfulRequests + history.failedRequests;
      const successRate = totalRequests > 0 ? history.successfulRequests / totalRequests : 1;
      
      // Increase limit for well-behaved users, decrease for problematic ones
      if (successRate > 0.95 && this.maxRequests < this.maxLimit) {
        this.maxRequests = Math.min(this.maxLimit, 
          Math.floor(this.maxRequests * (1 + this.adaptationFactor)));
      } else if (successRate < 0.5 && this.maxRequests > this.minLimit) {
        this.maxRequests = Math.max(this.minLimit, 
          Math.floor(this.maxRequests * (1 - this.adaptationFactor)));
      }

      // Reset history
      history = {
        successfulRequests: 0,
        failedRequests: 0,
        lastAdjustment: now
      };
    }

    const result = await super.check(request, customKey);
    
    // Update history
    if (result.success) {
      history.successfulRequests++;
    } else {
      history.failedRequests++;
    }
    
    tokenCache.set(historyKey, history, this.windowMs * 2);
    
    return result;
  }
}

/**
 * Simple factory function for creating rate limiters
 */
export function createRateLimiter(configName, customOptions = {}) {
  const config = RATE_LIMIT_CONFIGS[configName];
  if (!config) {
    throw new Error(`Unknown rate limit configuration: ${configName}`);
  }

  const options = {
    ...config,
    ...customOptions,
    name: configName
  };

  return new RateLimiter(options);
}

/**
 * Middleware wrapper for Next.js API routes
 */
export function withRateLimit(limiter, options = {}) {
  return async (request, response, next) => {
    try {
      const result = await limiter.check(request);
      
      // Add rate limit headers
      if (response && typeof response.setHeader === 'function') {
        response.setHeader('X-RateLimit-Limit', result.limit);
        response.setHeader('X-RateLimit-Remaining', result.remaining);
        response.setHeader('X-RateLimit-Reset', result.resetTime.toISOString());
        
        if (!result.success) {
          response.setHeader('Retry-After', result.retryAfter);
        }
      }

      if (!result.success) {
        const error = new Error(result.error);
        error.statusCode = 429;
        error.rateLimitInfo = result;
        
        if (options.onLimitReached) {
          return options.onLimitReached(error, request, response);
        }
        
        throw error;
      }

      if (next) {
        return next();
      }
      
      return result;
      
    } catch (error) {
      if (error.statusCode === 429) {
        throw error;
      }
      
      console.error('Rate limiter middleware error:', error);
      
      if (options.skipOnError !== false) {
        return next ? next() : { success: true };
      }
      
      throw error;
    }
  };
}

/**
 * Legacy compatibility function
 */
export function rateLimit(options) {
  const limiter = new RateLimiter({
    windowMs: options.interval || 60 * 1000,
    maxRequests: options.uniqueTokenPerInterval || 10,
    name: options.name || 'legacy'
  });

  return {
    check: async (request, limit, token) => {
      const customKey = token || null;
      const result = await limiter.check(request, customKey);
      
      if (!result.success && result.remaining === 0) {
        throw new Error('Rate limit exceeded');
      }
      
      return result;
    }
  };
}

/**
 * Burst rate limiter for handling traffic spikes
 */
export class BurstRateLimiter {
  constructor(options = {}) {
    this.shortWindow = options.shortWindow || 10 * 1000; // 10 seconds
    this.longWindow = options.longWindow || 60 * 1000; // 1 minute
    this.shortLimit = options.shortLimit || 5;
    this.longLimit = options.longLimit || 20;
    this.name = options.name || 'burst';
  }

  async check(request, customKey = null) {
    const shortLimiter = new RateLimiter({
      windowMs: this.shortWindow,
      maxRequests: this.shortLimit,
      name: `${this.name}:short`
    });

    const longLimiter = new RateLimiter({
      windowMs: this.longWindow,
      maxRequests: this.longLimit,
      name: `${this.name}:long`
    });

    // Check both windows
    const [shortResult, longResult] = await Promise.all([
      shortLimiter.check(request, customKey),
      longLimiter.check(request, customKey)
    ]);

    // If either limit is exceeded, deny the request
    if (!shortResult.success) {
      return {
        ...shortResult,
        window: 'short',
        windowMs: this.shortWindow
      };
    }

    if (!longResult.success) {
      return {
        ...longResult,
        window: 'long',
        windowMs: this.longWindow
      };
    }

    return {
      success: true,
      limit: this.longLimit,
      remaining: Math.min(shortResult.remaining, longResult.remaining),
      resetTime: new Date(Math.max(
        shortResult.resetTime.getTime(),
        longResult.resetTime.getTime()
      ))
    };
  }
}

// Export commonly used rate limiters
export const paymentLimiter = createRateLimiter('PAYMENT_MOMO');
export const authLimiter = createRateLimiter('AUTH_LOGIN');
export const apiLimiter = createRateLimiter('API_MODERATE');
export const strictApiLimiter = createRateLimiter('API_STRICT');

// Cache management utilities
export const rateLimitUtils = {
  // Clear all rate limit data
  clearAll() {
    tokenCache.clear();
  },

  // Get cache statistics
  getStats() {
    return {
      size: tokenCache.size,
      maxSize: tokenCache.max,
      ttl: tokenCache.ttl
    };
  },

  // Clear rate limit for specific identifier
  clearForKey(key) {
    // Find and delete all entries that match the key pattern
    for (const [cacheKey] of tokenCache.entries()) {
      if (cacheKey.includes(key)) {
        tokenCache.delete(cacheKey);
      }
    }
  },

  // Get all active rate limits (for debugging)
  getActiveLimits() {
    const limits = [];
    for (const [key, value] of tokenCache.entries()) {
      limits.push({
        key,
        requests: value.requests?.length || 0,
        firstRequest: value.firstRequest ? new Date(value.firstRequest) : null
      });
    }
    return limits;
  }
};

export default RateLimiter;