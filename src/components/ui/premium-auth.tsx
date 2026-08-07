'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff,  
  Shield,
  AlertTriangle,
  KeyRound,
  Phone,
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
  onClose,
  initialMode = 'login',
  className,
}: AuthFormProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>('details');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
          setSuccessMessage('Login admin berhasil');
          setTimeout(() => onSuccess?.({ email: formData.email, name: 'Admin' }), 500);
          return;
        }

        const storedUsers = JSON.parse(localStorage.getItem('scratch_users') || '{}');
        const userKey = formData.email.toLowerCase();
        if (storedUsers[userKey] && storedUsers[userKey].password === formData.password) {
          localStorage.setItem('scratch_user', JSON.stringify({ email: formData.email, name: storedUsers[userKey].name }));
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

  return (
    <div className={cn("p-6", className)}>
      {successMessage && (
        <div className="mb-4 p-3 bg-[#74FA6A]/10 border border-[#74FA6A]/20 rounded-xl flex items-center gap-2">
          <svg className="h-4 w-4 text-[#74FA6A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[#74FA6A] text-sm">{successMessage}</span>
        </div>
      )}

      {errors.general && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-red-400 text-sm">{errors.general}</span>
        </div>
      )}

      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-1">
          {authMode === 'login' ? 'Selamat Datang' : 
           authMode === 'reset' ? 'Reset Password' : 'Buat Akun'}
        </h2>
        <p className="text-slate-400 text-sm">
          {authMode === 'login' ? 'Masuk ke akun Anda' : 
           authMode === 'reset' ? 'Pulihkan akses akun' :
           'Buat akun baru'}
        </p>
      </div>

      {authMode !== 'reset' && (
        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
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
        </div>
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

        {authMode === 'login' && (
          <div className="text-center">
            <button type="button" onClick={() => setAuthMode('reset')}
              className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
              Lupa password?
            </button>
          </div>
        )}
      </form>
    </div>
  );
}