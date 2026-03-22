import React from "react";

interface ClientCardProps {
  name: string;
  isListeningDone: boolean;
  isActiveWorkDone: boolean;
}

const ClientCard = ({ name, isListeningDone, isActiveWorkDone }: ClientCardProps) => {
  let borderStyles = "border border-gray-200 ring-0";

  if (isListeningDone && isActiveWorkDone) {
    borderStyles = "border-2 border-[#40C4C4] ring-2 ring-[#1E3A8A] ring-offset-2 ring-offset-slate-50";
  } else if (isListeningDone) {
    borderStyles = "border-2 border-[#40C4C4] ring-0";
  } else if (isActiveWorkDone) {
    borderStyles = "border-2 border-[#1E3A8A] ring-0";
  }

  return (
    <div
      dir="rtl"
      className={`flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ${borderStyles}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <span className="text-lg">👤</span>
      </div>

      <p className="text-sm font-bold text-foreground">{name}</p>

      <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
        {isListeningDone && <span>🎧 הקשבה</span>}
        {isActiveWorkDone && <span>🧩 עבודה</span>}
      </div>
    </div>
  );
};

interface FamilyFolderProps {
  familyName: string;
  parentEmail: string;
  clients: ClientCardProps[];
}

const FamilyFolder = ({ familyName, parentEmail, clients }: FamilyFolderProps) => {
  return (
    <div dir="rtl" className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground">משפחת {familyName}</h2>
        <p className="text-sm text-muted-foreground">{parentEmail}</p>
      </div>

      <div className="flex flex-col gap-3">
        {clients.map((client, index) => (
          <ClientCard key={index} {...client} />
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          + הוספת בן משפחה
        </button>
      </div>
    </div>
  );
};

export default function DashboardPreview() {
  const sampleClients: ClientCardProps[] = [
    { name: "דניאל", isListeningDone: true, isActiveWorkDone: true },
    { name: "מיכל", isListeningDone: true, isActiveWorkDone: false },
    { name: "יונתן", isListeningDone: false, isActiveWorkDone: true },
    { name: "נועה", isListeningDone: false, isActiveWorkDone: false },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4">
      <FamilyFolder
        familyName="כהן"
        parentEmail="cohen@email.com"
        clients={sampleClients}
      />
    </div>
  );
}
