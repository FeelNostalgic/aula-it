"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

function normalizeLoginInput(input: string): string {
  if (input.includes("@")) return input;
  return `${input.toLowerCase()}@aula.local`;
}

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const rawInput = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!rawInput || !password) {
    return { error: "Identificador/email y contraseña son obligatorios" };
  }

  const email = normalizeLoginInput(rawInput);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
export async function loginWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signup(prevState: any, formData: FormData) {
  return { error: "El registro público está deshabilitado. Contacta con el administrador del sistema." };
}

export async function loginTeacher(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile?.role === "student") {
    await supabase.auth.signOut();
    return { error: "Acceso denegado. Esta pantalla es solo para profesores y administradores." };
  }

  if (profile?.role === "admin") {
    redirect("/admin");
  }

  redirect("/dashboard");
}
