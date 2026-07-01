/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Github, HelpCircle, Menu, X } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import { OpenCommLogo } from '../components/common/OpenCommLogo';

export const PublicLayout: React.FC = () => {
  const { isFirebaseConfigured, isMockMode, user } = useAuth();
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-visual-screen flex flex-col bg-bg-light dark:bg-bg-dark transition-colors duration-200">
      {/* 1. Sticky Navigation Bar */}
      <div className="sticky top-4 z-50 w-full max-w-7xl mx-auto px-4 sm:px-6">
        <header className="rounded-2xl border border-indigo-500/15 dark:border-indigo-500/30 bg-white/75 dark:bg-slate-950/75 backdrop-blur-xl shadow-lg shadow-indigo-500/5 px-6 py-3.5 flex items-center justify-between transition-all duration-300">
          {/* Left Logo & Center Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex-shrink-0 hover:opacity-90 transition-opacity">
              <OpenCommLogo showIcon={false} />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <a href="/#hero" className="text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-primary-blue dark:hover:text-accent-blue transition-colors">Home</a>
              <a href="/#features" className="text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-primary-blue dark:hover:text-accent-blue transition-colors">Features</a>
              <a href="/#showcase" className="text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-primary-blue dark:hover:text-accent-blue transition-colors">Rooms</a>
              <a href="/#mission" className="text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-primary-blue dark:hover:text-accent-blue transition-colors">About</a>
              <a href="/#faq" className="text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-primary-blue dark:hover:text-accent-blue transition-colors">FAQ</a>
            </nav>
          </div>

          {/* Right Actions - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <Button
                onClick={() => navigate('/feed')}
                variant="premium"
                size="sm"
                className="text-xs font-semibold px-4 py-2 bg-gradient-to-r from-primary-blue via-primary-purple to-secondary-purple hover:opacity-95 transition-opacity text-white rounded-xl"
              >
                Go to App
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-xs font-semibold">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="premium" size="sm" className="text-xs font-semibold px-4 py-2 bg-gradient-to-r from-primary-blue via-primary-purple to-secondary-purple hover:opacity-95 transition-opacity text-white rounded-xl">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Actions */}
          <div className="flex md:hidden items-center gap-3 ml-auto">
            <ThemeToggle />
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-4 right-4 mt-2 p-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-slate-850/80 shadow-xl flex flex-col gap-4 md:hidden z-55"
            >
              <nav className="flex flex-col gap-3.5">
                <a 
                  href="/#hero" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-primary-blue dark:hover:text-accent-blue transition-colors py-1"
                >
                  Home
                </a>
                <a 
                  href="/#features" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-primary-blue dark:hover:text-accent-blue transition-colors py-1"
                >
                  Features
                </a>
                <a 
                  href="/#showcase" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-primary-blue dark:hover:text-accent-blue transition-colors py-1"
                >
                  Rooms
                </a>
                <a 
                  href="/#mission" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-primary-blue dark:hover:text-accent-blue transition-colors py-1"
                >
                  About
                </a>
                <a 
                  href="/#faq" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-primary-blue dark:hover:text-accent-blue transition-colors py-1"
                >
                  FAQ
                </a>
              </nav>

              <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />

              <div className="flex flex-col gap-2.5">
                {user ? (
                  <Button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/feed');
                    }}
                    variant="premium" 
                    size="sm" 
                    className="w-full text-center"
                  >
                    Go to App
                  </Button>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                      <Button variant="outline" size="sm" className="w-full">
                        Login
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="w-full">
                      <Button variant="premium" size="sm" className="w-full bg-gradient-to-r from-primary-blue via-primary-purple to-secondary-purple text-white">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800/80 py-8 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-slate-500">
          <p>© 2026 OpenComm. Designed for high-trust communication.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-indigo-500 cursor-help flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Guidelines</span>
            </span>
            <span className="hover:text-indigo-500">Security</span>
            <span className="hover:text-indigo-500">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default PublicLayout;
