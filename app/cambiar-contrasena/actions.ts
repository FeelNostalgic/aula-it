"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function cambiarContrasena(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || !confirm) {
    return { error: "Debes rellenar los dos campos" };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  }

  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden" };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return { error: updateError.message };
  }

  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  redirect("/dashboard");
}
