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
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password || !name) {
    return { error: "Nombre, email y contraseña son obligatorios" };
  }

  if (email.endsWith("@aula.local")) {
    return { error: "Esta cuenta está gestionada por el profesor. Usa tu identificador en la pantalla de inicio de sesión." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        role: "student",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
