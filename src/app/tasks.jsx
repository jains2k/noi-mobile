import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Shell from "@/components/Shell";
import {
  Plus,
  Calendar,
  Clock,
  Zap,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  Coffee,
  Star,
  X,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/utils/ThemeProvider";
import { useAuth } from "@/utils/auth/useAuth";
import { apiFetch } from "@/utils/api";
import SchedulePicker from "@/components/SchedulePicker";
import {
  ENERGY_LEVELS,
  energyLabelTextProps,
  getEnergyOptionFlex,
} from "@/utils/energyLevels";

export default function TasksPage() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { themeColors, fontFamily } = useTheme();
  const { isAuthenticated } = useAuth();
  const [filter, setFilter] = useState("active");
  const [energyFilter, setEnergyFilter] = useState("all");
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    energy_level: "medium",
    estimated_time: "",
    status: "active",
  });

  // Calendar scheduling (opt-in). When enabled, the task gets a due_date
  // (defaults to today) and, if a time is picked, a planned_at for the planner.
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [scheduleMinutes, setScheduleMinutes] = useState(null);

  const closeTaskSheet = () => {
    setIsAdding(false);
    setEditingTask(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      energy_level: "medium",
      estimated_time: "",
      status: "active",
    });
    setScheduleEnabled(false);
    setScheduleDate(new Date());
    setScheduleMinutes(null);
  };

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

  const deleteTaskMutation = useMutation({
    mutationFn: async (id) => {
      try {
        const res = await apiFetch(`/api/tasks/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("failed to delete");
      } catch (error) {
        console.error("Error deleting task:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }) => {
      try {
        const res = await apiFetch(`/api/tasks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error("failed to update");
        return res.json();
      } catch (error) {
        console.error("Error updating task:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTask(null);
      setIsAdding(false);
      resetForm();
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task) => {
      try {
        const res = await apiFetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
        });
        if (!res.ok) throw new Error("failed to create");
        return res.json();
      } catch (error) {
        console.error("Error creating task:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsAdding(false);
      resetForm();
    },
  });

  const filteredTasks = tasks.filter((t) => {
    if (filter === "active" && t.status !== "active") return false;
    if (filter === "completed" && t.status !== "completed") return false;
    if (filter === "maybe" && t.status !== "maybe later") return false;
    if (energyFilter !== "all" && t.energy_level !== energyFilter) return false;
    return true;
  });

  const handleSubmit = () => {
    let due_date = null;
    let planned_at = null;
    if (scheduleEnabled) {
      const day = new Date(scheduleDate);
      day.setHours(0, 0, 0, 0);
      due_date = day.toISOString();
      if (scheduleMinutes != null) {
        const dt = new Date(scheduleDate);
        dt.setHours(Math.floor(scheduleMinutes / 60), scheduleMinutes % 60, 0, 0);
        planned_at = dt.toISOString();
      }
    }

    const taskData = {
      title: formData.title,
      description: formData.description || null,
      energy_level: formData.energy_level,
      estimated_time: formData.estimated_time
        ? parseInt(formData.estimated_time)
        : null,
      status: formData.status,
      due_date,
      planned_at,
    };

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, ...taskData });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  return (
    <Shell>
      <StatusBar style="dark" />
      <View style={{ padding: 20, gap: 40 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#1F2937",
                marginBottom: 8,
                fontFamily,
              }}
            >
              tasks
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", fontFamily }}>
              organize your life with gentle focus.
            </Text>
          </View>
        </View>

        {/* Add Button - use themeColors.primary */}
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setIsAdding(true);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 12,
            backgroundColor: themeColors.primary,
            borderRadius: 16,
            shadowColor: themeColors.primary,
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Plus size={20} color="#FFF" />
          <Text
            style={{
              color: "#FFF",
              fontSize: 16,
              fontWeight: "bold",
              fontFamily,
            }}
          >
            add new task
          </Text>
        </TouchableOpacity>

        {/* Filters - update all color references */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              padding: 4,
              borderRadius: 16,
              flexDirection: "row",
              gap: 4,
            }}
          >
            {["active", "maybe", "completed"].map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: filter === f ? "#FFF" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: filter === f ? themeColors.primary : "#9CA3AF",
                    fontFamily,
                  }}
                >
                  {f === "maybe" ? "maybe later" : f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {["all", "low", "medium", "high"].map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => setEnergyFilter(e)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor:
                    energyFilter === e ? themeColors.primary : "transparent",
                  backgroundColor:
                    energyFilter === e
                      ? `${themeColors.primary}10`
                      : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: energyFilter === e ? themeColors.primary : "#9CA3AF",
                    fontFamily,
                  }}
                >
                  {e} energy
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Task List - update borderColor */}
        <View style={{ gap: 16 }}>
          {filteredTasks.length === 0 ? (
            <View
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.4)",
                padding: 80,
                borderRadius: 32,
                borderWidth: 2,
                borderColor: themeColors.primary,
                alignItems: "center",
              }}
            >
              <Coffee size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
              <Text
                style={{ color: "#9CA3AF", fontStyle: "italic", fontFamily }}
              >
                nothing here right now. time for a break? ✦
              </Text>
            </View>
          ) : (
            filteredTasks.map((task) => {
              const isSyncedToCalendar = task.planned_at || task.due_date;
              return (
                <View
                  key={task.id}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.4)",
                    padding: 24,
                    borderRadius: 24,
                    gap: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() =>
                          updateTaskMutation.mutate({
                            id: task.id,
                            status:
                              task.status === "completed"
                                ? "active"
                                : "completed",
                            completed_at:
                              task.status === "completed"
                                ? null
                                : new Date().toISOString(),
                          })
                        }
                      >
                        {task.status === "completed" ? (
                          <CheckCircle2 size={24} color={themeColors.primary} />
                        ) : (
                          <Circle size={24} color="#D1D5DB" />
                        )}
                      </TouchableOpacity>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "bold",
                            color:
                              task.status === "completed"
                                ? "#9CA3AF"
                                : "#374151",
                            textDecorationLine:
                              task.status === "completed"
                                ? "line-through"
                                : "none",
                            fontFamily,
                            flexShrink: 1,
                          }}
                        >
                          {task.title}
                        </Text>
                        {isSyncedToCalendar && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 4,
                            }}
                          >
                            <Calendar
                              size={10}
                              color={`${themeColors.primary}99`}
                            />
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: "bold",
                                color: `${themeColors.primary}99`,
                                fontFamily,
                              }}
                            >
                              synced to calendar
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingTask(task);
                          setFormData({
                            title: task.title,
                            description: task.description || "",
                            energy_level: task.energy_level,
                            estimated_time:
                              task.estimated_time?.toString() || "",
                            status: task.status,
                          });
                          const hasSchedule = !!(
                            task.due_date || task.planned_at
                          );
                          setScheduleEnabled(hasSchedule);
                          setScheduleDate(
                            task.due_date
                              ? new Date(task.due_date)
                              : task.planned_at
                                ? new Date(task.planned_at)
                                : new Date(),
                          );
                          if (task.planned_at) {
                            const p = new Date(task.planned_at);
                            const mins = p.getHours() * 60 + p.getMinutes();
                            // snap to the picker's 10-minute increments
                            setScheduleMinutes(
                              Math.min(Math.round(mins / 10) * 10, 1430),
                            );
                          } else {
                            setScheduleMinutes(null);
                          }
                        }}
                        style={{ padding: 8 }}
                      >
                        <Edit3 size={16} color="#60A5FA" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteTaskMutation.mutate(task.id)}
                        style={{ padding: 8 }}
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor:
                          task.energy_level === "high"
                            ? "#FEE2E2"
                            : task.energy_level === "medium"
                              ? "#FEF3C7"
                              : "#D1FAE5",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Zap
                        size={12}
                        color={
                          task.energy_level === "high"
                            ? "#FB7185"
                            : task.energy_level === "medium"
                              ? "#FBBF24"
                              : "#4ADE80"
                        }
                      />
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          color:
                            task.energy_level === "high"
                              ? "#FB7185"
                              : task.energy_level === "medium"
                                ? "#FBBF24"
                                : "#4ADE80",
                        }}
                      >
                        {task.energy_level} energy
                      </Text>
                    </View>
                    {task.estimated_time && (
                      <View
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: "#F3F4F6",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock size={12} color="#9CA3AF" />
                        <Text
                          style={{
                            fontSize: 10,
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

                  {task.status === "completed" && (
                    <View
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        opacity: 0.5,
                      }}
                    >
                      <Star size={24} color="#FBBF24" fill="#FBBF24" />
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* Add/Edit Task — full-screen slide-up */}
      <Modal
        visible={isAdding || editingTask !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={closeTaskSheet}
      >
        <View style={{ flex: 1, backgroundColor: themeColors.bg1 }}>
          {/* Header */}
          <View
            style={{
              paddingTop: insets.top + 8,
              paddingHorizontal: 20,
              paddingBottom: 16,
              backgroundColor: "rgba(255, 255, 255, 0.5)",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(0,0,0,0.06)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: "#1F2937",
                fontFamily,
              }}
            >
              {editingTask ? "edit task" : "new task"}
            </Text>
            <TouchableOpacity
              onPress={closeTaskSheet}
              hitSlop={12}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.07)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 24, gap: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ gap: 20 }}>
                <View style={{ gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#6B7280",
                      fontFamily,
                    }}
                  >
                    task title
                  </Text>
                  <TextInput
                    value={formData.title}
                    onChangeText={(text) =>
                      setFormData({ ...formData, title: text })
                    }
                    placeholder="e.g. water the plants"
                    placeholderTextColor="#D1D5DB"
                    autoFocus
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.6)",
                      padding: 14,
                      borderRadius: 14,
                      fontSize: 16,
                      color: "#374151",
                      fontFamily,
                    }}
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#6B7280",
                      fontFamily,
                    }}
                  >
                    description (optional)
                  </Text>
                  <TextInput
                    value={formData.description}
                    onChangeText={(text) =>
                      setFormData({ ...formData, description: text })
                    }
                    placeholder="add notes..."
                    placeholderTextColor="#D1D5DB"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.6)",
                      padding: 14,
                      borderRadius: 14,
                      fontSize: 14,
                      color: "#374151",
                      minHeight: 80,
                      fontFamily,
                    }}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#6B7280",
                        fontFamily,
                      }}
                    >
                      energy
                    </Text>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {ENERGY_LEVELS.map((e) => (
                        <TouchableOpacity
                          key={e}
                          onPress={() =>
                            setFormData({ ...formData, energy_level: e })
                          }
                          style={{
                            flex: getEnergyOptionFlex(e),
                            paddingVertical: 10,
                            paddingHorizontal: 2,
                            borderRadius: 10,
                            backgroundColor:
                              formData.energy_level === e
                                ? themeColors.primary
                                : "rgba(255,255,255,0.6)",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            {...energyLabelTextProps}
                            style={{
                              fontSize: 11,
                              fontWeight: "bold",
                              color:
                                formData.energy_level === e ? "#FFF" : "#9CA3AF",
                              fontFamily,
                            }}
                          >
                            {e}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ flex: 1, gap: 6 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#6B7280",
                        fontFamily,
                      }}
                    >
                      time (mins)
                    </Text>
                    <TextInput
                      value={formData.estimated_time}
                      onChangeText={(text) =>
                        setFormData({ ...formData, estimated_time: text })
                      }
                      placeholder="30"
                      placeholderTextColor="#D1D5DB"
                      keyboardType="numeric"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.6)",
                        padding: 14,
                        borderRadius: 14,
                        fontSize: 14,
                        color: "#374151",
                        fontFamily,
                      }}
                    />
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#6B7280",
                      fontFamily,
                    }}
                  >
                    status
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[
                      { label: "active", value: "active" },
                      { label: "maybe later", value: "maybe later" },
                      { label: "done", value: "completed" },
                    ].map((s) => (
                      <TouchableOpacity
                        key={s.value}
                        onPress={() =>
                          setFormData({ ...formData, status: s.value })
                        }
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor:
                            formData.status === s.value
                              ? themeColors.primary
                              : "rgba(255,255,255,0.6)",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "bold",
                            color:
                              formData.status === s.value ? "#FFF" : "#9CA3AF",
                            fontFamily,
                          }}
                        >
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Calendar scheduling (opt-in) */}
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: "rgba(0,0,0,0.06)",
                    paddingTop: 20,
                    gap: 16,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setScheduleEnabled(!scheduleEnabled)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        flex: 1,
                      }}
                    >
                      <Calendar size={20} color={themeColors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "bold",
                            color: "#374151",
                            fontFamily,
                          }}
                        >
                          add to calendar
                        </Text>
                        <Text style={{ fontSize: 12, color: "#9CA3AF", fontFamily }}>
                          pick a date and optional time
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        width: 50,
                        height: 30,
                        borderRadius: 999,
                        padding: 3,
                        backgroundColor: scheduleEnabled
                          ? themeColors.primary
                          : "#E5E7EB",
                        alignItems: scheduleEnabled ? "flex-end" : "flex-start",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: "#FFF",
                          shadowColor: "#000",
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          shadowOffset: { width: 0, height: 1 },
                        }}
                      />
                    </View>
                  </TouchableOpacity>

                  {scheduleEnabled && (
                    <View style={{ gap: 10 }}>
                      <SchedulePicker
                        dateValue={scheduleDate}
                        onDateChange={setScheduleDate}
                        minutesValue={scheduleMinutes}
                        onMinutesChange={setScheduleMinutes}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: themeColors.primary,
                          fontWeight: "bold",
                          fontFamily,
                        }}
                      >
                        shows on your calendar
                        {scheduleMinutes != null ? " and daily planner" : ""}.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Save button — pinned to bottom */}
            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 12,
                paddingBottom: insets.bottom + 24,
                backgroundColor: "rgba(255,255,255,0.95)",
                borderTopWidth: 1,
                borderTopColor: "rgba(0,0,0,0.06)",
              }}
            >
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!formData.title.trim()}
                style={{
                  paddingVertical: 16,
                  borderRadius: 16,
                  backgroundColor: formData.title.trim()
                    ? themeColors.primary
                    : "#E5E7EB",
                  alignItems: "center",
                  shadowColor: themeColors.primary,
                  shadowOpacity: formData.title.trim() ? 0.3 : 0,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: formData.title.trim() ? "#FFF" : "#9CA3AF",
                    fontFamily,
                  }}
                >
                  {editingTask ? "save changes" : "create task"}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Shell>
  );
}
