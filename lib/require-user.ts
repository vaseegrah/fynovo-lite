import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function requireUser() {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}
