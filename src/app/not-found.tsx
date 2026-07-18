import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import NotFound from "./(site)/not-found";

/**
 * Root 404 for URLs outside the (site) route group. Wraps the shared content
 * with the site chrome, which the root layout no longer provides.
 */
export default function RootNotFound() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <NotFound />
      </main>
      <Footer />
    </>
  );
}
