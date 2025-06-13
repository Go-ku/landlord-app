import AddPropertyForm from '@/components/forms/AddPropertyForm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default function AddPropertyPage() {
  const session = getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add New Property</h1>
      <AddPropertyForm />
    </div>
  );
}