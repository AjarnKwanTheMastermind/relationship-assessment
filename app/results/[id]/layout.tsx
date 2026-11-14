import { notFound } from "next/navigation";
import { getResponseAnswers } from "@/lib/db";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// An unknown result address must answer 404. The loading placeholder (loading.tsx) starts the answer before the
// page has read the database, and by then the status is already 200, so the check is done here, in the layout,
// which is not behind the placeholder. The page checks again and does the real work.
export default async function ResultLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  if (!UUID.test(params.id) || !(await getResponseAnswers(params.id))) notFound();
  return children;
}
