import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16a34a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 29, height: 58, background: "white", borderRadius: 7 }} />
          <div style={{ width: 43, height: 11, background: "white" }} />
          <div style={{ width: 29, height: 58, background: "white", borderRadius: 7 }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
