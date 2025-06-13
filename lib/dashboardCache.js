// src/lib/dashboardCache.js
class DashboardCache {
    constructor() {
      this.cache = new Map();
      this.defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
    }
  
    set(key, value, ttl = this.defaultTTL) {
      const expiresAt = Date.now() + ttl;
      this.cache.set(key, {
        value,
        expiresAt
      });
    }
  
    get(key) {
      const item = this.cache.get(key);
      
      if (!item) {
        return null;
      }
  
      if (Date.now() > item.expiresAt) {
        this.cache.delete(key);
        return null;
      }
  
      return item.value;
    }
  
    delete(key) {
      this.cache.delete(key);
    }
  
    clear() {
      this.cache.clear();
    }
  
    // Clear expired entries
    cleanup() {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
        }
      }
    }
  
    // Get cache statistics
    getStats() {
      return {
        size: this.cache.size,
        keys: Array.from(this.cache.keys())
      };
    }
  }
  
  // Create a singleton instance
  const dashboardCache = new DashboardCache();
  
  // Cleanup expired entries every 10 minutes
  setInterval(() => {
    dashboardCache.cleanup();
  }, 10 * 60 * 1000);
  
  export default dashboardCache;
  
  // Helper function to generate cache keys
  export function generateCacheKey(prefix, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return paramString ? `${prefix}:${paramString}` : prefix;
  }
  
  // Cached stats wrapper
  export async function getCachedStats(cacheKey, fetchFunction, ttl) {
    let stats = dashboardCache.get(cacheKey);
    
    if (!stats) {
      stats = await fetchFunction();
      dashboardCache.set(cacheKey, stats, ttl);
    }
    
    return stats;
  }