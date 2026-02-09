// src/reports/v2/components/ProjectionChart.jsx
// Gráfico SVG simples para react-pdf — mesma série do Dashboard
// Suporta marcadores: aposentadoria, fim de aportes, top events, ponto sensível

import React from "react";
import { View, Text, Svg, Line, Path, Circle, Rect, StyleSheet } from "@react-pdf/renderer";
import { C } from "../pdfTheme";

const cs = StyleSheet.create({
  container: {
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    backgroundColor: C.paper,
  },
  title: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginBottom: 10,
  },
  legend: {
    flexDirection: "row",
    gap: 14,
    marginTop: 10,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 7,
    color: C.secondary,
  },
});

function fmt(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}mil`;
  return String(Math.round(v));
}

/**
 * @param {object} props
 * @param {Array<{age:number,wealth:number}>} props.series
 * @param {number} props.retirementAge
 * @param {number} [props.contributionEndAge]
 * @param {Array<{age:number,value:number,label:string}>} [props.events]
 * @param {object|null} [props.sensitivePoint]
 */
export default function ProjectionChart({
  series,
  retirementAge,
  contributionEndAge,
  events = [],
  sensitivePoint = null,
}) {
  if (!series || series.length < 2) return null;

  const W = 490;
  const H = 200;
  const pad = { top: 22, right: 22, bottom: 32, left: 52 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const pts = series.filter((p) => p?.age != null && Number.isFinite(p?.wealth));
  if (pts.length < 2) return null;

  const minAge = pts[0].age;
  const maxAge = pts[pts.length - 1].age;
  const maxW = Math.max(...pts.map((p) => p.wealth)) * 1.1 || 1;

  const xS = (a) => pad.left + ((a - minAge) / (maxAge - minAge || 1)) * iW;
  const yS = (w) => pad.top + iH - (Math.max(0, w) / maxW) * iH;

  // Line path
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${xS(p.age).toFixed(1)},${yS(p.wealth).toFixed(1)}`)
    .join(" ");

  // Area path
  const area = `${d} L${xS(maxAge).toFixed(1)},${yS(0).toFixed(1)} L${xS(minAge).toFixed(1)},${yS(0).toFixed(1)} Z`;

  // Y ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    val: maxW * f,
    y: yS(maxW * f),
    label: fmt(maxW * f),
  }));

  // X ticks every 5 or 10 years
  const step = maxAge - minAge > 40 ? 10 : 5;
  const xTicks = [];
  for (let a = Math.ceil(minAge / step) * step; a <= maxAge; a += step) xTicks.push(a);
  if (!xTicks.includes(minAge)) xTicks.unshift(minAge);

  // Marker helpers
  const mkLine = (age, color, dasharray) => {
    if (age == null || age < minAge || age > maxAge) return null;
    const x = xS(age);
    return (
      <Line
        key={`mk-${age}-${color}`}
        x1={x} y1={pad.top} x2={x} y2={pad.top + iH}
        stroke={color} strokeWidth={1.2}
        strokeDasharray={dasharray || ""}
      />
    );
  };

  const eventColors = [C.blue, "#8b5cf6", "#c2410c"];

  const legendItems = [
    { color: C.gold, label: "Patrimônio projetado" },
  ];
  if (retirementAge >= minAge && retirementAge <= maxAge) {
    legendItems.push({ color: C.success, label: `Aposentadoria (${retirementAge})` });
  }
  if (contributionEndAge && contributionEndAge >= minAge && contributionEndAge <= maxAge && contributionEndAge !== retirementAge) {
    legendItems.push({ color: "#f59e0b", label: `Fim aportes (${contributionEndAge})` });
  }
  events.forEach((ev, i) => {
    if (ev.age >= minAge && ev.age <= maxAge) {
      legendItems.push({ color: eventColors[i % 3], label: ev.label });
    }
  });
  if (sensitivePoint) {
    legendItems.push({ color: C.danger, label: `Ponto sensível (${sensitivePoint.age})` });
  }

  return (
    <View style={cs.container}>
      <Text style={cs.title}>Evolução Patrimonial Projetada</Text>
      <Svg width={W} height={H}>
        {/* Grid */}
        {yTicks.map((t, i) => (
          <React.Fragment key={`yg-${i}`}>
            <Line x1={pad.left} y1={t.y} x2={W - pad.right} y2={t.y} stroke={C.borderLight} strokeWidth={0.5} />
            <Text x={pad.left - 4} y={t.y + 3} style={{ fontSize: 7, fill: C.muted, textAnchor: "end" }}>
              {t.label}
            </Text>
          </React.Fragment>
        ))}
        {xTicks.map((a) => (
          <Text key={`xt-${a}`} x={xS(a)} y={H - pad.bottom + 14} style={{ fontSize: 7, fill: C.muted, textAnchor: "middle" }}>
            {a}
          </Text>
        ))}

        {/* Area */}
        <Path d={area} fill={C.gold} opacity={0.08} />
        {/* Line */}
        <Path d={d} stroke={C.gold} strokeWidth={2} fill="none" />

        {/* Retirement marker */}
        {mkLine(retirementAge, C.success, "4,3")}
        {/* Contribution end marker */}
        {contributionEndAge && contributionEndAge !== retirementAge && mkLine(contributionEndAge, "#f59e0b", "3,3")}

        {/* Event markers */}
        {events.map((ev, i) => {
          if (ev.age < minAge || ev.age > maxAge) return null;
          const x = xS(ev.age);
          return (
            <React.Fragment key={`ev-${i}`}>
              <Line x1={x} y1={pad.top} x2={x} y2={pad.top + iH} stroke={eventColors[i % 3]} strokeWidth={1} strokeDasharray="2,2" />
              <Circle cx={x} cy={yS(pts.find((p) => p.age === ev.age)?.wealth || 0)} r={3} fill={eventColors[i % 3]} />
            </React.Fragment>
          );
        })}

        {/* Sensitive point */}
        {sensitivePoint && sensitivePoint.age >= minAge && sensitivePoint.age <= maxAge && (
          <React.Fragment>
            <Circle cx={xS(sensitivePoint.age)} cy={yS(sensitivePoint.wealth || 0)} r={4} fill={C.danger} />
            <Line x1={xS(sensitivePoint.age)} y1={pad.top} x2={xS(sensitivePoint.age)} y2={pad.top + iH} stroke={C.danger} strokeWidth={1} strokeDasharray="2,4" />
          </React.Fragment>
        )}
      </Svg>

      {/* Legend */}
      <View style={cs.legend}>
        {legendItems.map((item, i) => (
          <View key={i} style={cs.legendItem}>
            <View style={[cs.legendDot, { backgroundColor: item.color }]} />
            <Text style={cs.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
