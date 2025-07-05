import dbConnect from "lib/db";
import { Lease } from "models";

/**
 * Fetch all leases associated with a specific tenant.
 * @param {string} tenantId - The ID of the tenant.
 * @returns {Promise<Array>} - Array of lease documents.
 */
export async function getLeasesByTenantId(tenantId) {
  await dbConnect();

  const leases = await Lease.find({ tenantId })
    .populate('propertyId', 'address city type bedrooms bathrooms')
    .populate('landlordId', 'name email phone company')
    .lean();

  return leases;
}
