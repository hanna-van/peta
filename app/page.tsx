import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Force dynamic rendering — this page checks auth state */
export const dynamic = "force-dynamic";

/**
 * Landing page — redirects to training if authenticated, login otherwise.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/latihan");
  } else {
    redirect("/login");
  }
}
