import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ScreenShell,
  Card,
  HostLine,
  Pill,
  StatBox,
  Button,
} from "@/components/ui";
import { getHostLine } from "@/lib/host";

export default function ResultsScreen() {
  const router = useRouter();

  return (
    <ScreenShell>
      {/* Champion banner */}
      <View className="items-center gap-5 rounded-3xl border border-amber-400/20 bg-amber-900/10 p-6">
        <Pill color="amber">Tournament Complete</Pill>
        <Text className="text-5xl">👑</Text>
        <Text className="text-3xl font-black text-white">Champion</Text>
        <Text className="text-sm text-white/60">
          Today's Daily Throwdown Winner
        </Text>

        <HostLine slot="Host">{getHostLine("champion-crowned")}</HostLine>

        <View className="flex-row gap-3">
          <Button onPress={() => router.push("/lobby")}>
            Join Tomorrow
          </Button>
          <Button variant="secondary" onPress={() => router.push("/")}>
            Home
          </Button>
        </View>
      </View>

      {/* Final standings */}
      <Card title="Final Standings" subtitle="Today's prize winners">
        <View className="gap-3">
          {[
            {
              place: "Champion",
              prize: "$55",
              stat: "-- rounds survived",
              borderColor: "border-amber-400/25 bg-amber-400/8",
              nameColor: "text-amber-200",
            },
            {
              place: "Runner-Up",
              prize: "$25",
              stat: "Lost in championship",
              borderColor: "border-white/15 bg-white/5",
              nameColor: "text-white",
            },
            {
              place: "Semifinalist",
              prize: "$10",
              stat: "Lost in semifinal",
              borderColor: "border-white/10 bg-white/[0.03]",
              nameColor: "text-white/70",
            },
            {
              place: "Semifinalist",
              prize: "$10",
              stat: "Lost in semifinal",
              borderColor: "border-white/10 bg-white/[0.03]",
              nameColor: "text-white/70",
            },
          ].map((entry, i) => (
            <View
              key={i}
              className={`flex-row items-center justify-between rounded-2xl border p-4 ${entry.borderColor}`}
            >
              <View className="flex-row items-center gap-3">
                <LinearGradient
                  colors={["#e879f9", "#8b5cf6"]}
                  className="h-10 w-10 items-center justify-center rounded-full"
                >
                  <Text className="text-sm font-black text-white">?</Text>
                </LinearGradient>
                <View>
                  <Text className={`font-bold ${entry.nameColor}`}>
                    {entry.place}
                  </Text>
                  <Text className="text-xs text-white/40">{entry.stat}</Text>
                </View>
              </View>
              <Text className={`text-xl font-black ${entry.nameColor}`}>
                {entry.prize}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Tournament stats */}
      <Card title="Tournament Stats">
        <View className="flex-row flex-wrap gap-3">
          <View className="w-[48%]">
            <StatBox label="Total Entrants" value="--" />
          </View>
          <View className="w-[48%]">
            <StatBox label="Total Rounds" value="--" />
          </View>
          <View className="w-[48%]">
            <StatBox label="Total Throws" value="--" />
          </View>
          <View className="w-[48%]">
            <StatBox label="Tie Replays" value="--" color="amber" />
          </View>
        </View>
      </Card>

      {/* Next tournament */}
      <View className="items-center rounded-3xl border border-fuchsia-400/15 bg-black/20 p-6">
        <Text className="text-[10px] uppercase tracking-widest text-white/40">
          Next Tournament
        </Text>
        <Text className="mt-2 text-2xl font-black text-fuchsia-200">
          Tomorrow at 2:00 PM CT
        </Text>
        <Text className="mt-2 text-xs text-white/40">
          Your streak continues if you show up.
        </Text>
      </View>
    </ScreenShell>
  );
}
