"use client";

import { useFormStatus } from "react-dom";
import Spinner from "./Spinner";

// A submit button for a form that runs a server action. While the action runs it turns off and shows a spinner
// with `pendingText`, so a click is never met with silence. With two buttons in one form (save and reset), only
// the one that was pressed shows the spinner: the form carries the choice in the field "intent".
export default function SubmitButton({
  children,
  pendingText,
  className,
  name,
  value,
  formNoValidate,
}: {
  children: React.ReactNode;
  pendingText: string;
  className: string;
  name?: string;
  value?: string;
  formNoValidate?: boolean;
}) {
  const { pending, data } = useFormStatus();
  const submitted = data?.get("intent");
  const mine = pending && (name === "intent" ? submitted === value : !submitted);

  return (
    <button
      type="submit"
      name={name}
      value={value}
      formNoValidate={formNoValidate}
      disabled={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {mine ? (
        <span className="inline-flex items-center gap-2">
          <Spinner />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
