/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { AlertCircle, Key, User, Check } from 'lucide-react';
import { showToast } from '../components/ui/Toast';
import { OpenCommLogo } from '../components/common/OpenCommLogo';

// Login validation schema
const loginSchema = z.object({
  emailOrUsername: z
    .string()
    .min(1, 'Email or Username is required')
    .refine(
      (val) => {
        // If it looks like an email, validate email format
        if (val.includes('@')) {
          return z.string().email().safeParse(val).success;
        }
        // Otherwise, it's a username (just length validation)
        return val.length >= 3;
      },
      {
        message: 'Please enter a valid email address or username.',
      }
    ),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setFormError(null);
    try {
      await login(data.emailOrUsername, data.password);
      showToast.success('Successfully logged in.');
      navigate('/feed');
    } catch (err: any) {
      const errorMessage = err?.message || 'Unable to sign in. Please try again later.';
      setFormError(errorMessage);
      showToast.error(errorMessage);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* LEFT SIDE: OpenComm Branding Mesh (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        {/* Decorative Animated Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950" />
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-primary-purple/10 blur-[120px] animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-primary-blue/15 blur-[140px] animate-pulse duration-[12000ms]" />

        {/* Diagonal wireframe mesh representation */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="relative z-10 max-w-md w-full flex flex-col justify-between h-full py-10">
          {/* Logo */}
          <div className="flex items-center">
            <OpenCommLogo iconSize={42} fillClass="fill-white" />
          </div>

          {/* Core Content */}
          <div className="my-auto py-12">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-display text-white mb-6 leading-tight">
                Welcome Back to <br />
                <span className="bg-gradient-to-r from-primary-purple via-secondary-purple to-accent-blue bg-clip-text text-transparent">
                  High-Trust Peer Network
                </span>
              </h1>
              <p className="text-subtitle text-slate-400 font-normal leading-relaxed">
                Connect directly and communicate securely with your verified professional peer group.
              </p>
            </motion.div>

            {/* Micro Stats or Trust Metrics */}
            <div className="mt-12 grid grid-cols-2 gap-6 border-t border-slate-800 pt-8">
              <div>
                <p className="font-mono text-xs text-indigo-400 uppercase tracking-widest mb-1">Architecture</p>
                <p className="text-sm font-semibold text-slate-200">Zero-Knowledge ABAC</p>
              </div>
              <div>
                <p className="font-mono text-xs text-indigo-400 uppercase tracking-widest mb-1">Integrity</p>
                <p className="text-sm font-semibold text-slate-200">Cryptographic Identity</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-slate-500 font-mono">
            &copy; {new Date().getFullYear()} OpenComm Initiative. All Rights Reserved.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Interactive Login Card Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-16">
        <div className="w-full max-w-md flex flex-col gap-8">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="flex flex-col items-center text-center lg:hidden gap-3">
            <OpenCommLogo iconSize={44} />
            <p className="text-caption text-gray-500 dark:text-slate-400 mt-1">
              Secure Peer-to-Peer Communication
            </p>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="purple-glow overflow-hidden shadow-md">
              <CardContent className="pt-8">
                <div className="mb-6 text-center lg:text-left">
                  <h3 className="text-h3 font-bold text-gray-950 dark:text-white">
                    Welcome Back
                  </h3>
                  <p className="text-caption text-gray-500 dark:text-slate-400 mt-1">
                    Please log in to your peer credentials below.
                  </p>
                </div>

                {/* Form Error Message */}
                {formError && (
                  <div className="mb-5 p-3 rounded bg-danger/10 dark:bg-danger/15 border border-danger/20 text-xs text-danger flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <Input
                    {...registerField('emailOrUsername')}
                    label="Email or Username"
                    placeholder="e.g. peer_user or peer@opencomm.app"
                    error={errors.emailOrUsername?.message}
                    leftIcon={<User className="h-4 w-4" />}
                    disabled={isSubmitting}
                    autoComplete="username"
                  />

                  <div className="space-y-1">
                    <Input
                      {...registerField('password')}
                      label="Password"
                      type="password"
                      placeholder="••••••••"
                      error={errors.password?.message}
                      leftIcon={<Key className="h-4 w-4" />}
                      disabled={isSubmitting}
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div className="relative">
                        <input
                          type="checkbox"
                          {...registerField('rememberMe')}
                          disabled={isSubmitting}
                          className="sr-only peer"
                        />
                        <div className="h-4.5 w-4.5 rounded-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 peer-checked:bg-primary-purple peer-checked:border-primary-purple transition-all flex items-center justify-center">
                          <Check className="h-3 w-3 text-white stroke-[3.5px] scale-0 peer-checked:scale-100 transition-transform" />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-600 dark:text-slate-400">
                        Remember Me
                      </span>
                    </label>

                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-primary-purple hover:text-primary-blue dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  <div className="pt-3 flex flex-col gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full text-center"
                      isLoading={isSubmitting}
                    >
                      Sign In
                    </Button>

                    <Link to="/register" className="w-full">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full text-center"
                        disabled={isSubmitting}
                      >
                        Create Account
                      </Button>
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
