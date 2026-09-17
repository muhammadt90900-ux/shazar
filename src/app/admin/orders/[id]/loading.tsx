export default function Loading() {
  return (
    <div className="admin-shell">
      <main className="admin-main admin-stack" aria-busy="true">
        <div className="admin-skeleton" style={{ width: 180, height: 22 }} />
        <div className="admin-skeleton" />
        <div className="admin-skeleton" />
        <div className="admin-skeleton" />
      </main>
    </div>
  );
}
