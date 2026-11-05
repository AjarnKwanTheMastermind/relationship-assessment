"use client";

import { useEffect, useRef } from "react";
import { MAX_LINE_URL_LENGTH, lineUrlErrors, validateLineUrl } from "@/lib/lineLink";

// The LINE link box. It checks the same rules as the server (https, a LINE address, no spaces, a length limit) as
// the administrator types, and the browser then shows the Thai message and stops the form before anything is sent.
// The server still checks again, because a browser check can always be skipped.
export default function LineUrlInput({ defaultValue, invalid, className }: { defaultValue: string; invalid: boolean; className: string }) {
  const ref = useRef<HTMLInputElement>(null);

  function check(input: HTMLInputElement) {
    const result = validateLineUrl(input.value);
    input.setCustomValidity(result.ok ? "" : lineUrlErrors[result.error]);
  }

  // The starting value is checked too, so a form that opens with a bad value cannot be sent as it is.
  useEffect(() => {
    if (ref.current) check(ref.current);
  }, []);

  return (
    <input
      ref={ref}
      id="lineUrl"
      name="lineUrl"
      type="text"
      inputMode="url"
      autoComplete="off"
      maxLength={MAX_LINE_URL_LENGTH}
      defaultValue={defaultValue}
      onChange={(event) => check(event.currentTarget)}
      aria-invalid={invalid ? true : undefined}
      aria-describedby="lineUrlHelp"
      className={className}
    />
  );
}
