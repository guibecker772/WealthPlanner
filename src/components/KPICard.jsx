import React from "react";

export default function KPICard({
  label,
  value,
  subtext,
  icon: Icon,
  color = "sky",
  status,
  active,
}) {
  let statusClasses = `text-${color}-600 bg-${color}-50 border-${color}-100`;

  if (status === "danger") statusClasses = "text-rose-600 bg-rose-50 border-rose-100";
  if (status === "warning") statusClasses = "text-amber-600 bg-amber-50 border-amber-100";
  if (status === "safe") statusClasses = "text-emerald-600 bg-emerald-50 border-emerald-100";
  if (active)
    statusClasses =
      "text-white bg-indigo-600 border-indigo-600 shadow-md ring-2 ring-indigo-300";

  return (
    <div
      className={`p-5 rounded-xl border transition-all flex items-start justify-between ${statusClasses} print:border-slate-200 print:bg-white print:text-slate-900 print:p-2`}
    >
      <div>
        <p
          className={`text-xs font-bold uppercase tracking-wider mb-1 ${
            active ? "text-indigo-200" : "text-slate-500"
          } print:text-slate-500`}
        >
          {label}
        </p>
        <h4
          className={`text-2xl font-bold ${
            active ? "text-white" : "text-slate-900"
          } print:text-slate-900 print:text-xl`}
        >
          {value}
        </h4>
        {subtext && (
          <p
            className={`text-xs mt-1 ${
              active ? "text-indigo-100" : "text-slate-500"
            } print:text-slate-500`}
          >
            {subtext}
          </p>
        )}
      </div>

      <div
        className={`p-2.5 rounded-lg ${
          active ? "bg-indigo-500 text-white" : "bg-white/50"
        } print:hidden`}
      >
        {Icon ? <Icon size={24} /> : null}
      </div>
    </div>
  );
}
