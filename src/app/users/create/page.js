// app/users/create/page.js (Server Component)
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import CreateUserForm from './create-user-form';

export const metadata = {
  title: 'Create New User',
  description: 'Add a new user to the system',
};

export default async function CreateUserPage() {
  // Check authentication and authorization on the server
  const session = await getServerSession(authOptions);
  
  // Redirect if not authenticated
  if (!session) {
    redirect('/auth/signin');
  }
  
  // Redirect if user doesn't have manager role
  if (session.user.role !== 'manager') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-2xl">
        <CreateUserForm />
      </div>
    </div>
  );
}