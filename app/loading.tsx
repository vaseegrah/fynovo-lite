export default function Loading() {
  return <main className="mx-auto max-w-7xl p-5 md:p-8"><div className="h-8 w-48 animate-pulse rounded bg-slate-200" /><div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl bg-slate-200" />)}</div><div className="mt-6 h-80 animate-pulse rounded-3xl bg-slate-200" /></main>;
}
