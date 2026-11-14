// Shown under the backoffice menu while a backoffice page is being read from the database. The menu stays, so the
// administrator sees at once that the click worked.
export default function BackofficeLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">กำลังโหลดข้อมูล</span>
      <div className="skeleton h-7 w-1/3 rounded-lg" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
      </div>
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  );
}
