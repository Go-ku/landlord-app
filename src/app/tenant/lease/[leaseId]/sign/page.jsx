// app/tenant/lease/[leaseId]/sign/page.tsx - Comprehensive lease signing page
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  FileText, 
  PenTool, 
  Check, 
  X, 
  Download, 
  Eye,
  AlertTriangle,
  Calendar,
  DollarSign,
  Home,
  User,
  Clock,
  Shield,
  Info
} from 'lucide-react';
import SignatureCanvas from '@/components/SignatureCanvas';

export default function TenantLeaseSignPage() {
  const router = useRouter();
  const params = useParams();
  const { leaseId } = params;
  const signatureRef = useRef();
  
  const [lease, setLease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Review, 2: Terms, 3: Sign
  const [error, setError] = useState('');
 
  // Form state
  const [agreementAccepted, setAgreementAccepted] = useState({
    terms: false,
    rent: false,
    deposit: false,
    maintenance: false,
    policies: false
  });
  
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    dateOfBirth: '',
    idNumber: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });
  
  const [signatureData, setSignatureData] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  // Fetch lease data
  useEffect(() => {
    fetchLeaseData();
  }, [leaseId]);

  const fetchLeaseData = async () => {
    try {
      const response = await fetch(`/api/tenant/lease/${leaseId}`);
      if (response.ok) {
        const data = await response.json();
        setLease(data.lease);
        
        // Pre-fill personal info if available
        if (data.lease.tenantId) {
          setPersonalInfo(prev => ({
            ...prev,
            fullName: data.lease.tenantId.name || ''
          }));
        }
      } else {
        setError('Failed to load lease information');
      }
    } catch (err) {
      setError('Failed to load lease information');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalInfoChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setPersonalInfo(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setPersonalInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleAgreementChange = (field) => {
    setAgreementAccepted(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const allAgreementsAccepted = Object.values(agreementAccepted).every(Boolean);
  const allPersonalInfoComplete = personalInfo.fullName && 
    personalInfo.dateOfBirth && 
    personalInfo.idNumber &&
    personalInfo.emergencyContact.name &&
    personalInfo.emergencyContact.phone;

const clearSignature = () => {
  signatureRef.current?.clear?.();
  setSignatureData('');
};


const saveSignature = () => {
  const signature = signatureRef.current?.getSignatureData?.();
  if (signature && !signatureRef.current.isEmpty()) {
    setSignatureData(signature);
    setShowSignaturePad(false); // Hide canvas if needed
  } else {
    setError('Please provide a signature before saving.');
  }
};


  const submitSignature = async () => {
    if (!signatureData) {
      setError('Please provide your signature');
      return;
    }

    if (!allPersonalInfoComplete) {
      setError('Please complete all personal information fields');
      return;
    }

    setSigning(true);
    setError('');

    try {
      const response = await fetch(`/api/tenants/lease/${leaseId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signatureData,
          personalInfo,
          ipAddress: 'client-ip', // You'd get this from the server
          agreementAccepted
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/tenant/lease/${leaseId}/payment`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to sign lease');
      }
    } catch (err) {
      setError('Failed to sign lease. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lease agreement...</p>
        </div>
      </div>
    );
  }

  if (error && !lease) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Lease</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lease Agreement Signature</h1>
              <p className="text-gray-600 mt-1">Review and sign your lease agreement</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Lease ID</p>
              <p className="font-mono text-sm">{leaseId}</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {[
                { step: 1, title: 'Review Terms', icon: Eye },
                { step: 2, title: 'Accept Agreement', icon: Check },
                { step: 3, title: 'Sign Document', icon: PenTool }
              ].map(({ step, title, icon: Icon }, index) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= step 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'border-gray-300 text-gray-500'
                  }`}>
                    {currentStep > step ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep >= step ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {title}
                  </span>
                  {index < 2 && (
                    <div className={`w-16 h-0.5 ml-4 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Step 1: Review Terms */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Lease Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Lease Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start">
                  <Home className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">Property</h3>
                    <p className="text-gray-600">{lease?.propertyId?.address}</p>
                    <p className="text-sm text-gray-500">{lease?.propertyId?.type}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <User className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">Landlord</h3>
                    <p className="text-gray-600">{lease?.landlordId?.name}</p>
                    <p className="text-sm text-gray-500">{lease?.landlordId?.email}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">Lease Term</h3>
                    <p className="text-gray-600">
                      {new Date(lease?.startDate).toLocaleDateString()} - {new Date(lease?.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {Math.round((new Date(lease?.endDate) - new Date(lease?.startDate)) / (1000 * 60 * 60 * 24 * 30))} months
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <DollarSign className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900">Financial Terms</h3>
                    <p className="text-gray-600">Monthly Rent: ${lease?.monthlyRent?.toLocaleString()}</p>
                    <p className="text-gray-600">Security Deposit: ${lease?.securityDeposit?.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Due: {lease?.paymentDueDay} of each month</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lease Terms */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Lease Terms & Conditions</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Payment Terms</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Monthly rent of ${lease?.monthlyRent?.toLocaleString()} due on the {lease?.paymentDueDay} of each month</li>
                    <li>Security deposit of ${lease?.securityDeposit?.toLocaleString()} required before move-in</li>
                    <li>Late payment fee of $50 applies after 5-day grace period</li>
                    <li>Payment methods: Bank transfer, mobile money, cash</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Property Rules</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>No smoking inside the property</li>
                    <li>Pets allowed with additional deposit (if applicable)</li>
                    <li>Maximum occupancy as per lease agreement</li>
                    <li>Quiet hours: 10 PM - 7 AM</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Maintenance Responsibilities</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Landlord responsible for major repairs and structural issues</li>
                    <li>Tenant responsible for minor maintenance and cleanliness</li>
                    <li>Report maintenance issues within 48 hours</li>
                    <li>No unauthorized modifications to the property</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Termination</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>30-day written notice required for termination</li>
                    <li>Early termination fee may apply</li>
                    <li>Property must be returned in original condition</li>
                    <li>Security deposit refund within 14 days after move-out</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-medium text-blue-900">First Payment Required</h4>
                    <p className="text-blue-800 text-sm">
                      After signing, you'll need to make your first payment of ${(lease?.securityDeposit + lease?.monthlyRent)?.toLocaleString()} 
                      (Security deposit + First month's rent) to activate your lease.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Continue to Agreement
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Accept Agreement */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    value={personalInfo.fullName}
                    onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full legal name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={personalInfo.dateOfBirth}
                    onChange={(e) => handlePersonalInfoChange('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    National ID Number *
                  </label>
                  <input
                    type="text"
                    value={personalInfo.idNumber}
                    onChange={(e) => handlePersonalInfoChange('idNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your national ID number"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={personalInfo.emergencyContact.name}
                      onChange={(e) => handlePersonalInfoChange('emergencyContact.name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={personalInfo.emergencyContact.phone}
                      onChange={(e) => handlePersonalInfoChange('emergencyContact.phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+260 XXX XXX XXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship *
                    </label>
                    <select
                      value={personalInfo.emergencyContact.relationship}
                      onChange={(e) => handlePersonalInfoChange('emergencyContact.relationship', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select relationship</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Agreement Checkboxes */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Agreement Confirmation</h2>
              <div className="space-y-4">
                {[
                  { key: 'terms', label: 'I have read and understand all lease terms and conditions' },
                  { key: 'rent', label: `I agree to pay monthly rent of $${lease?.monthlyRent?.toLocaleString()} by the ${lease?.paymentDueDay} of each month` },
                  { key: 'deposit', label: `I agree to pay a security deposit of $${lease?.securityDeposit?.toLocaleString()} before move-in` },
                  { key: 'maintenance', label: 'I understand my maintenance responsibilities and will report issues promptly' },
                  { key: 'policies', label: 'I agree to follow all property rules and policies outlined in this lease' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreementAccepted[key]}
                      onChange={() => handleAgreementChange(key)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              {!allAgreementsAccepted && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="text-yellow-800 text-sm">
                      Please accept all terms to continue with the signing process.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back to Review
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!allAgreementsAccepted || !allPersonalInfoComplete}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Signature
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Digital Signature */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Digital Signature</h2>
              
              {!showSignaturePad && !signatureData && (
                <div className="text-center py-8">
                  <PenTool className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Ready to Sign Your Lease
                  </h3>
                  <p className="text-gray-600 mb-6">
                    By signing below, you confirm that you have read, understood, and agree to all terms of this lease agreement.
                  </p>
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center mx-auto"
                  >
                    <PenTool className="w-5 h-5 mr-2" />
                    Start Signing
                  </button>
                </div>
              )}

              {showSignaturePad && (
                <div>
                  <p className="text-gray-700 mb-4">
                    Please sign in the box below using your mouse or touch screen:
                  </p>
                  <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                    <SignatureCanvas
                      ref={signatureRef}
                      width={600}
                      height={200}
                      onSignatureChange={(sig) => setSignatureData(sig)}
                    />
                  </div>
                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={clearSignature}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Clear
                    </button>
                    <div className="space-x-3">
                      <button
                        onClick={() => setShowSignaturePad(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveSignature}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Save Signature
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {signatureData && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Your Signature:</h3>
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <img src={signatureData} alt="Your signature" className="max-w-full h-auto" />
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Signed by: <span className="font-medium">{personalInfo.fullName}</span>
                    </p>
                    <button
                      onClick={() => {
                        setSignatureData('');
                        setShowSignaturePad(true);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Re-sign
                    </button>
                  </div>
                </div>
              )}
            </div>

            {signatureData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center">
                  <Shield className="w-6 h-6 text-green-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-green-900">Ready to Submit</h3>
                    <p className="text-green-800 text-sm mt-1">
                      Your signature has been captured. Click "Sign Lease" to complete the process.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back to Agreement
              </button>
              <button
                onClick={submitSignature}
                disabled={!signatureData || signing}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {signing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing Lease...
                  </>
                ) : (
                  <>
                    <PenTool className="w-5 h-5 mr-2" />
                    Sign Lease Agreement
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer Information */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-600">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 mr-1" />
            <span>This signature is legally binding and timestamped</span>
          </div>
          <p>
            For questions about this lease agreement, contact your landlord at {lease?.landlordId?.email}
          </p>
        </div>
      </div>
    </div>
  );
}