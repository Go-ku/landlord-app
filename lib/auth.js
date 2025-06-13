import { compare } from 'bcryptjs';
import { signIn } from 'next-auth/react';
import User from 'models/User';
import dbConnect from './db';

export async function authenticateUser(email, password) {
  await dbConnect();
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('User not found');
  }

  const isValid = await compare(password, user.password);
  
  if (!isValid) {
    throw new Error('Invalid password');
  }

  return user;
}

export async function createUser({ name, email, password }) {
  await dbConnect();
  
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await hash(password, 12);
  const user = await User.create({ name, email, password: hashedPassword });

  return user;
}