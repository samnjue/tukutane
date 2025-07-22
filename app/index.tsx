import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { createClient } from "@supabase/supabase-js";
import * as Calendar from "expo-calendar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const supabase = createClient(
  "https://gdcpgamfbiqzwmasauol.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY3BnYW1mYmlxendtYXNhdW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MDc0MTUsImV4cCI6MjA2MjA4MzQxNX0.pGNi9xxyN8bph7dCmLf4Ax8OEvZ01ZA_T93cC2a-r2I"
);

type EventType = {
  id: string;
  name: string;
  category: string;
  image: string;
  host: string;
  startDate: string;
  endDate: string;
  location: string;
};

const filters = ["All", "Food", "Music", "Sports", "Gaming"];

const filterIcons = {
  All: "balloon",
  Food: "fast-food",
  Music: "musical-notes",
  Sports: "football",
  Gaming: "game-controller",
} as const;

type FilterKey = keyof typeof filterIcons;
type FilterIconName = (typeof filterIcons)[FilterKey];

const filterColors: Record<FilterKey, string> = {
  All: "#0B1D51",
  Food: "#901E3E",
  Music: "#72BAA9",
  Sports: "#2ecc71",
  Gaming: "#1abc9c",
};

const EventScreen = () => {
  const [events, setEvents] = useState<EventType[]>([]);
  const [filter, setFilter] = useState<FilterKey>("All");
  const [rsvpStates, setRsvpStates] = useState<Record<string, boolean>>({});
  const [calendarStates, setCalendarStates] = useState<Record<string, boolean>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchEvents();
    (async () => {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access calendar denied");
      }
    })();
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from("events").select("*");
      const { data, error } =
        filter === "All" ? await query : await query.eq("category", filter);
      if (error) console.error("Supabase Error:", error);
      setEvents((data as EventType[]) || []);
    } catch (err: any) {
      console.error("Error fetching events:", err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRsvp = (eventId: string) => {
    setRsvpStates((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const saveToCalendar = async (event: EventType) => {
    try {
      const defaultCalendarSource =
        Platform.OS === "ios"
          ? await getDefaultCalendarSource()
          : {
              isLocalAccount: true,
              name: "Expo Calendar",
              id: "local",
              type: "local",
            };

      const newCalendarID = await Calendar.createCalendarAsync({
        title: "Expo Calendar",
        color: "blue",
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultCalendarSource.id,
        source: defaultCalendarSource,
        name: "internalCalendarName",
        ownerAccount: "personal",
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });

      await Calendar.createEventAsync(newCalendarID, {
        title: event.name,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        timeZone: "UTC",
        location: event.location,
      });

      setCalendarStates((prev) => ({ ...prev, [event.id]: true }));
    } catch (err: any) {
      Alert.alert("Error saving to calendar", err.message);
    }
  };

  const getDefaultCalendarSource = async (): Promise<Calendar.Source> => {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return defaultCalendar.source as Calendar.Source;
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <BlurView
        intensity={80}
        experimentalBlurMethod="dimezisBlurView"
        style={styles.header}
      >
        <Text style={[styles.headerText, { paddingTop: insets.top - 5 }]}>
          Events
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {filters.map((cat) => {
            const isActive = filter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterButton,
                  isActive && {
                    backgroundColor: filterColors[cat as FilterKey],
                  },
                ]}
                onPress={() => setFilter(cat as FilterKey)}
              >
                <Ionicons
                  name={filterIcons[cat as FilterKey] as FilterIconName}
                  size={18}
                  color={isActive ? "#fff" : "#000"}
                />
                <Text
                  style={[
                    styles.filterText,
                    isActive
                      ? styles.activeFilterText
                      : styles.inactiveFilterText,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </BlurView>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {loading ? (
          <Text style={{ textAlign: "center", marginTop: 20 }}>Loading...</Text>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <Image source={{ uri: event.image }} style={styles.eventImage} />
              <View
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor:
                      filterColors[event.category as FilterKey] || "#007AFF",
                  },
                ]}
              >
                <Ionicons
                  name={
                    (filterIcons[event.category as FilterKey] ||
                      "star") as FilterIconName
                  }
                  size={16}
                  color="#fff"
                />
                <Text style={styles.categoryText}>{event.category}</Text>
              </View>

              <View style={styles.eventHeader}>
                <Text style={styles.eventName}>{event.name}</Text>
                <TouchableOpacity
                  style={[
                    styles.rsvpInlineButton,
                    rsvpStates[event.id] && styles.rsvpActive,
                  ]}
                  onPress={() => handleRsvp(event.id)}
                >
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={styles.rsvpText}>
                    {rsvpStates[event.id] ? "RSVP'D" : "RSVP"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.hostText}>hosted by {event.host}</Text>

              <TouchableOpacity
                style={[
                  styles.calendarButton,
                  calendarStates[event.id]
                    ? styles.calendarSaved
                    : styles.calendarDefault,
                ]}
                onPress={() => saveToCalendar(event)}
              >
                <Ionicons
                  name={
                    calendarStates[event.id] ? "checkmark-circle" : "calendar"
                  }
                  size={16}
                  color="#fff"
                />
                <Text style={styles.calendarText}>
                  {calendarStates[event.id]
                    ? "Saved to Calendar"
                    : "Save to Calendar"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 10,
    alignItems: "center",
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  filterScroll: {
    marginTop: 10,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: "#ddd",
  },
  filterText: {
    marginLeft: 6,
  },
  activeFilterText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  inactiveFilterText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "normal",
  },
  content: {
    flex: 1,
  },
  eventCard: {
    margin: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
  },
  eventImage: {
    width: "100%",
    height: 250,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  categoryPill: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryText: {
    color: "#fff",
    marginLeft: 5,
    fontWeight: "bold",
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  eventName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  hostText: {
    fontSize: 16,
    color: "#666",
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  rsvpInlineButton: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 7,
    alignItems: "center",
    gap: 5,
  },
  rsvpActive: {
    backgroundColor: "#C562AF",
  },
  rsvpText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 5,
  },
  calendarButton: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  calendarDefault: {
    backgroundColor: "#ff6200",
  },
  calendarSaved: {
    backgroundColor: "#28a745",
  },
  calendarText: {
    color: "#fff",
    marginLeft: 5,
    fontWeight: "bold",
  },
});

export default EventScreen;
