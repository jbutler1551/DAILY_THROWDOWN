import { useState, useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { supabase } from "@/lib/supabase";
import { getTodayTournamentStatus } from "@/lib/data";
import { getTournamentState } from "@/lib/tournament-state";

function TabIcon({
  name,
  color,
}: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={22} name={name} color={color} />;
}

export default function TabLayout() {
  const [matchBadge, setMatchBadge] = useState(false);
  const [broadcastLive, setBroadcastLive] = useState(false);

  useEffect(() => {
    async function check() {
      const tRes = await getTodayTournamentStatus();
      if (!tRes.ok || !tRes.tournament) return;

      const state = getTournamentState(tRes.tournament);

      if (state === "live") {
        setBroadcastLive(true);

        // Check if user has a pending match
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: entry } = await supabase
          .from("entries")
          .select("id")
          .eq("tournament_id", tRes.tournament.id)
          .eq("profile_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (!entry) return;

        const { data: liveMatch } = await supabase
          .from("matches")
          .select("id")
          .eq("tournament_id", tRes.tournament.id)
          .eq("status", "live")
          .or(`player_a_entry_id.eq.${entry.id},player_b_entry_id.eq.${entry.id}`)
          .maybeSingle();

        if (liveMatch) setMatchBadge(true);
      }
    }

    check();
    // Re-check every 10 seconds during active play
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#e879f9",
        tabBarInactiveTintColor: "rgba(255,255,255,0.35)",
        tabBarStyle: {
          backgroundColor: "#0f0720",
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: 1,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lobby"
        options={{
          title: "Lobby",
          tabBarIcon: ({ color }) => (
            <TabIcon name="sign-in" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="match"
        options={{
          title: "Match",
          tabBarIcon: ({ color }) => (
            <TabIcon name="hand-rock-o" color={color} />
          ),
          tabBarBadge: matchBadge ? "!" : undefined,
          tabBarBadgeStyle: matchBadge
            ? { backgroundColor: "#e879f9", fontSize: 10, minWidth: 18, height: 18 }
            : undefined,
        }}
      />
      <Tabs.Screen
        name="broadcast"
        options={{
          title: "Broadcast",
          tabBarIcon: ({ color }) => (
            <TabIcon name="television" color={color} />
          ),
          tabBarBadge: broadcastLive ? "\u25CF" : undefined,
          tabBarBadgeStyle: broadcastLive
            ? { backgroundColor: "#22d3ee", fontSize: 8, minWidth: 14, height: 14 }
            : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
