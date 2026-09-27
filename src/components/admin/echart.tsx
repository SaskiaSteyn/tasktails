"use client";

import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  CanvasRenderer,
]);

/**
 * #329 — the style-guide tokens, resolved to real values. ECharts draws to a
 * canvas and can't read CSS variables, so they are read off the page once at
 * mount; `globals.css` stays the only place a colour is defined.
 */
export type ChartTokens = {
  A: string;
  B: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  track: string;
  surface: string;
  violet: string;
  amber: string;
  font: string;
  displayFont: string;
};

function readTokens(): ChartTokens {
  // `body`, not `:root` — next/font puts its `--font-*` variables on the body class.
  const style = getComputedStyle(document.body);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return {
    A: v("--color-sage"),
    B: v("--color-urgency"),
    ink: v("--color-ink"),
    inkSoft: v("--color-ink-soft"),
    inkFaint: v("--color-ink-faint"),
    track: v("--color-border-track"),
    surface: v("--color-surface"),
    violet: v("--color-violet"),
    amber: v("--color-amber"),
    font: v("--font-sans"),
    displayFont: v("--font-display"),
  };
}

/** Axis, tooltip and toolbox styling every admin chart shares. */
export function baseOption(t: ChartTokens): echarts.EChartsCoreOption {
  const axis = {
    axisLine: { lineStyle: { color: t.track } },
    axisTick: { show: false },
    axisLabel: { color: t.inkFaint, fontSize: 11 },
    splitLine: { lineStyle: { color: t.track } },
    nameTextStyle: { color: t.inkFaint, fontSize: 11 },
  };
  return {
    textStyle: { fontFamily: t.font, color: t.ink },
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
    tooltip: {
      backgroundColor: t.surface,
      borderColor: t.track,
      textStyle: { color: t.ink, fontSize: 12 },
    },
    legend: { top: 0, left: 0, icon: "circle", textStyle: { color: t.inkSoft, fontSize: 11 } },
    // Save-as-PNG for the paper's figures, at print resolution on white.
    toolbox: {
      right: 0,
      top: 0,
      feature: { saveAsImage: { pixelRatio: 3, backgroundColor: "#ffffff", title: "Save PNG" } },
      iconStyle: { borderColor: t.inkFaint },
    },
    xAxis: axis,
    yAxis: axis,
  };
}

/**
 * One chart. `build` receives the resolved tokens and returns an option that
 * is layered over `baseOption` — so a chart only states what is its own.
 */
export function EChart({
  build,
  height = 260,
  label,
}: {
  build: (tokens: ChartTokens) => echarts.EChartsCoreOption;
  height?: number;
  /** Short text description — the canvas itself has none. */
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const node = ref.current!;
    const instance = echarts.init(node);
    chart.current = instance;
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(node);
    return () => {
      observer.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    const tokens = readTokens();
    chart.current?.setOption(baseOption(tokens), true);
    chart.current?.setOption(build(tokens));
  }, [build]);

  return <div ref={ref} role="img" aria-label={label} style={{ height }} className="w-full" />;
}
