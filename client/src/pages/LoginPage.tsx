import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Eye,
  Gauge,
  Lock,
  Mail,
  Package2,
  ShieldCheck,
  Smartphone,
  Truck,
  UserRound,
  Users
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { roleDashboardPath } from '../utils/roles';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(roleDashboardPath[user.role], { replace: true });
    }
  }, [navigate, user]);

  if (user) {
    return <Navigate to={roleDashboardPath[user.role]} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(email, password);
      navigate(roleDashboardPath[loggedInUser.role], { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Unable to login. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#041324] text-white lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen lg:h-[calc(100vh-82px)] lg:min-h-0 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative flex min-h-0 flex-col justify-start gap-3 overflow-hidden px-5 py-4 sm:px-8 lg:justify-between lg:gap-0 lg:px-12 lg:py-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_85%,rgba(230,160,56,0.18),transparent_26%),linear-gradient(135deg,#020b17_0%,#061a31_46%,#092846_100%)]" />
          <div className="absolute inset-y-0 right-0 w-2/3 skew-x-[-14deg] bg-white/[0.035]" />
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14">
                <div className="absolute left-0 top-1 h-10 w-10 rotate-[-3deg] border-4 border-[#f6b84e]" />
                <div className="absolute left-4 top-4 h-10 w-10 rotate-[2deg] border-4 border-[#f6b84e]" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-white">
                  Wholesale
                </p>
                <h1 className="text-2xl font-black uppercase leading-none text-white xl:text-3xl">
                  Photoframe
                </h1>
                <p className="mt-1 text-sm font-bold uppercase tracking-[0.2em] text-[#f6b84e]">
                  Sales Management System
                </p>
              </div>
            </div>

            <div className="mt-4 max-w-xl lg:mt-8 xl:mt-10">
              <h2 className="text-[2rem] font-black leading-tight sm:text-4xl lg:text-5xl xl:text-6xl">
                Show Beautiful.
                <span className="block text-[#f6b84e]">Sell More.</span>
              </h2>
              <div className="mt-3 h-1 w-24 rounded-full bg-[linear-gradient(90deg,#f6b84e,rgba(246,184,78,0))] lg:mt-5 lg:w-28" />
              <p className="mt-3 max-w-md text-sm leading-6 text-white/88 sm:text-base lg:mt-5 lg:text-lg xl:text-xl xl:leading-8">
                Explore our wide range of photoframes, show your collections to customers and grow your business effortlessly.
              </p>
            </div>

            <div className="mt-5 hidden max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 md:grid">
              {[
                { label: 'Admin', sub: 'Full Control', icon: ShieldCheck, tone: 'text-[#f6b84e]' },
                { label: 'Sales Rep', sub: 'Grow Sales', icon: UserRound, tone: 'text-sky-400' },
                { label: 'Driver', sub: 'Deliver Orders', icon: Truck, tone: 'text-lime-400' },
                { label: 'Customer', sub: 'Browse Catalog', icon: Users, tone: 'text-violet-400' }
              ].map((role) => {
                const Icon = role.icon;
                return (
                  <article
                    className="rounded-lg border border-white/8 bg-white/[0.055] px-3 py-4 text-center shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur"
                    key={role.label}
                  >
                    <Icon className={`mx-auto ${role.tone}`} size={28} />
                    <h3 className="mt-2 text-base font-black">{role.label}</h3>
                    <p className="mt-1 text-sm text-white/78">{role.sub}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-4 hidden lg:block">
            <div className="flex min-h-[175px] items-end gap-4">
              <div className="hidden h-24 w-20 rounded-t-[60px] bg-[linear-gradient(160deg,#132316,#4e351b)] shadow-2xl sm:block" />
              <div className="relative h-40 w-36 rotate-[-3deg] rounded-sm border-[10px] border-[#1b1b1c] bg-slate-200 shadow-2xl xl:h-48 xl:w-42">
                <div className="h-full w-full bg-[linear-gradient(145deg,#d9dee5,#f7f8fa_45%,#c7ccd3)] p-5">
                  <div className="h-full w-full bg-[linear-gradient(145deg,#eef1f4,#b9c0c8)]">
                    <div className="h-full w-full bg-[linear-gradient(135deg,#d8dde3_0%,#aab4bd_48%,#eff2f5_49%,#c4cbd2_100%)]" />
                  </div>
                </div>
              </div>
              <div className="relative z-10 h-36 w-32 rotate-[2deg] rounded-sm border-[10px] border-[#9c6e45] bg-slate-100 shadow-2xl xl:h-40 xl:w-36">
                <div className="h-full w-full bg-[linear-gradient(135deg,#f3eee6,#d9c2a4)] p-4">
                  <div className="h-full w-full bg-[linear-gradient(140deg,#edf0f3,#9da8b4_50%,#f8fafc_51%,#c0c7cf)]" />
                </div>
              </div>
              <div className="relative h-28 w-24 rotate-[-2deg] rounded-sm border-[8px] border-[#e7d8c3] bg-white shadow-2xl xl:h-32 xl:w-28">
                <div className="grid h-full place-items-center bg-[#f8f4eb]">
                  <Package2 className="text-emerald-700" size={38} />
                </div>
              </div>
              <div className="hidden h-28 w-24 rounded-t-full bg-[linear-gradient(160deg,#1f3b1f,#7aa23b)] shadow-2xl md:block xl:h-36 xl:w-28" />
            </div>
            <div className="relative -mt-6 rounded-lg border border-[#f6b84e]/30 bg-[#071a2e]/90 px-4 py-3 shadow-2xl backdrop-blur sm:max-w-2xl">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-lg border border-[#f6b84e]/50 bg-[#f6b84e]/15 text-[#f6b84e]">
                  <BadgeCheck size={26} />
                </div>
                <p className="text-sm leading-6 text-white">
                  <span className="font-black text-[#f6b84e]">Trusted by Photoframe Businesses</span>
                  <span className="block text-white/82">to manage sales, showcase catalogs and deliver happiness.</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-0 items-center justify-center overflow-hidden bg-white px-5 py-4 lg:bg-transparent lg:py-5 lg:pr-12">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_44%,rgba(255,255,255,0.05)_45%,transparent_62%)]" />
          <form
            className="relative z-10 w-full max-w-lg rounded-[20px] border border-white/70 bg-white px-5 py-4 text-ink shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:px-8 sm:py-5 lg:rounded-[26px]"
            onSubmit={handleSubmit}
          >
            <div className="absolute right-0 top-0 hidden h-36 w-44 overflow-hidden rounded-tr-[26px] sm:block">
              <div className="absolute inset-0 bg-slate-100" />
              <div className="absolute right-8 top-5 grid grid-cols-5 gap-3">
                {Array.from({ length: 25 }).map((_, index) => (
                  <span className="h-1 w-1 rounded-full bg-slate-300" key={index} />
                ))}
              </div>
              <div className="absolute -right-8 top-20 h-px w-40 rotate-[-45deg] bg-[#df8a16]" />
            </div>

            <div className="relative mx-auto hidden h-20 w-20 place-items-center rounded-xl bg-[#061426] shadow-xl sm:grid">
              <div className="relative h-11 w-11">
                <div className="absolute left-1 top-1 h-7 w-7 border-[3px] border-[#f6b84e]" />
                <div className="absolute left-4 top-4 h-7 w-7 border-[3px] border-[#f6b84e]" />
              </div>
            </div>

            <div className="relative mt-0 text-center sm:mt-4">
              <h2 className="text-3xl font-black text-[#071426] xl:text-4xl">
                Welcome <span className="text-[#d8891f]">Back!</span>
              </h2>
              <p className="mt-2 text-base text-slate-500 xl:text-lg">Sign in to continue to your account</p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-black text-[#071426] sm:text-base" htmlFor="email">
                Email Address
              </label>
              <div className="mt-2 flex h-11 items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 shadow-sm focus-within:border-[#0f4eb8] focus-within:ring-2 focus-within:ring-blue-100 sm:h-12">
                <Mail className="text-slate-500" size={22} />
                <input
                  className="h-full w-full border-0 bg-transparent text-base font-medium text-ink outline-none placeholder:text-slate-400"
                  id="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-black text-[#071426] sm:text-base" htmlFor="password">
                Password
              </label>
              <div className="mt-2 flex h-11 items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 shadow-sm focus-within:border-[#0f4eb8] focus-within:ring-2 focus-within:ring-blue-100 sm:h-12">
                <Lock className="text-slate-500" size={22} />
                <input
                  className="h-full w-full border-0 bg-transparent text-base font-medium text-ink outline-none placeholder:text-slate-400"
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="grid h-9 w-9 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  <Eye size={22} />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-2 font-semibold text-slate-700">
                <input
                  className="h-5 w-5 rounded border-slate-300 text-[#0b4fb3]"
                  defaultChecked
                  type="checkbox"
                />
                Remember me
              </label>
              <button className="font-bold text-[#0b4fb3]" type="button">
                Forgot password?
              </button>
            </div>

            {error ? (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
                {error}
              </p>
            ) : null}

            <button
              className="mt-4 flex h-11 w-full items-center justify-center gap-3 rounded-lg bg-[linear-gradient(90deg,#08348d,#67109a)] text-lg font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
              {!isSubmitting ? <ArrowRight size={24} /> : null}
            </button>

            <div className="my-4 hidden items-center gap-3 text-sm font-bold text-slate-400 sm:flex">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white">
                OR
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="hidden items-center gap-4 rounded-lg bg-slate-50 px-4 py-3 sm:flex">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-[#0b4fb3]">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 className="font-black text-[#071426]">Secure. Reliable. Built for Your Business.</h3>
                <p className="mt-1 text-sm text-slate-500">Your data is protected with enterprise-grade security.</p>
              </div>
            </div>
          </form>
        </section>
      </div>

      <section className="hidden h-[82px] gap-4 border-t border-white/8 bg-[#03101f] px-6 py-3 text-white sm:grid-cols-2 lg:grid lg:grid-cols-4 lg:px-14">
        {[
          { icon: Lock, title: 'Secure Access', text: 'Role-based protection' },
          { icon: Gauge, title: 'Real-time Overview', text: 'Stay updated instantly' },
          { icon: BarChart3, title: 'Business Growth', text: 'Insights that help you grow' },
          { icon: Smartphone, title: 'Anytime, Anywhere', text: 'Access on all your devices' }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article className="flex items-center gap-3 overflow-hidden lg:border-r lg:border-white/10 lg:last:border-r-0" key={item.title}>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/8 text-[#f6b84e]">
                <Icon size={21} />
              </div>
              <div>
                <h3 className="font-black text-[#f6b84e]">{item.title}</h3>
                <p className="mt-0.5 text-sm text-white/82">{item.text}</p>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
