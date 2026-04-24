import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useState } from "react";
import Shell from "@/components/Shell";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Zap,
  Clock,
  Circle,
  CheckCircle2,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/utils/ThemeProvider";
import { useAuth } from "@/utils/auth/useAuth";
import { apiFetch } from "@/utils/api";

export default function CalendarPage() {
  const { themeColors } = useTheme();
  const { isAuthenticated } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDailyPlanner, setShowDailyPlanner] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/tasks");
        if (!res.ok) return [];
        return res.json();
      } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
      }
    },
    enabled: !!isAuthenticated,
    retry: false,
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (day) => {
    return tasks.filter(
      (t) => t.due_date && isSameDay(new Date(t.due_date), day),
    );
  };

  const getPlannedTasksForDay = (day) => {
    return tasks
      .filter((t) => t.planned_at && isSameDay(new Date(t.planned_at), day))
      .sort((a, b) => new Date(a.planned_at) - new Date(b.planned_at));
  };

  const selectedDayTasks = getTasksForDay(selectedDate);
  const selectedDayPlannedTasks = getPlannedTasksForDay(selectedDate);

  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 9);

  return (
    <Shell>
      <StatusBar style="dark" />
      <View style={{ padding: 20, gap: 32 }}>
        {/* Header */}
        <View>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: "#1F2937",
              marginBottom: 8,
            }}
          >
            calendar
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280" }}>
            visualize your gentle journey.
          </Text>
        </View>

        {/* Controls */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={() => setShowDailyPlanner(!showDailyPlanner)}
            style={{
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: showDailyPlanner
                ? themeColors.primary
                : "rgba(255, 255, 255, 0.4)",
              alignItems: "center",
              shadowColor: showDailyPlanner
                ? themeColors.primary
                : "transparent",
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "bold",
                color: showDailyPlanner ? "#FFF" : "#6B7280",
              }}
            >
              {showDailyPlanner ? "hide" : "show"} daily planner
            </Text>
          </TouchableOpacity>

          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              padding: 8,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              onPress={() => setCurrentDate(subMonths(currentDate, 1))}
              style={{ padding: 8 }}
            >
              <ChevronLeft size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 14, fontWeight: "bold", color: "#374151" }}
            >
              {format(currentDate, "MMMM yyyy")}
            </Text>
            <TouchableOpacity
              onPress={() => setCurrentDate(addMonths(currentDate, 1))}
              style={{ padding: 8 }}
            >
              <ChevronRight size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar Grid */}
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            padding: 16,
            borderRadius: 32,
            borderWidth: 2,
            borderColor: themeColors.primary,
          }}
        >
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((d) => (
              <View
                key={d}
                style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {d}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ gap: 2 }}>
            {Array.from(
              { length: Math.ceil(days.length / 7) },
              (_, weekIdx) => (
                <View key={weekIdx} style={{ flexDirection: "row", gap: 2 }}>
                  {days
                    .slice(weekIdx * 7, weekIdx * 7 + 7)
                    .map((day, dayIdx) => {
                      const dayTasks = getTasksForDay(day);
                      const isCurrentMonth = isSameDay(
                        startOfMonth(day),
                        startOfMonth(currentDate),
                      );
                      const isSelected = isSameDay(day, selectedDate);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <TouchableOpacity
                          key={day.toISOString()}
                          onPress={() => setSelectedDate(day)}
                          style={{
                            flex: 1,
                            minHeight: 64,
                            padding: 4,
                            backgroundColor: isCurrentMonth
                              ? "rgba(255, 255, 255, 0.4)"
                              : "transparent",
                            opacity: isCurrentMonth ? 1 : 0.3,
                            borderWidth: isSelected ? 2 : 0,
                            borderColor: themeColors.primary,
                            borderRadius: 4,
                          }}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: isToday
                                ? themeColors.primary
                                : "transparent",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "bold",
                                color: isToday ? "#FFF" : "#6B7280",
                              }}
                            >
                              {format(day, "d")}
                            </Text>
                          </View>

                          {dayTasks.slice(0, 2).map((task) => (
                            <View
                              key={task.id}
                              style={{
                                backgroundColor:
                                  task.status === "completed"
                                    ? "#F3F4F6"
                                    : "rgba(167, 139, 250, 0.1)",
                                paddingHorizontal: 2,
                                paddingVertical: 1,
                                borderRadius: 2,
                                marginTop: 2,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 6,
                                  color:
                                    task.status === "completed"
                                      ? "#9CA3AF"
                                      : themeColors.primary,
                                  textDecorationLine:
                                    task.status === "completed"
                                      ? "line-through"
                                      : "none",
                                }}
                                numberOfLines={1}
                              >
                                {task.title}
                              </Text>
                            </View>
                          ))}
                          {dayTasks.length > 2 && (
                            <Text
                              style={{
                                fontSize: 6,
                                color: "#9CA3AF",
                                marginTop: 2,
                              }}
                            >
                              +{dayTasks.length - 2}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ),
            )}
          </View>
        </View>

        {/* Selected Day Tasks */}
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            padding: 32,
            borderRadius: 32,
            borderWidth: 2,
            borderColor: themeColors.primary,
            minHeight: 200,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#1F2937",
              marginBottom: 4,
            }}
          >
            {format(selectedDate, "EEEE")}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#9CA3AF",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom: 32,
            }}
          >
            {format(selectedDate, "MMMM do")}
          </Text>

          {selectedDayTasks.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <CalendarIcon
                size={32}
                color="rgba(167, 139, 250, 0.2)"
                style={{ marginBottom: 8 }}
              />
              <Text style={{ color: "#9CA3AF", fontStyle: "italic" }}>
                no tasks for this day.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {selectedDayTasks.map((task) => (
                <View
                  key={task.id}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.4)",
                    padding: 16,
                    borderRadius: 16,
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 size={16} color={themeColors.primary} />
                    ) : (
                      <Circle size={16} color="#D1D5DB" />
                    )}
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color:
                          task.status === "completed" ? "#9CA3AF" : "#374151",
                        textDecorationLine:
                          task.status === "completed" ? "line-through" : "none",
                      }}
                    >
                      {task.title}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: "rgba(167, 139, 250, 0.05)",
                      }}
                    >
                      <Zap size={8} color="rgba(167, 139, 250, 0.6)" />
                      <Text
                        style={{
                          fontSize: 8,
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          color: "rgba(167, 139, 250, 0.6)",
                        }}
                      >
                        {task.energy_level}
                      </Text>
                    </View>
                    {task.estimated_time && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 999,
                          backgroundColor: "#F3F4F6",
                        }}
                      >
                        <Clock size={8} color="#9CA3AF" />
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            textTransform: "uppercase",
                            color: "#9CA3AF",
                          }}
                        >
                          {task.estimated_time}m
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Daily Planner */}
        {showDailyPlanner && (
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              padding: 16,
              borderRadius: 32,
              borderWidth: 2,
              borderColor: themeColors.primary,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#1F2937",
                marginBottom: 24,
              }}
            >
              daily planner - {format(selectedDate, "EEEE, MMMM do")}
            </Text>
            <ScrollView
              style={{ maxHeight: 400 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: 8 }}>
                {timeSlots.map((hour) => {
                  const hourStart = new Date(selectedDate);
                  hourStart.setHours(hour, 0, 0, 0);
                  const hourEnd = new Date(selectedDate);
                  hourEnd.setHours(hour + 1, 0, 0, 0);

                  const tasksInSlot = selectedDayPlannedTasks.filter((task) => {
                    const taskTime = new Date(task.planned_at);
                    return taskTime >= hourStart && taskTime < hourEnd;
                  });

                  return (
                    <View
                      key={hour}
                      style={{
                        flexDirection: "row",
                        gap: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: "rgba(243, 244, 246, 0.5)",
                      }}
                    >
                      <Text
                        style={{
                          width: 60,
                          fontSize: 12,
                          fontWeight: "bold",
                          color: "#9CA3AF",
                        }}
                      >
                        {hour > 12 ? hour - 12 : hour}:00{" "}
                        {hour >= 12 ? "pm" : "am"}
                      </Text>
                      <View style={{ flex: 1, gap: 8 }}>
                        {tasksInSlot.length === 0 ? (
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#D1D5DB",
                              fontStyle: "italic",
                            }}
                          >
                            no tasks scheduled
                          </Text>
                        ) : (
                          tasksInSlot.map((task) => (
                            <View
                              key={task.id}
                              style={{
                                backgroundColor: "rgba(255, 255, 255, 0.4)",
                                padding: 12,
                                borderRadius: 12,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              {task.status === "completed" ? (
                                <CheckCircle2
                                  size={16}
                                  color={themeColors.primary}
                                />
                              ) : (
                                <Circle size={16} color="#D1D5DB" />
                              )}
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "500",
                                  color:
                                    task.status === "completed"
                                      ? "#9CA3AF"
                                      : "#374151",
                                  textDecorationLine:
                                    task.status === "completed"
                                      ? "line-through"
                                      : "none",
                                  flex: 1,
                                }}
                              >
                                {task.title}
                              </Text>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 999,
                                  backgroundColor: "rgba(167, 139, 250, 0.05)",
                                }}
                              >
                                <Zap
                                  size={8}
                                  color="rgba(167, 139, 250, 0.6)"
                                />
                                <Text
                                  style={{
                                    fontSize: 8,
                                    fontWeight: "bold",
                                    textTransform: "uppercase",
                                    color: "rgba(167, 139, 250, 0.6)",
                                  }}
                                >
                                  {task.energy_level}
                                </Text>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </Shell>
  );
}
