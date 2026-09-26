export default function Loading() {
  return (
    <div aria-busy="true" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
      <div style={{ display: "inline-block", width: "32px", height: "32px", border: "3px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );
}
