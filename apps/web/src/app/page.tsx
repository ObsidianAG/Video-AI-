import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage(): Promise<never> {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
