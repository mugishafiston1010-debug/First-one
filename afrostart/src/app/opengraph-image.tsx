import { ImageResponse } from "next/og";

export const alt = "AfroStart Russia — guides and services for African students in Russia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#1f35a7 0%,#0a1033 70%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 800 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#3a5ce8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>A</div>
          AfroStart <span style={{ color: "#ffc759", marginLeft: 12 }}>Russia</span>
        </div>
        <div style={{ marginTop: 48, fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 950 }}>Your journey to studying and living in Russia starts here.</div>
        <div style={{ marginTop: 28, fontSize: 28, color: "rgba(255,255,255,0.75)" }}>Guides · City information · Trusted services · Opportunities</div>
      </div>
    ),
    size,
  );
}
