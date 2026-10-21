export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton h-7 w-40" />
      <div className="skeleton mt-2 h-4 w-64" />
      <div className="mt-6 grid grid-cols-2 gap-px lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 rounded-none" />
        ))}
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="skeleton h-80 lg:col-span-2" />
        <div className="skeleton h-72" />
        <div className="skeleton h-72" />
      </div>
    </div>
  );
}
