import Link from "next/link";

const modules = [
  { name: "Clients",    path: "/dashboard/clients",         status: "ready" },
  { name: "Patients",   path: "/dashboard/patients",        status: "ready" },
  { name: "Services",   path: "/dashboard/services",        status: "ready" },
  { name: "Tarification", path: "/dashboard/admin/pricing", status: "ready" },
  { name: "Factures",   path: "/dashboard/invoices",        status: "ready" },
  { name: "Paiements",  path: "/dashboard/payments",        status: "ready" },
];

const stages = [
  { label: "01 — Fondations",          done: true  },
  { label: "02 — Design System",       done: true  },
  { label: "03 — Clients & Patients",  done: true  },
  { label: "04 — Tests Pricing Engine", done: true  },
  { label: "05 — Services",            done: false },
  { label: "06 — Factures",            done: false },
  { label: "07 — Paiements",           done: false },
  { label: "08 — Admin tarifs",        done: false },
  { label: "09 — Auth & Dashboard",    done: false },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-red-600 text-white px-8 py-6 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🚑 MediTrans</h1>
          <p className="text-red-100 text-sm mt-0.5">
            Plateforme de transport médical &amp; soins à domicile — Maroc
          </p>
        </div>
        <Link
          href="/dashboard"
          className="bg-white text-red-600 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          Accéder au tableau de bord →
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Status Banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 flex items-center gap-4">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">Stage 04 — Pricing Engine Tests terminé</p>
            <p className="text-green-700 text-sm">
              146 tests · 9 fichiers · Engine + Snapshot + Hardening + Utils · Couverture complète
            </p>
          </div>
        </div>

        {/* Modules Grid */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Modules disponibles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <Link
                key={mod.name}
                href={mod.path}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-red-400 hover:shadow-sm transition-all group"
              >
                <p className="font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
                  {mod.name}
                </p>
                <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  scaffold prêt
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Feuille de route</h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {stages.map((s) => (
              <div key={s.label} className="px-5 py-3 flex items-center gap-3">
                <span className="text-base">{s.done ? "✅" : "🔜"}</span>
                <span
                  className={`text-sm font-medium ${s.done ? "text-gray-800" : "text-gray-400"}`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Stack technique</h2>
          <div className="flex flex-wrap gap-2">
            {[
              "Next.js 14",
              "TypeScript strict",
              "PostgreSQL",
              "Prisma 5",
              "TailwindCSS",
              "Zod",
              "NextAuth.js",
              "bcryptjs",
            ].map((tech) => (
              <span
                key={tech}
                className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-10 py-4 text-center text-xs text-gray-400">
        MediTrans Core · Blueprint v5.0 · Stage 04 / 09
      </footer>
    </main>
  );
}
