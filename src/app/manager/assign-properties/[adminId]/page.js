    // app/manager/assign-properties/[adminId]/page.js
    'use client';

    import { useState, useEffect } from 'react';
    import { useSession } from 'next-auth/react';
    import { useRouter, useParams } from 'next/navigation';
    import Link from 'next/link';
    import { 
    Shield, 
    Building, 
    ArrowLeft, 
    Edit,
    Trash2,
    Plus,
    MapPin,
    Calendar,
    User,
    Mail,
    Phone,
    Settings,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2
    } from 'lucide-react';

    export default function AdminDetailPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const adminId = params.adminId;
    
    // State
    const [admin, setAdmin] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRemoving, setIsRemoving] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Check authorization
    useEffect(() => {
        if (session && session.user.role !== 'manager') {
        router.push('/dashboard');
        }
    }, [session, router]);

    // Fetch admin data
    useEffect(() => {
        async function fetchAdminData() {
        if (!adminId) return;
        
        try {
            const response = await fetch('/api/manager/assign-properties');
            const data = await response.json();
            
            if (data.success) {
            const foundAdmin = data.data.admins.find(a => a._id === adminId);
            if (foundAdmin) {
                setAdmin(foundAdmin);
            } else {
                setError('Admin not found');
            }
            } else {
            setError('Failed to load admin data');
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
            setError('Failed to load admin data');
        } finally {
            setIsLoading(false);
        }
        }

        if (session?.user?.role === 'manager') {
        fetchAdminData();
        }
    }, [session, adminId]);

    // Remove assignment
    const handleRemoveAssignment = async (propertyId) => {
        if (!window.confirm('Are you sure you want to remove this property assignment?')) {
        return;
        }

        setIsRemoving(propertyId);
        setError('');
        setSuccess('');

        try {
        const response = await fetch(`/api/manager/assign-properties?adminId=${adminId}&propertyId=${propertyId}`, {
            method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
            setSuccess('Assignment removed successfully');
            
            // Update local state
            setAdmin(prev => ({
            ...prev,
            assignedProperties: prev.assignedProperties.map(assignment =>
                assignment.property?._id === propertyId
                ? { ...assignment, isActive: false }
                : assignment
            )
            }));
        } else {
            setError(data.error || 'Failed to remove assignment');
        }
        } catch (error) {
        console.error('Error removing assignment:', error);
        setError('Failed to remove assignment');
        } finally {
        setIsRemoving(null);
        }
    };

    if (isLoading) {
        return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading admin details...</p>
            </div>
        </div>
        );
    }

    if (error && !admin) {
        return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto p-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                <div>
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
                </div>
            </div>
            </div>
        </div>
        );
    }

    if (!admin) {
        return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto p-4">
            <div className="text-center py-12">
                <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900">Admin not found</h2>
                <p className="text-gray-600 mt-2">{`The admin user youre looking for doesn't exist.`}</p>
                <Link
                href="/manager/assign-properties"
                className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-800"
                >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to assignments
                </Link>
            </div>
            </div>
        </div>
        );
    }

    const activeAssignments = admin.assignedProperties.filter(assignment => assignment.isActive);

    return (
        <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4 max-w-6xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
                <Link
                href="/manager/assign-properties"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Assignments
                </Link>
                <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Shield className="w-6 h-6 mr-3 text-blue-600" />
                    {admin.name}
                </h1>
                <p className="text-gray-600 mt-1">Admin assignment details</p>
                </div>
            </div>
            <div className="flex items-center space-x-3">
                <Link
                href={`/manager/assign-properties/assign?admin=${adminId}`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                <Plus className="w-4 h-4 mr-2" />
                Assign More Properties
                </Link>
            </div>
            </div>

            {/* Messages */}
            {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
                <p className="text-sm text-red-700">{error}</p>
                </div>
            </div>
            )}

            {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3" />
                <p className="text-sm text-green-700">{success}</p>
                </div>
            </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Admin Info Card */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">{admin.name}</h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                    admin.adminLevel === 'financial' 
                        ? 'bg-green-100 text-green-800'
                        : admin.adminLevel === 'assistant'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                    {admin.adminLevel?.charAt(0).toUpperCase() + admin.adminLevel?.slice(1)} Admin
                    </span>
                </div>

                <div className="mt-6 space-y-4">
                    <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-3" />
                    {admin.email}
                    </div>
                    
                    {admin.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-3" />
                        {admin.phone}
                    </div>
                    )}

                    <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-3" />
                    Status: <span className={`ml-1 font-medium ${admin.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                    <Building className="w-4 h-4 mr-3" />
                    {activeAssignments.length} assigned propert{activeAssignments.length !== 1 ? 'ies' : 'y'}
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                    <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Admin Details
                    </button>
                </div>
                </div>
            </div>

            {/* Assigned Properties */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Assigned Properties</h3>
                    <span className="text-sm text-gray-500">
                        {activeAssignments.length} properties
                    </span>
                    </div>
                </div>

                <div className="divide-y divide-gray-200">
                    {activeAssignments.length > 0 ? (
                    activeAssignments.map((assignment) => (
                        <div key={assignment._id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                            <div className="flex items-start">
                                <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                                <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900">
                                    {assignment.property?.address || 'Unknown Address'}
                                </h4>
                                <p className="text-sm text-gray-500 mt-1">
                                    {assignment.property?.type} • ZMW {assignment.property?.monthlyRent?.toLocaleString() || 0}/month
                                </p>
                                
                                <div className="flex items-center mt-2 text-xs text-gray-500">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Assigned {new Date(assignment.assignedDate).toLocaleDateString()}
                                    {assignment.assignedBy && (
                                    <span className="ml-2">
                                        by {assignment.assignedBy.name}
                                    </span>
                                    )}
                                </div>

                                {/* Permissions */}
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {assignment.permissions?.map((permission) => (
                                    <span 
                                        key={permission} 
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                        <Settings className="w-3 h-3 mr-1" />
                                        {permission.replace('_', ' ')}
                                    </span>
                                    ))}
                                </div>
                                </div>
                            </div>
                            </div>

                            <div className="ml-4 flex items-center space-x-2">
                            <button
                                onClick={() => handleRemoveAssignment(assignment.property?._id)}
                                disabled={isRemoving === assignment.property?._id}
                                className="inline-flex items-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                title="Remove assignment"
                            >
                                {isRemoving === assignment.property?._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                <Trash2 className="w-4 h-4" />
                                )}
                            </button>
                            </div>
                        </div>
                        </div>
                    ))
                    ) : (
                    <div className="px-6 py-12 text-center text-gray-500">
                        <Building className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <h4 className="text-sm font-medium text-gray-900">No properties assigned</h4>
                        <p className="text-sm mt-1">
                        This admin doesnt have any property assignments yet.
                        </p>
                        <Link
                        href={`/manager/assign-properties/assign?admin=${adminId}`}
                        className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                        <Plus className="w-4 h-4 mr-2" />
                        Assign Properties
                        </Link>
                    </div>
                    )}
                </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Active Assignments</p>
                        <p className="text-lg font-bold text-gray-900">{activeAssignments.length}</p>
                    </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Settings className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Permissions</p>
                        <p className="text-lg font-bold text-gray-900">
                        {admin.permissions?.length || 0}
                        </p>
                    </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Last Active</p>
                        <p className="text-lg font-bold text-gray-900">
                        {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                        </p>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>
        </div>
    );
    }