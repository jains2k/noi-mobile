// Shared energy-level UI metadata. The "medium" label is the longest option and
// needs slightly more room in compact segmented controls to avoid wrapping on
// narrow iPhone screens.
export const ENERGY_LEVELS = ["low", "medium", "high"];

export function getEnergyOptionFlex(level) {
  return level === "medium" ? 1.25 : 1;
}

export const energyLabelTextProps = {
  numberOfLines: 1,
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.72,
};
