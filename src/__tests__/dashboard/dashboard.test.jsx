import { DASHBOARD_RUNTIME_MARKER } from "@/utils/diagnostics";

describe("Dashboard runtime marker", () => {
  it("exposes the current diagnostic build label", () => {
    expect(DASHBOARD_RUNTIME_MARKER).toBe("noi runtime D1");
  });
});
