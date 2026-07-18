"use client";

/** Delete button with a native confirm guard, submitting a server action. */
export function DeleteForm({
  action,
  label = "Delete",
  confirmText = "Delete this item? This cannot be undone.",
}: {
  action: () => void | Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className="inline"
    >
      <button
        type="submit"
        className="rounded-lg border border-bad/40 px-3 py-1.5 text-xs text-bad transition-colors hover:bg-bad/10"
      >
        {label}
      </button>
    </form>
  );
}
