import {
  ENERGY_LEVELS,
  energyLabelTextProps,
  getEnergyOptionFlex,
} from "@/utils/energyLevels";

describe("energy level UI metadata", () => {
  test("keeps the expected energy options in display order", () => {
    expect(ENERGY_LEVELS).toEqual(["low", "medium", "high"]);
  });

  test("allocates extra compact-control width to the medium label", () => {
    expect(getEnergyOptionFlex("medium")).toBeGreaterThan(getEnergyOptionFlex("low"));
    expect(getEnergyOptionFlex("high")).toBe(getEnergyOptionFlex("low"));
  });

  test("renders energy labels as single-line scalable text", () => {
    expect(energyLabelTextProps).toMatchObject({
      numberOfLines: 1,
      adjustsFontSizeToFit: true,
    });
  });
});
