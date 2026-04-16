"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/api/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { schemas } from "@/types/api/client";
import LoginSplash from "@/assets/images/login-splash.webp";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type FormData = z.infer<typeof schemas.TokenObtainPairRequest>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { login, isLoading, error, isSuccess, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(schemas.TokenObtainPairRequest),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (values: FormData) => {
    login(values);
  };

  // Redirect after successful login
  useEffect(() => {
    if (isSuccess && isAuthenticated) {
      const nextUrl = searchParams.get("next") || "/";
      router.replace(nextUrl);
    }
  }, [isSuccess, isAuthenticated, router, searchParams]);

  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your ProTrac account
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your username"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <div className="text-sm text-red-600 text-center">
                      Invalid username or password
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </Form>
            </div>
          </div>

          <div className="bg-muted relative hidden md:block">
            <img
              src={LoginSplash.src}
              alt="Login"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-center text-xs">
        Contact administrators to create an account or reset your password
      </div>
    </div>
  );
}
