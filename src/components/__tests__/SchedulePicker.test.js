jest.mock("@/utils/ThemeProvider", () => ({
  useTheme: () => ({ themeColors: { primary: "#fb7185" } }),
}));

import {
  getPickerItemStyle,
  pickerTextColor,
} from "@/components/SchedulePicker";

describe("SchedulePicker themed picker styles", () => {
  test("sets an explicit iOS wheel item color for readable themed date values", () => {
    expect(getPickerItemStyle("ios")).toEqual({
      fontSize: 18,
      color: pickerTextColor,
    });
  });

  test("leaves non-iOS picker item styling to the platform implementation", () => {
    expect(getPickerItemStyle("web")).toBeUndefined();
  });
});
