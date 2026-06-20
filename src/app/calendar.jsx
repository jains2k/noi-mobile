import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform } from "react-native";
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
  Plus,
  X,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDailyPlanner, setShowDailyPlanner] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [prefillHour, setPrefillHour] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskEnergy, setTaskEnergy] = useState("medium");

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

  const createTaskMutation = useMutation({
    mutationFn: async (task) => {
      const res = await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      if (!res.ok) throw new Error("failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowAddTask(false);
      setPrefillHour(null);
      setTaskTitle("");
      setTaskEnergy("medium");
    },
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (day) => {
    const seen = new Set();
    return tasks.filter((t) => {
      const matchDue = t.due_date && isSameDay(new Date(t.due_date), day);
      const matchPlanned = t.planned_at && isSameDay(new Date(t.planned_at), day);
      if ((matchDue || matchPlanned) && !seen.has(t.id)) {
        seen.add(t.id);
        return true;
      }
      return false;
    });
  };

  const getPlannedTasksForDay = (day) => {
    return tasks
      .filter((t) => t.planned_at && isSameDay(new Date(t.planned_at), day))
      .sort((a, b) => new Date(a.planned_at) - new Date(b.planned_at));
  };

  const getDayLoadColor = (day) => {
    const active = getTasksForDay(day).filter((t) => t.status !== "completed");
    const score = active.reduce((sum, t) => {
      if (t.energy_level === "high") return sum + 3;
      if (t.energy_level === "medium") return sum + 2;
      return sum + 1;
    }, 0);
    if (score === 0) return null;
    if (score <= 3) return "rgba(52, 211, 153, 0.15)";
    if (score <= 6) return "rgba(251, 191, 36, 0.15)";
    return "rgba(251, 113, 133, 0.2)";
  };

  const getDayLoadDot = (day) => {
    const active = getTasksForDay(day).filter((t) => t.status !== "completed");
    const score = active.reduce((sum, t) => {
      if (t.energy_level === "high") return sum + 3;
      if (t.energy_level === "medium") return sum + 2;
      return sum + 1;
    }, 0);
    if (score === 0) return null;
    if (score <= 3) return "#34D399";
    if (score <= 6) return "#FBBF24";
    return "#FB7185";
  };

  const selectedDayTasks = getTasksForDay(selectedDate);
  const selectedDayPlannedTasks = getPlannedTasksForDay(selectedDate);

  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 9);

  const openAddTask = (hour) => {
    setPrefillHour(hour ?? null);
    setTaskTitle("");
    setTaskEnergy("medium");
    setShowAddTask(true);
  };

  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;
    let planned_at = null;
    if (prefillHour !== null) {
      const d = new Date(selectedDate);
      d.setHours(prefillHour, 0, 0, 0);
      planned_at = d.toISOString();
    }
    createTaskMutation.mutate({
      title: taskTitle.trim(),
      energy_level: taskEnergy,
      planned_at,
      due_date: new Date(selectedDate).toISOString(),
      status: "active",
    });
  };

  return (
    <Shell>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 32, paddingBottom: 100 }}>
        {/* Header */}
        <View>
          <Text style={{ fontSize: 32, fontWeight: "bold", color: "#1F2937", marginBottom: 8 }}>
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
              backgroundColor: showDailyPlanner ? themeColors.primary : "rgba(255, 255, 255, 0.4)",
              alignItems: "center",
              shadowColor: showDailyPlanner ? themeColors.primary : "transparent",
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "bold", color: showDailyPlanner ? "#FFF" : "#6B7280" }}>
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
            <TouchableOpacity onPress={() => setCurrentDate(subMonths(currentDate, 1))} style={{ padding: 8 }}>
              <ChevronLeft size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#374151" }}>
              {format(currentDate, "MMMM yyyy")}
            </Text>
            <TouchableOpacity onPress={() => setCurrentDate(addMonths(currentDate, 1))} style={{ padding: 8 }}>
              <ChevronRight size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Load Legend */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 9, fontWeight: "bold", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 }}>day load:</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#34D399" }} />
            <Text style={{ fontSize: 9, color: "#6B7280" }}>light</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FBBF24" }} />
            <Text style={{ fontSize: 9, color: "#6B7280" }}>moderate</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FB7185" }} />
            <Text style={{ fontSize: 9, color: "#6B7280" }}>heavy</Text>
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
              <View key={d} style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 }}>
                  {d}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ gap: 2 }}>
            {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIdx) => (
              <View key={weekIdx} style={{ flexDirection: "row", gap: 2 }}>
                {days.slice(weekIdx * 7, weekIdx * 7 + 7).map((day) => {
                  const dayTasks = getTasksForDay(day);
                  const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(currentDate));
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const loadColor = isCurrentMonth ? getDayLoadColor(day) : null;
                  const loadDot = isCurrentMonth ? getDayLoadDot(day) : null;
                  const activeCount = dayTasks.filter((t) => t.status !== "completed").length;

                  return (
                    <TouchableOpacity
                      key={day.toISOString()}
                      onPress={() => setSelectedDate(day)}
                      style={{
                        flex: 1,
                        minHeight: 64,
                        padding: 4,
                        backgroundColor: loadColor || (isCurrentMonth ? "rgba(255, 255, 255, 0.4)" : "transparent"),
                        opacity: isCurrentMonth ? 1 : 0.3,
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: themeColors.primary,
                        borderRadius: 4,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: isToday ? themeColors.primary : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: isToday ? "#FFF" : "#6B7280" }}>
                            {format(day, "d")}
                          </Text>
                        </View>
                        {loadDot && !isToday && (
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: loadDot }} />
                        )}
                      </View>

                      {dayTasks.slice(0, 2).map((task) => (
                        <View
                          key={task.id}
                          style={{
                            backgroundColor: task.status === "completed" ? "#F3F4F6" : `${themeColors.primary}15`,
                            paddingHorizontal: 2,
                            paddingVertical: 1,
                            borderRadius: 2,
                            marginTop: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 7,
                              fontWeight: "600",
                              color: task.status === "completed" ? "#9CA3AF" : themeColors.primary,
                              textDecorationLine: task.status === "completed" ? "line-through" : "none",
                            }}
                            numberOfLines={1}
                          >
                            {task.title}
                          </Text>
                        </View>
                      ))}
                      {dayTasks.length > 2 && (
                        <Text style={{ fontSize: 7, color: "#9CA3AF", marginTop: 2, fontWeight: "bold" }}>
                          +{dayTasks.length - 2}
                        </Text>
                      )}
                      {activeCount > 0 && (
                        <View
                          style={{
                            position: "absolute",
                            bottom: 2,
                            right: 2,
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: activeCount >= 4 ? "rgba(251,113,133,0.2)" : activeCount >= 2 ? "rgba(251,191,36,0.2)" : `${themeColors.primary}15`,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 8, fontWeight: "bold", color: activeCount >= 4 ? "#FB7185" : activeCount >= 2 ? "#D97706" : themeColors.primary }}>
                            {activeCount}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1F2937" }}>
                {format(selectedDate, "EEEE")}
              </Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "bold", textTransform: "uppercase", letterSpacing: 2, marginTop: 4 }}>
                {format(selectedDate, "MMMM do")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => openAddTask(null)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: themeColors.primary,
                borderRadius: 12,
                shadowColor: themeColors.primary,
                shadowOpacity: 0.2,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <Plus size={14} color="#FFF" />
              <Text style={{ fontSize: 12, fontWeight: "bold", color: "#FFF" }}>add task</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 24 }}>
            {selectedDayTasks.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <CalendarIcon size={32} color="rgba(167, 139, 250, 0.2)" style={{ marginBottom: 8 }} />
                <Text style={{ color: "#9CA3AF", fontStyle: "italic" }}>no tasks for this day.</Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {selectedDayTasks.map((task) => (
                  <View
                    key={task.id}
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.4)", padding: 16, borderRadius: 16, gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {task.status === "completed" ? (
                        <CheckCircle2 size={16} color={themeColors.primary} />
                      ) : (
                        <Circle size={16} color="#D1D5DB" />
                      )}
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: task.status === "completed" ? "#9CA3AF" : "#374151",
                          textDecorationLine: task.status === "completed" ? "line-through" : "none",
                        }}
                      >
                        {task.title}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: `${themeColors.primary}08` }}>
                        <Zap size={8} color={`${themeColors.primary}99`} />
                        <Text style={{ fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: `${themeColors.primary}99` }}>{task.energy_level}</Text>
                      </View>
                      {task.estimated_time && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "#F3F4F6" }}>
                          <Clock size={8} color="#9CA3AF" />
                          <Text style={{ fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: "#9CA3AF" }}>{task.estimated_time}m</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
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
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1F2937", marginBottom: 24 }}>
              daily planner - {format(selectedDate, "EEEE, MMMM do")}
            </Text>
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
                    <Text style={{ width: 60, fontSize: 12, fontWeight: "bold", color: "#9CA3AF" }}>
                      {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? "pm" : "am"}
                    </Text>
                    <View style={{ flex: 1, gap: 8 }}>
                      {tasksInSlot.length === 0 ? (
                        <TouchableOpacity
                          onPress={() => openAddTask(hour)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 }}
                        >
                          <Plus size={12} color="#D1D5DB" />
                          <Text style={{ fontSize: 12, color: "#D1D5DB", fontStyle: "italic" }}>add task</Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          {tasksInSlot.map((task) => (
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
                                <CheckCircle2 size={16} color={themeColors.primary} />
                              ) : (
                                <Circle size={16} color="#D1D5DB" />
                              )}
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "500",
                                  color: task.status === "completed" ? "#9CA3AF" : "#374151",
                                  textDecorationLine: task.status === "completed" ? "line-through" : "none",
                                  flex: 1,
                                }}
                              >
                                {task.title}
                              </Text>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: `${themeColors.primary}08` }}>
                                <Zap size={8} color={`${themeColors.primary}99`} />
                                <Text style={{ fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: `${themeColors.primary}99` }}>{task.energy_level}</Text>
                              </View>
                            </View>
                          ))}
                          <TouchableOpacity
                            onPress={() => openAddTask(hour)}
                            style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2 }}
                          >
                            <Plus size={10} color="#D1D5DB" />
                            <Text style={{ fontSize: 10, fontWeight: "bold", color: "#D1D5DB" }}>add another</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showAddTask} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => { setShowAddTask(false); setPrefillHour(null); }}
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "center", alignItems: "center", padding: 20 }}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ width: "100%", maxWidth: 400 }}>
              <View style={{ backgroundColor: "#FFF", borderRadius: 32, padding: 24, gap: 20, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F2937" }}>
                    new task — {format(selectedDate, "MMM d")}{prefillHour !== null ? ` at ${prefillHour > 12 ? prefillHour - 12 : prefillHour}${prefillHour >= 12 ? "pm" : "am"}` : ""}
                  </Text>
                  <TouchableOpacity onPress={() => { setShowAddTask(false); setPrefillHour(null); }}>
                    <X size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "#9CA3AF", paddingLeft: 4 }}>task title</Text>
                  <TextInput
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                    placeholder="e.g. water the plants"
                    placeholderTextColor="#D1D5DB"
                    style={{
                      backgroundColor: "rgba(243, 244, 246, 0.5)",
                      padding: 14,
                      borderRadius: 16,
                      fontSize: 14,
                      color: "#374151",
                    }}
                    autoFocus
                  />
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "#9CA3AF", paddingLeft: 4 }}>energy level</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {["low", "medium", "high"].map((e) => (
                      <TouchableOpacity
                        key={e}
                        onPress={() => setTaskEnergy(e)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 12,
                          backgroundColor: taskEnergy === e ? themeColors.primary : "rgba(243, 244, 246, 0.5)",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "bold", color: taskEnergy === e ? "#FFF" : "#9CA3AF" }}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {prefillHour !== null && (
                  <View style={{ backgroundColor: `${themeColors.primary}10`, padding: 12, borderRadius: 12 }}>
                    <Text style={{ fontSize: 11, color: themeColors.primary, fontWeight: "bold" }}>
                      will be scheduled at {prefillHour > 12 ? prefillHour - 12 : prefillHour}:00 {prefillHour >= 12 ? "pm" : "am"} in your daily planner
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => { setShowAddTask(false); setPrefillHour(null); }}
                    style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: "rgba(243, 244, 246, 0.5)", alignItems: "center" }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "bold", color: "#9CA3AF" }}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreateTask}
                    disabled={!taskTitle.trim()}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 16,
                      backgroundColor: taskTitle.trim() ? themeColors.primary : "#E5E7EB",
                      alignItems: "center",
                      shadowColor: themeColors.primary,
                      shadowOpacity: taskTitle.trim() ? 0.2 : 0,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "bold", color: taskTitle.trim() ? "#FFF" : "#9CA3AF" }}>add task</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </Shell>
  );
}
