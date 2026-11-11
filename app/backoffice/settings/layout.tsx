import SettingsNav from "@/components/SettingsNav";

// Every page under Settings (contact, course details, questions and answers, and the code page) shares this sub menu.
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <SettingsNav />
      {children}
    </div>
  );
}
