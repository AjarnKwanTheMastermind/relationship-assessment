// A settings change waiting for its one-time password. It is stored as JSON, so it is checked
// again when it is read back, exactly as a value typed into the form would be.
import { asValues, courseToValues, validateCourse, type CourseValues } from "./courseEdit";
import { courses } from "./courses";
import { validateLineUrl } from "./lineLink";

export type PendingChange =
  | { type: "line"; value: string | null } // null puts the default link back
  | { type: "course"; key: string; values: CourseValues | null }; // null puts the built-in text back

export function parsePending(json: string): PendingChange | null {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    if (raw.type === "line") {
      if (raw.value === null) return { type: "line", value: null };
      const result = validateLineUrl(String(raw.value ?? ""));
      return result.ok ? { type: "line", value: result.value } : null;
    }
    if (raw.type === "course") {
      const key = String(raw.key ?? "");
      if (!courses.some((course) => course.key === key)) return null;
      if (raw.values === null) return { type: "course", key, values: null };
      const result = validateCourse(asValues(raw.values));
      return result.ok ? { type: "course", key, values: courseToValues(result.value) } : null;
    }
  } catch {
    // falls through to refusal
  }
  return null;
}

// Where the administrator lands after the change is applied.
export function returnPath(change: PendingChange): string {
  return change.type === "course" ? `/backoffice/settings/courses/${change.key}` : "/backoffice/settings";
}
