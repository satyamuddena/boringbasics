import { ButtonLink } from "@/components/Button";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <span className="font-display text-8xl text-accent">404</span>
      <h1 className="mt-4 font-display text-3xl uppercase">Page not found</h1>
      <p className="mt-3 max-w-sm text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <ButtonLink href="/" size="lg" className="mt-8">
        Back to home
      </ButtonLink>
    </section>
  );
}
