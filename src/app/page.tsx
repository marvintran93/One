import { redirect } from "next/navigation";

export default function HomePage() {
  // Middleware already handles signed-in users; anyone landing here unauthenticated
  // is sent to /login.
  redirect("/login");
}
