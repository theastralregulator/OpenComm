/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { showToast } from '../components/ui/Toast';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Please enter a valid email address.')
    .trim()
    .toLowerCase(),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    setFormError(null);
    setIsSuccess(false);
    try {
      await resetPassword(data.email);
      setIsSuccess(true);
      showToast.success('Password reset email dispatched.');
    } catch (err: any) {
      const errorMessage = err?.message || 'Unable to send password reset. Please try again later.';
      setFormError(errorMessage);
      showToast.error(errorMessage);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="w-full max-w-md">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary-blue to-primary-purple flex items-center justify-center text-white shadow-md shadow-primary-purple/15 mb-4">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="text-h2 font-bold tracking-tight text-gray-950 dark:text-white">
            Reset Password
          </h2>
          <p className="text-caption text-gray-500 dark:text-slate-400 mt-1">
            Provide your credential address to receive security instructions.
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="purple-glow overflow-hidden shadow-lg">
            <CardContent className="pt-6">
              
              {/* Error Box */}
              {formError && (
                <div className="mb-5 p-3 rounded bg-danger/10 dark:bg-danger/15 border border-danger/20 text-xs text-danger flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Success Screen */}
              {isSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto h-12 w-12 rounded-full bg-success/10 text-success flex items-center justify-center">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Reset Email Dispatched</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">
                      We have dispatched password recovery instructions. Please verify your inbox and spam folders.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsSuccess(false)}
                  >
                    Resend Link
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <Input
                    {...registerField('email')}
                    label="Registered Email"
                    type="email"
                    placeholder="name@example.com"
                    error={errors.email?.message}
                    leftIcon={<Mail className="h-4 w-4" />}
                    disabled={isSubmitting}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full text-center mt-2"
                    isLoading={isSubmitting}
                  >
                    Send Reset Link
                  </Button>
                </form>
              )}
            </CardContent>

            <CardFooter className="justify-between border-t border-gray-100 dark:border-slate-900 bg-gray-50/50 dark:bg-slate-900/10 py-4">
              <Link
                to="/login"
                className="text-xs font-semibold text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Login</span>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
