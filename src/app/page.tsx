import { redirect } from "next/navigation";

/**
 * Placeholder root. The Landing / welcome screen is a separate design and ticket;
 * until it exists, send visitors to Register.
 */
export default function Home() {
  redirect("/register");
}
