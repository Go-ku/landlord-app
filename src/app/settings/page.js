// app/settings/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Shield,
  Bell,
  Mail,
  DollarSign,
  Calendar,
  Database,
  Download,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Save,
  RefreshCw,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Server,
  Zap,
  Archive
} from 'lucide-react';

export default function SystemSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Settings data
  const [generalSettings, setGeneralSettings] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    timezone: 'America/New_York',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    maintenanceHours: {
      start: '08:00',
      end: '17:00'
    }
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailTemplates: {
      welcome: true,
      paymentReminder: true,
      maintenanceUpdate: true,
      leaseExpiry: true
    },
    automationRules: {
      latePaymentReminders: true,
      maintenanceFollowup: true,
      leaseRenewalNotices: true
    },
    emailSettings: {
      smtpHost: '',
      smtpPort: '587',
      smtpUsername: '',
      smtpPassword: '',
      fromEmail: '',
      fromName: ''
    }
  });

  const [paymentSettings, setPaymentSettings] = useState({
    stripe: {
      publishableKey: '',
      secretKey: '',
      webhookSecret: ''
    },
    paymentMethods: {
      creditCard: true,
      bankTransfer: true,
      check: false
    },
    lateFees: {
      enabled: true,
      gracePeriod: 5,
      feeAmount: 50,
      feeType: 'fixed' // 'fixed' or 'percentage'
    }
  });

  const [securitySettings, setSecuritySettings] = useState({
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    },
    sessionSettings: {
      sessionTimeout: 24, // hours
      maxConcurrentSessions: 3
    },
    twoFactorAuth: {
      enabled: false,
      required: false
    }
  });

  // Check authorization
  useEffect(() => {
    if (session && session.user.role === 'tenant') {
      router.push('/dashboard');
    } else if (session) {
      fetchSystemSettings();
    }
  }, [session, router]);

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch('/api/settings/system');
      const data = await response.json();
      
      if (data.success) {
        if (data.settings.general) setGeneralSettings(data.settings.general);
        if (data.settings.notifications) setNotificationSettings(data.settings.notifications);
        if (data.settings.payments) setPaymentSettings(data.settings.payments);
        if (data.settings.security) setSecuritySettings(data.settings.security);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load system settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (settingsType, settingsData) => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: settingsType,
          settings: settingsData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Settings updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      const response = await fetch('/api/settings/backup', {
        method: 'POST'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rentease-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        setSuccess('Backup downloaded successfully');
      } else {
        setError('Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      setError('Failed to create backup');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'maintenance', label: 'Maintenance', icon: Database }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading system settings...</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role === 'tenant') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">{`You don't have permission to access system settings.`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Settings className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-600">Configure system-wide settings and preferences</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* General Settings Tab */}
              {activeTab === 'general' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <Settings className="w-6 h-6 text-blue-600 mr-3" />
                      <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Company Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                          <input
                            type="text"
                            value={generalSettings.companyName}
                            onChange={(e) => setGeneralSettings({...generalSettings, companyName: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Your Company Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Company Email</label>
                          <input
                            type="email"
                            value={generalSettings.companyEmail}
                            onChange={(e) => setGeneralSettings({...generalSettings, companyEmail: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="company@example.com"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Company Address</label>
                          <textarea
                            value={generalSettings.companyAddress}
                            onChange={(e) => setGeneralSettings({...generalSettings, companyAddress: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Full company address"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Regional Settings */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Regional Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                          <select
                            value={generalSettings.timezone}
                            onChange={(e) => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="America/New_York">Eastern Time</option>
                            <option value="America/Chicago">Central Time</option>
                            <option value="America/Denver">Mountain Time</option>
                            <option value="America/Los_Angeles">Pacific Time</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                          <select
                            value={generalSettings.currency}
                            onChange={(e) => setGeneralSettings({...generalSettings, currency: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="CAD">CAD (C$)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                          <select
                            value={generalSettings.dateFormat}
                            onChange={(e) => setGeneralSettings({...generalSettings, dateFormat: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-200">
                      <button
                        onClick={() => saveSettings('general', generalSettings)}
                        disabled={isSaving}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <Bell className="w-6 h-6 text-blue-600 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Email Templates */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Email Templates</h3>
                      <div className="space-y-3">
                        {[
                          { key: 'welcome', label: 'Welcome Email', desc: 'Send welcome email to new users' },
                          { key: 'paymentReminder', label: 'Payment Reminders', desc: 'Automated payment reminder emails' },
                          { key: 'maintenanceUpdate', label: 'Maintenance Updates', desc: 'Updates on maintenance requests' },
                          { key: 'leaseExpiry', label: 'Lease Expiry Notices', desc: 'Notifications for expiring leases' }
                        ].map((template) => (
                          <div key={template.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{template.label}</p>
                              <p className="text-sm text-gray-500">{template.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={notificationSettings.emailTemplates[template.key]}
                                onChange={(e) => setNotificationSettings({
                                  ...notificationSettings,
                                  emailTemplates: {
                                    ...notificationSettings.emailTemplates,
                                    [template.key]: e.target.checked
                                  }
                                })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SMTP Settings */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Email Configuration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                          <input
                            type="text"
                            value={notificationSettings.emailSettings.smtpHost}
                            onChange={(e) => setNotificationSettings({
                              ...notificationSettings,
                              emailSettings: {...notificationSettings.emailSettings, smtpHost: e.target.value}
                            })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="smtp.gmail.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                          <input
                            type="text"
                            value={notificationSettings.emailSettings.smtpPort}
                            onChange={(e) => setNotificationSettings({
                              ...notificationSettings,
                              emailSettings: {...notificationSettings.emailSettings, smtpPort: e.target.value}
                            })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="587"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                          <input
                            type="text"
                            value={notificationSettings.emailSettings.smtpUsername}
                            onChange={(e) => setNotificationSettings({
                              ...notificationSettings,
                              emailSettings: {...notificationSettings.emailSettings, smtpUsername: e.target.value}
                            })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="your-email@gmail.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                          <input
                            type="password"
                            value={notificationSettings.emailSettings.smtpPassword}
                            onChange={(e) => setNotificationSettings({
                              ...notificationSettings,
                              emailSettings: {...notificationSettings.emailSettings, smtpPassword: e.target.value}
                            })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Your email password"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-200">
                      <button
                        onClick={() => saveSettings('notifications', notificationSettings)}
                        disabled={isSaving}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <Shield className="w-6 h-6 text-blue-600 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Password Policy */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Password Policy</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Password Length</label>
                          <input
                            type="number"
                            min="6"
                            max="32"
                            value={securitySettings.passwordPolicy.minLength}
                            onChange={(e) => setSecuritySettings({
                              ...securitySettings,
                              passwordPolicy: {...securitySettings.passwordPolicy, minLength: parseInt(e.target.value)}
                            })}
                            className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div className="space-y-3">
                          {[
                            { key: 'requireUppercase', label: 'Require uppercase letters' },
                            { key: 'requireLowercase', label: 'Require lowercase letters' },
                            { key: 'requireNumbers', label: 'Require numbers' },
                            { key: 'requireSpecialChars', label: 'Require special characters' }
                          ].map((rule) => (
                            <div key={rule.key} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={securitySettings.passwordPolicy[rule.key]}
                                onChange={(e) => setSecuritySettings({
                                  ...securitySettings,
                                  passwordPolicy: {
                                    ...securitySettings.passwordPolicy,
                                    [rule.key]: e.target.checked
                                  }
                                })}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label className="ml-3 text-sm text-gray-700">{rule.label}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Session Settings */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Session Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (hours)</label>
                          <input
                            type="number"
                            min="1"
                            max="168"
                            value={securitySettings.sessionSettings.sessionTimeout}
                            onChange={(e) => setSecuritySettings({
                              ...securitySettings,
                              sessionSettings: {...securitySettings.sessionSettings, sessionTimeout: parseInt(e.target.value)}
                            })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Max Concurrent Sessions</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={securitySettings.sessionSettings.maxConcurrentSessions}
                            onChange={(e) => setSecuritySettings({
                              ...securitySettings,
                              sessionSettings: {...securitySettings.sessionSettings, maxConcurrentSessions: parseInt(e.target.value)}
                            })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-200">
                      <button
                        onClick={() => saveSettings('security', securitySettings)}
                        disabled={isSaving}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance Tab */}
              {activeTab === 'maintenance' && (
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <Database className="w-6 h-6 text-blue-600 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-900">System Maintenance</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Backup & Restore */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Backup & Restore</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center mb-3">
                            <Download className="w-5 h-5 text-green-600 mr-2" />
                            <h4 className="font-medium text-gray-900">Create Backup</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">Download a complete backup of your system data.</p>
                          <button
                            onClick={handleBackup}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Backup
                          </button>
                        </div>

                        <div className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center mb-3">
                            <Upload className="w-5 h-5 text-blue-600 mr-2" />
                            <h4 className="font-medium text-gray-900">Restore Backup</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">Upload and restore from a backup file.</p>
                          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Backup
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* System Information */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center mb-2">
                            <Server className="w-5 h-5 text-gray-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">Database Status</span>
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                            Connected
                          </span>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center mb-2">
                            <Zap className="w-5 h-5 text-gray-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">System Health</span>
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                            Healthy
                          </span>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center mb-2">
                            <Archive className="w-5 h-5 text-gray-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">Last Backup</span>
                          </div>
                          <span className="text-sm text-gray-600">2 days ago</span>
                        </div>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="border-t border-red-200 pt-6">
                      <h3 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h3>
                      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-red-900">Clear System Cache</h4>
                            <p className="text-sm text-red-700">This will clear all cached data and may temporarily slow down the system.</p>
                          </div>
                          <button className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear Cache
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}