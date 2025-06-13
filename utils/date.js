// src/utils/date.js
export const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('en-ZM', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Africa/Lusaka'
    });
  };
  
  // Format for display with day name "Monday, 15 January 2025"
export const formatDateWithDay = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('en-ZM', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lusaka'
  });
};
  export const formatDateLong = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  export const formatDateShort = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  export const getDateDifference = (startDate, endDate, unit = 'days') => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    const diffInMs = end - start;
    
    switch (unit) {
      case 'days':
        return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
      case 'weeks':
        return Math.ceil(diffInMs / (1000 * 60 * 60 * 24 * 7));
      case 'months':
        return Math.ceil(diffInMs / (1000 * 60 * 60 * 24 * 30));
      case 'years':
        return Math.ceil(diffInMs / (1000 * 60 * 60 * 24 * 365));
      default:
        return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    }
  };
  
  export const isDateInPast = (dateString) => {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const today = new Date();
    
    if (isNaN(date.getTime())) return false;
    
    return date < today;
  };
  
  export const isDateInFuture = (dateString) => {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const today = new Date();
    
    if (isNaN(date.getTime())) return false;
    
    return date > today;
  };
  
  export const addDays = (dateString, days) => {
    if (!dateString || typeof days !== 'number') return null;
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) return null;
    
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  };
  
  export const getMonthName = (monthIndex) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return months[monthIndex] || '';
  };
  
  export const getDaysSinceDate = (dateString) => {
    if (!dateString) return 0;
    
    const date = new Date(dateString);
    const today = new Date();
    
    if (isNaN(date.getTime())) return 0;
    
    const diffInMs = today - date;
    return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  };
  
  export const getDaysUntilDate = (dateString) => {
    if (!dateString) return 0;
    
    const date = new Date(dateString);
    const today = new Date();
    
    if (isNaN(date.getTime())) return 0;
    
    const diffInMs = date - today;
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  };
  
  export const formatRelativeDate = (dateString) => {
    if (!dateString) return '';
    
    const daysUntil = getDaysUntilDate(dateString);
    
    if (daysUntil < 0) {
      const daysPast = Math.abs(daysUntil);
      if (daysPast === 0) return 'Today';
      if (daysPast === 1) return 'Yesterday';
      if (daysPast < 7) return `${daysPast} days ago`;
      if (daysPast < 30) return `${Math.floor(daysPast / 7)} weeks ago`;
      if (daysPast < 365) return `${Math.floor(daysPast / 30)} months ago`;
      return `${Math.floor(daysPast / 365)} years ago`;
    } else if (daysUntil === 0) {
      return 'Today';
    } else if (daysUntil === 1) {
      return 'Tomorrow';
    } else if (daysUntil < 7) {
      return `In ${daysUntil} days`;
    } else if (daysUntil < 30) {
      return `In ${Math.floor(daysUntil / 7)} weeks`;
    } else if (daysUntil < 365) {
      return `In ${Math.floor(daysUntil / 30)} months`;
    } else {
      return `In ${Math.floor(daysUntil / 365)} years`;
    }
  };
  
  export const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  };
  
  export const getCurrentDateTime = () => {
    return new Date().toISOString();
  };