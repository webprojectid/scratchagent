'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { refreshCurrentUser } from "@/lib/current-user";
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff,  
  Shield,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'reset';
type RegistrationStep = 'details' | 'verification' | 'complete';

interface AuthFormProps {
  onSuccess?: (userData: { email: string; name?: string }) => void;
  onClose?: () => void;
  initialMode?: AuthMode;
  className?: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  agreeToTerms: boolean;
  rememberMe: boolean;
  verificationCode: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  agreeToTerms?: string;
  general?: string;
  verificationCode?: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

const calculatePasswordStrength = (password: string): PasswordStrength => {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  };

  const score = Object.values(requirements).filter(Boolean).length;
  const feedback: string[] = [];

  if (!requirements.length) feedback.push('At least 8 characters');
  if (!requirements.uppercase) feedback.push('One uppercase letter');
  if (!requirements.lowercase) feedback.push('One lowercase letter');
  if (!requirements.number) feedback.push('One number');
  if (!requirements.special) feedback.push('One special character');

  return { score, feedback, requirements };
};

const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
  const strength = calculatePasswordStrength(password);
  
  const getStrengthColor = (score: number) => {
    if (score <= 1) return 'text-destructive';
    if (score <= 2) return 'text-orange-500';
    if (score <= 3) return 'text-yellow-500';
    if (score <= 4) return 'text-blue-500';
    return 'text-primary';
  };

  const getStrengthText = (score: number) => {
    if (score <= 1) return 'Very Weak';
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score <= 4) return 'Good';
    return 'Strong';
  };

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${getStrengthColor(strength.score)} bg-current rounded-full`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400 min-w-[60px]">
          {getStrengthText(strength.score)}
        </span>
      </div>
      {strength.feedback.length > 0 && (
        <div className="grid grid-cols-2 gap-1">
          {strength.feedback.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-1 text-[10px] text-amber-400"
            >
              <AlertTriangle className="h-3 w-3" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export function AuthForm({
  onSuccess,
  initialMode = 'login',
  className,
}: AuthFormProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [, setRegistrationStep] = useState<RegistrationStep>('details');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    agreeToTerms: false,
    rememberMe: false,
    verificationCode: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((field: keyof FormData, value: string | boolean) => {
    let error = '';
    
    switch (field) {
      case 'name':
        if (typeof value === 'string' && authMode === 'signup' && !value.trim()) {
          error = 'Nama wajib diisi';
        }
        break;
        
      case 'email':
        if (!value || (typeof value === 'string' && !value.trim())) {
          error = 'Email wajib diisi';
        } else if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Format email tidak valid';
        }
        break;
        
      case 'password':
        if (!value) {
          error = 'Password wajib diisi';
        } else if (typeof value === 'string') {
          if (value.length < 8) {
            error = 'Password minimal 8 karakter';
          } else if (authMode === 'signup') {
            const strength = calculatePasswordStrength(value);
            if (strength.score < 3) {
              error = 'Password terlalu lemah';
            }
          }
        }
        break;
        
      case 'confirmPassword':
        if (authMode === 'signup' && value !== formData.password) {
          error = 'Password tidak cocok';
        }
        break;
    }
    
    return error;
  }, [formData.password, authMode]);

  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (fieldTouched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field as keyof FormErrors]: error || undefined }));
    }
  }, [fieldTouched, validateField]);

  const handleFieldBlur = useCallback((field: keyof FormData) => {
    setFieldTouched(prev => ({ ...prev, [field]: true }));
    const value = formData[field];
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field as keyof FormErrors]: error || undefined }));
  }, [formData, validateField]);

  const validateForm = useCallback(() => {
    const newErrors: FormErrors = {};
    const fieldsToValidate: (keyof FormErrors)[] = ['email', 'password'];
    
    if (authMode === 'signup') {
      fieldsToValidate.push('name', 'confirmPassword', 'agreeToTerms');
    }

    fieldsToValidate.forEach(field => {
      const error = validateField(field as keyof FormData, formData[field as keyof FormData]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [authMode, formData, validateField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (authMode === 'login') {
        const isAdmin = formData.email === 'admin@scratchagent.com' && formData.password === 'scratchagent2024';
        
        if (isAdmin) {
          localStorage.setItem('scratch_user', JSON.stringify({ email: formData.email, name: 'Admin', role: 'admin' }));
          refreshCurrentUser();
          setSuccessMessage('Login admin berhasil');
          setTimeout(() => onSuccess?.({ email: formData.email, name: 'Admin' }), 500);
          return;
        }

        const storedUsers = JSON.parse(localStorage.getItem('scratch_users') || '{}');
        const userKey = formData.email.toLowerCase();
        if (storedUsers[userKey] && storedUsers[userKey].password === formData.password) {
          localStorage.setItem('scratch_user', JSON.stringify({ email: formData.email, name: storedUsers[userKey].name }));
          refreshCurrentUser();
          setSuccessMessage('Login berhasil');
          setTimeout(() => onSuccess?.({ email: formData.email, name: storedUsers[userKey].name }), 500);
          return;
        }

        setErrors({ general: 'Email atau password salah' });
      } else if (authMode === 'signup') {
        const storedUsers = JSON.parse(localStorage.getItem('scratch_users') || '{}');
        const userKey = formData.email.toLowerCase();
        if (storedUsers[userKey]) {
          setErrors({ email: 'Email sudah terdaftar' });
          setIsLoading(false);
          return;
        }
        storedUsers[userKey] = { name: formData.name, password: formData.password, createdAt: new Date().toISOString() };
        localStorage.setItem('scratch_users', JSON.stringify(storedUsers));
        setAuthMode('login');
        setSuccessMessage('Akun berhasil dibuat! Silakan login.');
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      } else if (authMode === 'reset') {
        setSuccessMessage('Link reset password dikirim ke email!');
        setTimeout(() => setAuthMode('login'), 2000);
      }
      
    } catch {
      setErrors({ general: 'Otentikasi gagal. Coba lagi.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    setOauthError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setOauthError(error.message);
        setOauthLoading(null);
      }
    } catch {
      setOauthError('OAuth gagal. Coba lagi.');
      setOauthLoading(null);
    }
  };

  return (
    <div className={cn("p-6", className)}>
      <AnimatePresence mode="wait">
      {successMessage && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }} className="mb-4 flex items-center gap-2 rounded-xl border border-[#74FA6A]/20 bg-[#74FA6A]/10 p-3">
          <svg className="h-4 w-4 text-[#74FA6A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[#74FA6A] text-sm">{successMessage}</span>
        </motion.div>
      )}

      {errors.general && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }} className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-red-400 text-sm">{errors.general}</span>
        </motion.div>
      )}
      </AnimatePresence>

      <motion.div layout className="mb-6 text-center">
        <h2 className="!mb-1 !text-xl !font-bold text-white">
          {authMode === 'login' ? 'Selamat Datang' : 
           authMode === 'reset' ? 'Reset Password' : 'Buat Akun'}
        </h2>
        <p className="text-sm text-slate-400">
          {authMode === 'login' ? 'Masuk ke akun Anda' : 
           authMode === 'reset' ? 'Pulihkan akses akun' :
           'Buat akun baru'}
        </p>
      </motion.div>

      {authMode !== 'reset' && (
        <motion.div layout className="mb-6 flex rounded-xl bg-white/5 p-1">
          <button
            onClick={() => setAuthMode('login')}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
              authMode === 'login'
                ? "bg-[#0C0E10] text-white shadow-sm" 
                : "text-slate-500 hover:text-white"
            )}
            type="button"
          >
            Login
          </button>
          <button
            onClick={() => { setAuthMode('signup'); setRegistrationStep('details'); }}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
              authMode === 'signup'
                ? "bg-[#0C0E10] text-white shadow-sm" 
                : "text-slate-500 hover:text-white"
            )}
            type="button"
          >
            Daftar
          </button>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {authMode === 'reset' ? (
          <>
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input type="email" placeholder="Email" value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)} onBlur={() => handleFieldBlur('email')}
                  className={cn("w-full pl-10 pr-4 py-2.5 bg-white/5 border rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#74FA6A]/40 transition-all", errors.email ? "border-red-500/40" : "border-white/10")} />
              </div>
              {errors.email && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.email}</p>}
            </div>
            <button type="submit" disabled={isLoading || !formData.email}
              className="w-full bg-[#74FA6A] text-black font-medium py-2.5 px-6 rounded-lg hover:opacity-90 transition-all disabled:opacity-50">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Kirim Link Reset'}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => setAuthMode('login')} className="text-[#74FA6A] hover:text-[#74FA6A]/80 text-sm transition-colors">Kembali ke Login</button>
            </div>
          </>
        ) : (
          <>
            {authMode === 'signup' && (
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input type="text" placeholder="Nama Lengkap" value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)} onBlur={() => handleFieldBlur('name')}
                    className={cn("w-full pl-10 pr-4 py-2.5 bg-white/5 border rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#74FA6A]/40 transition-all", errors.name ? "border-red-500/40" : "border-white/10")} />
                </div>
                {errors.name && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.name}</p>}
              </div>
            )}

            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input type="email" placeholder="Email" value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)} onBlur={() => handleFieldBlur('email')}
                  className={cn("w-full pl-10 pr-4 py-2.5 bg-white/5 border rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#74FA6A]/40 transition-all", errors.email ? "border-red-500/40" : "border-white/10")} />
              </div>
              {errors.email && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.email}</p>}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)} onBlur={() => handleFieldBlur('password')}
                  className={cn("w-full pl-10 pr-10 py-2.5 bg-white/5 border rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#74FA6A]/40 transition-all", errors.password ? "border-red-500/40" : "border-white/10")} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.password}</p>}
              {authMode === 'signup' && <PasswordStrengthIndicator password={formData.password} />}
            </div>

            {authMode === 'signup' && (
              <div>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input type={showConfirmPassword ? "text" : "password"} placeholder="Konfirmasi Password" value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)} onBlur={() => handleFieldBlur('confirmPassword')}
                    className={cn("w-full pl-10 pr-10 py-2.5 bg-white/5 border rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#74FA6A]/40 transition-all", errors.confirmPassword ? "border-red-500/40" : "border-white/10")} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.confirmPassword}</p>}
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full bg-[#74FA6A] text-black font-medium py-2.5 px-6 rounded-lg hover:opacity-90 transition-all disabled:opacity-50">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : authMode === 'login' ? 'Masuk' : 'Buat Akun'}
            </button>
          </>
        )}

        {authMode !== 'reset' && (
          <div className="text-center">
            <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-slate-500 hover:text-[#74FA6A] text-xs transition-colors">
              {authMode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login'}
            </button>
          </div>
        )}

      </form>

      {authMode !== 'reset' && (
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-slate-500 text-xs">atau lanjutkan dengan</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {oauthError && (
            <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <span className="text-red-400 text-xs">{oauthError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.56-4.74 3.56-7.75z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.61z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C13.45 2.19 10.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.59 6.16-4.59z" />
                </svg>
              )}
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {oauthLoading === 'github' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              )}
              GitHub
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
