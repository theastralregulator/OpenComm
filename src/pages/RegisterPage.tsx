/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { isUsernameUnique } from '../services/authService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { showToast } from '../components/ui/Toast';
import { Shield, User, Mail, Key, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

// Registration Validation Schema matching user constraints
const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required.')
      .max(100, 'Full name must be less than 100 characters.')
      .trim(),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters.')
      .max(20, 'Username must be at most 20 characters.')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores are permitted.')
      .trim()
      .toLowerCase(),
    email: z
      .string()
      .min(1, 'Email is required.')
      .email('Please enter a valid email address.')
      .trim()
      .toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .refine((val) => /[A-Z]/.test(val), 'Must contain at least one uppercase letter.')
      .refine((val) => /[a-z]/.test(val), 'Must contain at least one lowercase letter.')
      .refine((val) => /[0-9]/.test(val), 'Must contain at least one number.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password', '');

  // Live Password Criteria checklist indicators
  const passwordChecks = {
    length: passwordValue.length >= 8,
    hasUpper: /[A-Z]/.test(passwordValue),
    hasLower: /[a-z]/.test(passwordValue),
    hasNumber: /[0-9]/.test(passwordValue),
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setFormError(null);
    try {
      // 1. Double check username uniqueness on submit
      const isUnique = await isUsernameUnique(data.username);
      if (!isUnique) {
        setFormError('This username is already taken by another peer.');
        showToast.error('This username is already taken.');
        return;
      }

      // 2. Perform Account Registration + Profile Creation
      await register(data.email, data.password, data.fullName, data.username);
      
      showToast.success('Account created successfully!');
      
      // 3. Redirect to Profile Setup route (which is nested in authenticated routes)
      navigate('/profile-setup');
    } catch (err: any) {
      const errorMessage = err?.message || 'Unable to create your account. Please try again later.';
      setFormError(errorMessage);
      showToast.error(errorMessage);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="w-full max-w-md">
        
        {/* Header Title */}
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary-blue to-primary-purple flex items-center justify-center text-white shadow-md shadow-primary-purple/15 mb-4">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-h2 font-bold tracking-tight text-gray-950 dark:text-white">
            Create Peer Account
          </h2>
          <p className="text-caption text-gray-500 dark:text-slate-400 mt-1">
            Join the decentralized high-trust professional chat network.
          </p>
        </div>

        {/* Register Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="purple-glow overflow-hidden shadow-lg">
            <CardContent className="pt-6">
              
              {/* Error Callout */}
              {formError && (
                <div className="mb-5 p-3 rounded bg-danger/10 dark:bg-danger/15 border border-danger/20 text-xs text-danger flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  {...registerField('fullName')}
                  label="Full Name"
                  placeholder="Jordan Brooks"
                  error={errors.fullName?.message}
                  leftIcon={<User className="h-4 w-4" />}
                  disabled={isSubmitting}
                />

                <Input
                  {...registerField('username')}
                  label="Unique Username"
                  placeholder="jordan_brooks"
                  error={errors.username?.message}
                  leftIcon={<User className="h-4 w-4" />}
                  helperText="Only lower letters, numbers, and underscores allowed (3-20 characters)."
                  disabled={isSubmitting}
                />

                <Input
                  {...registerField('email')}
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  error={errors.email?.message}
                  leftIcon={<Mail className="h-4 w-4" />}
                  disabled={isSubmitting}
                />

                <Input
                  {...registerField('password')}
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  leftIcon={<Key className="h-4 w-4" />}
                  disabled={isSubmitting}
                />

                {/* Password Criteria Checklist */}
                {passwordValue && (
                  <div className="p-3 rounded bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-[11px] space-y-1.5 font-mono">
                    <p className="text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Security Checks:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${passwordChecks.length ? 'bg-success' : 'bg-gray-300 dark:bg-slate-700'}`} />
                        <span className={passwordChecks.length ? 'text-success font-medium' : 'text-gray-400 dark:text-slate-500'}>8+ Characters</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${passwordChecks.hasUpper ? 'bg-success' : 'bg-gray-300 dark:bg-slate-700'}`} />
                        <span className={passwordChecks.hasUpper ? 'text-success font-medium' : 'text-gray-400 dark:text-slate-500'}>Uppercase Letter</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${passwordChecks.hasLower ? 'bg-success' : 'bg-gray-300 dark:bg-slate-700'}`} />
                        <span className={passwordChecks.hasLower ? 'text-success font-medium' : 'text-gray-400 dark:text-slate-500'}>Lowercase Letter</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${passwordChecks.hasNumber ? 'bg-success' : 'bg-gray-300 dark:bg-slate-700'}`} />
                        <span className={passwordChecks.hasNumber ? 'text-success font-medium' : 'text-gray-400 dark:text-slate-500'}>One Number</span>
                      </div>
                    </div>
                  </div>
                )}

                <Input
                  {...registerField('confirmPassword')}
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  leftIcon={<Key className="h-4 w-4" />}
                  disabled={isSubmitting}
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-center mt-3"
                  isLoading={isSubmitting}
                >
                  Create Account
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center border-t border-gray-100 dark:border-slate-900 bg-gray-50/50 dark:bg-slate-900/10 py-4">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-purple hover:text-primary-blue dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;
