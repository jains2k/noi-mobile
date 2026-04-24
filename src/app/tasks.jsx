import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from "react-native";
import { useState } from "react";
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
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/utils/ThemeProvider";
import { useAuth } from "@/utils/auth/useAuth";
import { apiFetch } from "@/utils/api";

export default function TasksPage() {
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
      setFormData({
        title: "",
        description: "",
        energy_level: "medium",
        estimated_time: "",
        status: "active",
      });
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
      setFormData({
        title: "",
        description: "",
        energy_level: "medium",
        estimated_time: "",
        status: "active",
      });
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
    const taskData = {
      title: formData.title,
      description: formData.description || null,
      energy_level: formData.energy_level,
      estimated_time: formData.estimated_time
        ? parseInt(formData.estimated_time)
        : null,
      status: formData.status,
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
          onPress={() => setIsAdding(true)}
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
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        flex: 1,
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
                      <View style={{ flex: 1 }}>
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

      {/* Add/Edit Modal */}
      <Modal
        visible={isAdding || editingTask !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsAdding(false);
          setEditingTask(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.2)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFF",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              padding: 24,
              maxHeight: "90%",
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: "#1F2937",
                  marginBottom: 16,
                }}
              >
                {editingTask ? "edit task" : "new task"}
              </Text>

              <View style={{ gap: 16 }}>
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#6B7280",
                      marginBottom: 6,
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
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.4)",
                      padding: 12,
                      borderRadius: 12,
                      fontSize: 14,
                      color: "#374151",
                    }}
                  />
                </View>

                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#6B7280",
                      marginBottom: 6,
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
                    numberOfLines={2}
                    textAlignVertical="top"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.4)",
                      padding: 12,
                      borderRadius: 12,
                      fontSize: 14,
                      color: "#374151",
                      minHeight: 60,
                    }}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#6B7280",
                        marginBottom: 6,
                      }}
                    >
                      energy
                    </Text>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {["low", "medium", "high"].map((e) => (
                        <TouchableOpacity
                          key={e}
                          onPress={() =>
                            setFormData({ ...formData, energy_level: e })
                          }
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor:
                              formData.energy_level === e
                                ? themeColors.primary
                                : "rgba(255,255,255,0.4)",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "bold",
                              color:
                                formData.energy_level === e
                                  ? "#FFF"
                                  : "#9CA3AF",
                            }}
                          >
                            {e}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#6B7280",
                        marginBottom: 6,
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
                        backgroundColor: "rgba(255, 255, 255, 0.4)",
                        padding: 12,
                        borderRadius: 12,
                        fontSize: 14,
                        color: "#374151",
                      }}
                    />
                  </View>
                </View>

                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#6B7280",
                      marginBottom: 6,
                    }}
                  >
                    status
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {[
                      { label: "active", value: "active" },
                      { label: "maybe later", value: "maybe later" },
                      { label: "completed", value: "completed" },
                    ].map((s) => (
                      <TouchableOpacity
                        key={s.value}
                        onPress={() =>
                          setFormData({ ...formData, status: s.value })
                        }
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor:
                            formData.status === s.value
                              ? themeColors.primary
                              : "rgba(255,255,255,0.4)",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "bold",
                            color:
                              formData.status === s.value ? "#FFF" : "#9CA3AF",
                          }}
                        >
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                <TouchableOpacity
                  onPress={() => {
                    setIsAdding(false);
                    setEditingTask(null);
                    setFormData({
                      title: "",
                      description: "",
                      energy_level: "medium",
                      estimated_time: "",
                      status: "active",
                    });
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: "rgba(255, 255, 255, 0.4)",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "#6B7280",
                    }}
                  >
                    cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!formData.title.trim()}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: formData.title.trim()
                      ? themeColors.primary
                      : "#D1D5DB",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "bold", color: "#FFF" }}
                  >
                    {editingTask ? "save" : "create"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}
