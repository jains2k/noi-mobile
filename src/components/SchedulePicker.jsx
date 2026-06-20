import { View, Text, Platform, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useMemo, useState } from "react";
import { format, getDaysInMonth, isSameDay, addDays, startOfDay } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useTheme } from "@/utils/ThemeProvider";

// Shared date + time picker used wherever a task is scheduled (Tasks tab,
// Calendar tab). Collapsed by default to two compact summary fields ("date" and
// "time"); tapping one expands its wheel(s) inline so the picker only takes up
// screen space when the user is actually choosing. The date expands to Month and
// Day wheels so months/dates can be scrolled freely. Time is optional ("no
// time"). Cross-platform: wheels on iOS, dropdowns on Android/web (the picker
// package ships its own web build).
//
// Props:
//   dateValue       Date  — the scheduled day (time portion ignored)
//   onDateChange    (Date) => void
//   minutesValue    number | null — minutes into the day, or null for no time
//   onMinutesChange (number | null) => void

const labelStyle = {
  fontSize: 11,
  fontWeight: "bold",
  color: "#9CA3AF",
  paddingLeft: 4,
  marginBottom: 4,
};

// Months to offer: from the earlier of (this month, the value's month) forward
// through ~14 months ahead, so a past date being edited stays selectable and
// the range comfortably covers a year out.
function buildMonthOptions(dateValue) {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let start = thisMonth;
  if (dateValue) {
    const dv = new Date(dateValue.getFullYear(), dateValue.getMonth(), 1);
    if (dv < start) start = dv;
  }
  const end = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 14, 1);
  const opts = [];
  let m = new Date(start);
  while (m <= end) {
    opts.push(new Date(m));
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  }
  return opts;
}

export default function SchedulePicker({
  dateValue,
  onDateChange,
  minutesValue,
  onMinutesChange,
}) {
  const { themeColors } = useTheme();
  const effectiveDate = dateValue || new Date();
  const monthKey = format(effectiveDate, "yyyy-MM");
  const dayKey = String(effectiveDate.getDate());

  const monthOptions = useMemo(
    () => buildMonthOptions(effectiveDate),
    [monthKey],
  );

  const dayCount = getDaysInMonth(effectiveDate);
  const dayOptions = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => i + 1),
    [dayCount],
  );

  const timeOptions = useMemo(() => {
    const opts = [{ label: "no time", value: "none" }];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 10) {
        const mins = h * 60 + m;
        opts.push({
          label: format(new Date(2000, 0, 1, h, m), "h:mm a").toLowerCase(),
          value: String(mins),
        });
      }
    }
    return opts;
  }, []);

  const timeKey = minutesValue == null ? "none" : String(minutesValue);

  const onMonthChange = (key) => {
    const [y, mo] = key.split("-").map(Number);
    // Clamp the day to the new month's length (e.g. Jan 31 → Feb 28).
    const maxDay = getDaysInMonth(new Date(y, mo - 1, 1));
    const day = Math.min(effectiveDate.getDate(), maxDay);
    onDateChange(new Date(y, mo - 1, day));
  };

  const onDayChange = (key) => {
    onDateChange(
      new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), Number(key)),
    );
  };

  // Only one section's wheels are expanded at a time (or none). Collapsed by
  // default so the picker stays compact until the user wants to change a value.
  const [expanded, setExpanded] = useState(null);
  const toggle = (section) =>
    setExpanded((cur) => (cur === section ? null : section));

  const pickerWrap = {
    backgroundColor: "rgba(243, 244, 246, 0.6)",
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center",
    ...(Platform.OS === "ios" ? { height: 180 } : {}),
  };

  const iosItemStyle = Platform.OS === "ios" ? { fontSize: 18 } : undefined;

  const dateSummary = (() => {
    const today = startOfDay(new Date());
    if (isSameDay(effectiveDate, today)) return "today";
    if (isSameDay(effectiveDate, addDays(today, 1))) return "tomorrow";
    return format(effectiveDate, "EEE, MMM d, yyyy");
  })();
  const timeSummary =
    minutesValue == null
      ? "no time"
      : format(
          new Date(2000, 0, 1, Math.floor(minutesValue / 60), minutesValue % 60),
          "h:mm a",
        ).toLowerCase();

  const SummaryField = ({ section, label, value }) => {
    const isOpen = expanded === section;
    const Chevron = isOpen ? ChevronUp : ChevronDown;
    return (
      <TouchableOpacity
        onPress={() => toggle(section)}
        activeOpacity={0.7}
        style={{
          flex: 1,
          backgroundColor: "rgba(243, 244, 246, 0.6)",
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: isOpen ? 1.5 : 0,
          borderColor: themeColors.primary,
        }}
      >
        <Text style={{ ...labelStyle, paddingLeft: 0, marginBottom: 2 }}>
          {label}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <Text
            style={{ fontSize: 15, fontWeight: "600", color: "#374151", flex: 1 }}
            numberOfLines={1}
          >
            {value}
          </Text>
          <Chevron size={16} color={themeColors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Compact summary row — the only thing visible until tapped. */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <SummaryField section="date" label="date" value={dateSummary} />
        <SummaryField section="time" label="time" value={timeSummary} />
      </View>

      {/* Date wheels — month gets most of the width so the full month name
          shows; the day wheel sits beside it. */}
      {expanded === "date" && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 2 }}>
            <Text style={labelStyle}>month</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={monthKey}
                onValueChange={onMonthChange}
                itemStyle={iosItemStyle}
                dropdownIconColor={themeColors.primary}
                style={{ color: "#374151" }}
              >
                {monthOptions.map((m) => {
                  const key = format(m, "yyyy-MM");
                  return (
                    <Picker.Item
                      key={key}
                      label={format(m, "MMMM yyyy")}
                      value={key}
                    />
                  );
                })}
              </Picker>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>day</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={dayKey}
                onValueChange={onDayChange}
                itemStyle={iosItemStyle}
                dropdownIconColor={themeColors.primary}
                style={{ color: "#374151" }}
              >
                {dayOptions.map((d) => (
                  <Picker.Item key={d} label={String(d)} value={String(d)} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      )}

      {/* Time wheel — full width so labels like "12:00 am" show in full. */}
      {expanded === "time" && (
        <View>
          <View style={pickerWrap}>
            <Picker
              selectedValue={timeKey}
              onValueChange={(v) =>
                onMinutesChange(v === "none" ? null : Number(v))
              }
              itemStyle={iosItemStyle}
              dropdownIconColor={themeColors.primary}
              style={{ color: "#374151" }}
            >
              {timeOptions.map((o) => (
                <Picker.Item key={o.value} label={o.label} value={o.value} />
              ))}
            </Picker>
          </View>
        </View>
      )}
    </View>
  );
}
