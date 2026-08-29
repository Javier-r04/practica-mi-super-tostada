"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { loginRequestSchema } from "@misupertostada/shared";
import { Button, Card, InputGroup, Label, TextField } from "@heroui/react";
import { toastError, toastFromError } from "@/components/ui/toaster";
import { Wordmark } from "@/components/brand/wordmark";
import { api } from "@/lib/api";

type LoginValues = { username: string; password: string };

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginValues>({
    defaultValues: { username: "", password: "" },
  });

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--surface-paper)] px-4 py-8 sm:px-6 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-marca/10 opacity-60 blur-3xl w-[800px] h-[400px]" aria-hidden />

      <Card className="mx-auto w-full max-w-[22rem] overflow-hidden border border-[var(--border-subtle)] bg-blanco shadow-xl sm:max-w-[24rem]">
        <Card.Header className="flex flex-col items-center justify-center gap-2 pt-8 sm:pt-10 pb-0">
          <Wordmark className="mx-auto h-60 w-auto max-w-full object-contain object-center sm:h-72 mb-4" />
          <Card.Title className="text-xl font-bold text-tinta-900">
            Iniciar sesión
          </Card.Title>
          <Card.Description className="text-center text-sm font-medium text-tinta-600">
            Ingresa tus credenciales para acceder a tu panel.
          </Card.Description>
        </Card.Header>

        <Card.Content className="px-6 py-6 sm:px-8 sm:py-8">
          <form
            noValidate
            onSubmit={form.handleSubmit(async (values) => {
              const parsed = loginRequestSchema.safeParse(values);
              if (!parsed.success) {
                toastError("Revise usuario y contraseña");
                return;
              }
              try {
                await api("/auth/login", {
                  method: "POST",
                  body: JSON.stringify(parsed.data),
                });
                router.replace("/hoy");
              } catch (err) {
                toastFromError(err, "No se pudo entrar");
              }
            })}
          >
            <div className="grid gap-5 text-left">
              <TextField className="w-full" name="username">
                <Label className="text-xs font-semibold text-tinta-700">
                  Usuario
                </Label>
                <InputGroup className="w-full">
                  <InputGroup.Prefix>
                    <User
                      aria-hidden
                      className="size-[18px] text-tinta-500"
                      strokeWidth={1.75}
                    />
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    id="username"
                    autoComplete="username"
                    autoFocus
                    required
                    placeholder="Tu usuario"
                    {...form.register("username")}
                  />
                </InputGroup>
              </TextField>

              <TextField className="w-full" name="password">
                <Label className="text-xs font-semibold text-tinta-700">
                  Contraseña
                </Label>
                <InputGroup className="w-full">
                  <InputGroup.Prefix>
                    <Lock
                      aria-hidden
                      className="size-[18px] text-tinta-500"
                      strokeWidth={1.75}
                    />
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="Tu contraseña"
                    {...form.register("password")}
                  />
                  <InputGroup.Suffix>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="flex size-7 items-center justify-center rounded-campo text-tinta-500 transition-colors hover:text-tinta-800 focus-visible:outline-none focus-visible:shadow-foco"
                      aria-label={
                        showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="size-[18px]" strokeWidth={1.75} />
                      ) : (
                        <Eye className="size-[18px]" strokeWidth={1.75} />
                      )}
                    </button>
                  </InputGroup.Suffix>
                </InputGroup>
              </TextField>

              <Button
                type="submit"
                className="mt-2 w-full font-semibold shadow-sm"
                isPending={form.formState.isSubmitting}
              >
                Ingresar
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </main>
  );
}

