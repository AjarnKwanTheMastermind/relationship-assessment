import Spinner from "@/components/Spinner";

// Shown while the result is read and scored, right after the last answer is sent.
export default function ResultLoading() {
  return (
    <div role="status" aria-live="polite" className="glass-card mx-auto max-w-2xl space-y-5 rounded-3xl p-8 text-center">
      <div className="flex justify-center">
        <Spinner large />
      </div>
      <p className="font-kanit text-lg text-white">กำลังวิเคราะห์ผลของคุณ...</p>
      <div className="space-y-3">
        <div className="skeleton mx-auto h-4 w-2/3 rounded" />
        <div className="skeleton mx-auto h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}
