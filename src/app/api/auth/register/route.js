// src/app/api/auth/register/route.js - Updated with Property Request Handling (Compatible)
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from 'lib/db';
import User from 'models/User';
import Property from 'models/Property';
import PropertyRequest from 'models/PropertyRequest';
import Notification from 'models/Notification';

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const {
      name,
      email,
      password,
      phone,
      role,
      company,
      licenseNumber,
      adminLevel,
      // Tenant-specific property fields
      requestedProperty,
      landlordToNotify,
      propertyRequest
    } = body;

    // Validate required fields
    const errors = {};

    if (!name?.trim()) errors.name = 'Name is required';
    if (!email?.trim()) errors.email = 'Email is required';
    if (!password?.trim()) errors.password = 'Password is required';
    if (!phone?.trim()) errors.phone = 'Phone is required';
    if (!role) errors.role = 'Role is required';

    // Email validation
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (password) {
      if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
    }

    // Role-specific validation
    if (role === 'landlord' && !company?.trim()) {
      errors.company = 'Company name is required for landlords';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user data
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone.trim(),
      role,
      isActive: true
    };

    // Add role-specific fields
    if (role === 'landlord') {
      userData.company = company.trim();
      if (licenseNumber) userData.licenseNumber = licenseNumber.trim();
    } else if (role === 'manager' || role === 'admin') {
      if (company) userData.company = company.trim();
      if (role === 'admin') {
        userData.adminLevel = adminLevel || 'financial';
      }
    }

    // Create the user
    const user = new User(userData);
    await user.save();

    // Handle tenant property requests
    let propertyRequestDoc = null;
    let notificationMessage = 'Registration successful. Please sign in.';

    if (role === 'tenant') {
      try {
        // Case 1: Tenant selected an existing property
        if (requestedProperty && landlordToNotify) {
          // Verify the property exists and get landlord info
          const property = await Property.findById(requestedProperty)
            .populate('landlord', 'name email');

          if (property) {
            // Create property request for existing property
            propertyRequestDoc = new PropertyRequest({
              tenant: user._id,
              requestType: 'existing_property',
              property: property._id,
              landlord: property.landlord._id,
              status: 'pending',
              moveInPreferences: {
                preferredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                leaseDuration: 12
              }
            });

            await propertyRequestDoc.save();

            // Create notification for landlord using your existing structure
            await Notification.create({
              recipient: property.landlord._id,
              sender: user._id,
              type: 'tenant_registration',
              title: 'New Tenant Registration Request',
              message: `${user.name} has registered and wants to rent your property at ${property.address}.`,
              relatedProperty: property._id,
              relatedPropertyRequest: propertyRequestDoc._id,
              // Your existing fields
              relatedDocument: propertyRequestDoc._id,
              relatedDocumentModel: 'PropertyRequest',
              actionRequired: true,
              priority: 'high'
            });

            notificationMessage = 'Registration successful. Your rental request has been sent to the landlord.';
          }
        }
        
        // Case 2: Tenant requested a new property listing
        else if (propertyRequest && propertyRequest.address) {
          // Try to find landlord by email if provided
          let landlord = null;
          if (propertyRequest.landlordEmail) {
            landlord = await User.findOne({ 
              email: propertyRequest.landlordEmail.toLowerCase(), 
              role: 'landlord' 
            });
          }

          // Create property request for new property
          propertyRequestDoc = new PropertyRequest({
            tenant: user._id,
            requestType: 'new_property',
            landlord: landlord?._id || null,
            requestedPropertyDetails: {
              address: propertyRequest.address,
              estimatedRent: propertyRequest.estimatedRent ? parseFloat(propertyRequest.estimatedRent) : null,
              bedrooms: propertyRequest.bedrooms ? parseInt(propertyRequest.bedrooms) : null,
              bathrooms: propertyRequest.bathrooms ? parseFloat(propertyRequest.bathrooms) : null,
              propertyType: propertyRequest.propertyType || 'Apartment',
              description: propertyRequest.description || '',
              landlordEmail: propertyRequest.landlordEmail || '',
              landlordPhone: propertyRequest.landlordPhone || ''
            },
            moveInPreferences: {
              preferredDate: propertyRequest.moveInDate ? new Date(propertyRequest.moveInDate) : null,
              leaseDuration: propertyRequest.leaseDuration ? parseInt(propertyRequest.leaseDuration) : 12
            }
          });

          await propertyRequestDoc.save();

          // Create notification for landlord if found
          if (landlord) {
            await Notification.create({
              recipient: landlord._id,
              sender: user._id,
              type: 'property_request',
              title: 'New Property Listing Request',
              message: `${user.name} has requested you to list a property at ${propertyRequest.address}.`,
              relatedPropertyRequest: propertyRequestDoc._id,
              // Your existing fields
              relatedDocument: propertyRequestDoc._id,
              relatedDocumentModel: 'PropertyRequest',
              actionRequired: true,
              priority: 'medium'
            });

            notificationMessage = 'Registration successful. Your property request has been sent to the landlord.';
          } else {
            notificationMessage = 'Registration successful. We will try to contact the landlord about your property request.';
          }
        }
      } catch (propertyError) {
        console.error('Property request creation error:', propertyError);
        // Don't fail the registration if property request fails
        notificationMessage = 'Registration successful, but there was an issue with your property request. Please contact support.';
      }
    }

    // Prepare response data (exclude sensitive information)
    const responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      company: user.company,
      isActive: user.isActive
    };

    const responseData = {
      success: true,
      data: {
        user: responseUser,
        propertyRequest: propertyRequestDoc ? {
          id: propertyRequestDoc._id,
          type: propertyRequestDoc.requestType,
          status: propertyRequestDoc.status
        } : null
      },
      message: notificationMessage
    };

    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific database errors
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}