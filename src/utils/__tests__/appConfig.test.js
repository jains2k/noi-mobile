const resolveAppConfig = require("../../../app.config");

describe("Expo app configuration", () => {
  const baseConfig = {
    name: "noi",
    ios: { bundleIdentifier: "com.example.noi", buildNumber: "47" },
  };

  afterEach(() => {
    delete process.env.GOOGLE_SERVICE_INFO_PLIST;
  });

  it("uses the ignored local Firebase plist during local development", () => {
    expect(resolveAppConfig({ config: baseConfig }).ios.googleServicesFile)
      .toBe("./GoogleService-Info.plist");
  });

  it("uses the protected Firebase file supplied by EAS", () => {
    process.env.GOOGLE_SERVICE_INFO_PLIST = "/tmp/eas/GoogleService-Info.plist";

    expect(resolveAppConfig({ config: baseConfig }).ios.googleServicesFile)
      .toBe("/tmp/eas/GoogleService-Info.plist");
  });
});
