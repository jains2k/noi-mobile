// Bottom sheets should dismiss only on intentional downward gestures. Keeping
// this logic pure makes the threshold testable and consistent across the task
// editor and app menu sheets.
export function shouldDismissBottomSheetGesture(gestureState) {
  const downwardDistance = gestureState?.dy ?? 0;
  const downwardVelocity = gestureState?.vy ?? 0;
  return downwardDistance > 80 || (downwardDistance > 24 && downwardVelocity > 1.1);
}
