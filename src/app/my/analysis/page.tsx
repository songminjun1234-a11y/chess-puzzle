"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SkillTree } from "@/components/SkillTree";
import type { SkillNode } from "@/lib/skillTree";

type ThemeBreakdown = {
  key: string;
  label: string;
  total: number;
  struggled: number;
  missRate: number;
};

type DailyTrend = {
  date: string;
  accuracy: number | null;
  count: number;
};

const ACCURACY_COLOR = "#81b64c";
const GRID_COLOR = "#3d3a37";
const AXIS_COLOR = "#9ca3af";

function AccuracyTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: DailyTrend }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.count === 0) {
    return (
      <div className="rounded-lg border px-3 py-2 text-xs" style={{ background: "#1e1c1a", borderColor: GRID_COLOR, color: "var(--color-text-muted)" }}>
        {label} · 풀이 없음
      </div>
    );
  }
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs"
      style={{ background: "#1e1c1a", borderColor: GRID_COLOR, color: "var(--color-text)" }}
    >
      <div className="font-semibold mb-1">{label}</div>
      <div style={{ color: "var(--color-text-muted)" }}>
        정답률 {d.accuracy}% · {d.count}문제 풀이
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const { status } = useSession();
  const [themeBreakdown, setThemeBreakdown] = useState<ThemeBreakdown[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [skillTree, setSkillTree] = useState<SkillNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/my/analysis")
        .then((r) => r.json())
        .then((data) => {
          setThemeBreakdown(data.themeBreakdown ?? []);
          setDailyTrend(data.dailyTrend ?? []);
          setSkillTree(data.skillTree ?? []);
          setLoading(false);
        });
    }
  }, [status]);

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <p style={{ color: "var(--color-text-muted)" }}>
          <Link href="/login" style={{ color: "var(--color-gold)" }} className="hover:underline">
            로그인
          </Link>
          이 필요합니다.
        </p>
      </div>
    );
  }

  const activeDays = dailyTrend.filter((d) => d.count > 0);
  const chartData = dailyTrend.map((d) => ({ ...d, accuracyForChart: d.count > 0 ? d.accuracy : null }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/my" className="text-sm hover:underline" style={{ color: "var(--color-text-muted)" }}>
          ← My
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text)" }}>
        약점 분석
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
        어떤 유형에서 자주 틀리는지, 최근 정답률이 어떻게 바뀌고 있는지 확인해보세요.
      </p>

      {!loading && themeBreakdown.some((t) => t.missRate > 0) && (
        <Link href="/puzzle?review=1" className="btn-classic-gold inline-block px-5 py-2 text-sm mb-8">
          🔁 전체 약점 복습하기
        </Link>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          불러오는 중...
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {/* 스킬 트리 */}
          <div className="panel-classic p-5">
            <h2 className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>
              전술 스킬 트리
            </h2>
            <p className="text-xs mb-5" style={{ color: "var(--color-text-muted)" }}>
              🔒 시작 전 · 색이 있으면 도전한 스킬입니다. 시계 아이콘은 복습 기한이 지났다는 뜻이에요. 클릭하면 바로 연습할 수 있습니다.
            </p>
            <SkillTree nodes={skillTree} />
          </div>

          {/* 최근 30일 정답률 추이 */}
          <div className="panel-classic p-5">
            <h2 className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>
              최근 30일 정답률 추이
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              하루에 푼 문제 중 한 번에 맞힌 비율입니다
            </p>
            {activeDays.length < 2 ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
                아직 추이를 보기엔 데이터가 부족합니다. 며칠 더 풀어보세요.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
                  <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                    axisLine={{ stroke: GRID_COLOR }}
                    tickLine={false}
                    interval={Math.max(0, Math.floor(dailyTrend.length / 6))}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                    axisLine={{ stroke: GRID_COLOR }}
                    tickLine={false}
                    unit="%"
                    width={44}
                  />
                  <Tooltip content={<AccuracyTooltip />} cursor={{ stroke: GRID_COLOR }} />
                  <Line
                    type="monotone"
                    dataKey="accuracyForChart"
                    stroke={ACCURACY_COLOR}
                    strokeWidth={2}
                    dot={{ r: 3, fill: ACCURACY_COLOR, strokeWidth: 0 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
