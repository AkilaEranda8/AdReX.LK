"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Receipt, User, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { appBranding } from "@/lib/company";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

const fieldClass = cn(
  "h-11 rounded-xl pl-10",
  "border-slate-200 bg-white text-foreground placeholder:text-muted-foreground",
  "focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30",
  "dark:border-slate-700/80 dark:bg-[#1a2332] dark:text-white dark:placeholder:text-slate-500"
);

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const rememberMe = watch("rememberMe");

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await api.post("/auth/login", data);
      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "relative flex min-h-screen items-center justify-center p-4",
        "bg-gradient-to-br from-slate-50 via-indigo-50/50 to-slate-100",
        "dark:from-[#080c16] dark:via-[#0f1629] dark:to-[#080c16]"
      )}
    >
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle compact />
      </div>

      <div
        className={cn(
          "w-full max-w-md rounded-2xl border p-8",
          "border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 ring-1 ring-slate-100",
          "dark:border-slate-700/50 dark:bg-[#111827]/95 dark:shadow-2xl dark:shadow-indigo-950/50 dark:ring-white/5"
        )}
      >
        <div className="space-y-4 pb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 dark:shadow-indigo-600/40">
            <Receipt className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{appBranding.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground dark:text-slate-400">
              {appBranding.tagline}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="identifier"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Email or Username
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-slate-500" />
              <Input
                id="identifier"
                placeholder="Enter email or username"
                className={fieldClass}
                {...register("identifier")}
              />
            </div>
            {errors.identifier && (
              <p className="text-sm text-destructive">{errors.identifier.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-slate-500" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className={cn(fieldClass, "pr-11")}
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground dark:text-slate-500 dark:hover:text-slate-300"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setValue("rememberMe", !!checked)}
                className="border-slate-300 data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600 dark:border-slate-600 dark:data-[state=checked]:border-indigo-500 dark:data-[state=checked]:bg-indigo-600"
              />
              <Label
                htmlFor="rememberMe"
                className="cursor-pointer text-sm font-normal text-muted-foreground dark:text-slate-400"
              >
                Remember me
              </Label>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className={cn(
              "group h-11 w-full gap-2 rounded-xl bg-indigo-600 text-base font-semibold text-white",
              "shadow-lg shadow-indigo-600/20 hover:bg-indigo-700",
              "dark:shadow-indigo-600/25 dark:hover:bg-indigo-500"
            )}
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
