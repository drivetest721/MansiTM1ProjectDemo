import { useEffect, useState } from 'react';
import { Loader2, Database, Box, List, Grid3X3, ChevronRight, ChevronDown } from 'lucide-react';
import { getCubes, getCubeDetails, getCubeSampleData } from '../services/api';
import AnnotationPanel from '../components/AnnotationPanel';

// ─── Colour palette for dimensions ───────────────────────────────────────────
const DIM_COLORS = [
  { face: '#4F8EF7', edge: '#2563EB', text: '#1D4ED8', light: '#DBEAFE' },
  { face: '#34D399', edge: '#059669', text: '#065F46', light: '#D1FAE5' },
  { face: '#F97316', edge: '#EA580C', text: '#9A3412', light: '#FFEDD5' },
  { face: '#A78BFA', edge: '#7C3AED', text: '#5B21B6', light: '#EDE9FE' },
  { face: '#F472B6', edge: '#DB2777', text: '#9D174D', light: '#FCE7F3' },
  { face: '#FBBF24', edge: '#D97706', text: '#92400E', light: '#FEF3C7' },
];

// ─── TM1-style grid cube ──────────────────────────────────────────────────────
// Right face: dark navy + orange/red accents
const RIGHT_PALETTE  = ['#1E3A5F','#1E3A5F','#F59E0B','#1E3A5F','#EF4444','#1E3A5F','#1E3A5F','#F59E0B','#1E3A5F','#1E3A5F','#EF4444','#1E3A5F','#F59E0B','#1E3A5F','#1E3A5F','#1E3A5F'];
// Left face: dark navy + green/teal accents
const LEFT_PALETTE   = ['#1E3A5F','#10B981','#1E3A5F','#1E3A5F','#1E3A5F','#10B981','#1E3A5F','#1E3A5F','#F0A500','#1E3A5F','#10B981','#1E3A5F','#1E3A5F','#1E3A5F','#10B981','#1E3A5F'];
// Top face: lighter slate + yellow accents
const TOP_PALETTE    = ['#2D5A8E','#2D5A8E','#F59E0B','#2D5A8E','#2D5A8E','#F59E0B','#2D5A8E','#2D5A8E','#2D5A8E','#F59E0B','#2D5A8E','#2D5A8E','#F59E0B','#2D5A8E','#2D5A8E','#2D5A8E'];

function cellFill(face: number, i: number, j: number): string {
  const idx = (i * 4 + j) % 16;
  if (face === 0) return RIGHT_PALETTE[idx];
  if (face === 1) return LEFT_PALETTE[idx];
  return TOP_PALETTE[idx];
}

function IsometricCube({ dimensions, cubeName }: {
  dimensions: Array<{ name: string; type: string; count: number }>;
  cubeName?: string;
}) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // ── Geometry: cube sits in left portion, right side reserved for extra dims panel ──
  const S  = 36;    // cell size
  const CX = 220;   // origin x — shifted LEFT to leave room for right panel
  const CY = 250;   // origin y

  const proj = (x: number, y: number, z: number) => ({
    px: CX + (x - y) * S * (Math.sqrt(3) / 2),
    py: CY + (x + y) * S * 0.5 - z * S,
  });
  const pts = (c: {px:number;py:number}[]) =>
    c.map(p => `${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(' ');

  const getDim = (i: number) => ({
    name:  dimensions[i]?.name  ?? `Dimension ${i + 1}`,
    count: dimensions[i]?.count ?? 0,
    cells: Math.min(4, Math.max(2, (dimensions[i]?.count > 0) ? Math.min(4, dimensions[i].count) : 4)),
    type:  dimensions[i]?.type  ?? 'Regular',
  });

  const d0 = getDim(0); const d1 = getDim(1); const d2 = getDim(2);
  const Nx = d0.cells;  const Ny = d1.cells;  const Nz = d2.cells;

  // ── Cells ──────────────────────────────────────────────────────────────────
  const makeCells = (
    face: number, n1: number, n2: number,
    corners: (i:number,j:number) => {px:number;py:number}[],
    opacity: number,
  ) =>
    Array.from({ length: n1 }, (_, i) =>
      Array.from({ length: n2 }, (_, j) => {
        const id = `${face}-${i}-${j}`;
        const isHov = hoveredCell === id;
        return (
          <polygon key={id} points={pts(corners(i, j))}
            fill={isHov ? '#C4B5FD' : cellFill(face, i, j)}
            stroke="#0F172A" strokeWidth={0.8}
            opacity={isHov ? 1 : opacity}
            onMouseEnter={() => setHoveredCell(id)}
            onMouseLeave={() => setHoveredCell(null)}
            style={{ cursor: 'crosshair', transition: 'fill 0.15s' }} />
        );
      })
    );

  const rightCells = makeCells(0, Nx, Nz,
    (i,k) => [proj(i,0,k), proj(i+1,0,k), proj(i+1,0,k+1), proj(i,0,k+1)], 0.93);
  const leftCells  = makeCells(1, Ny, Nz,
    (j,k) => [proj(0,j,k), proj(0,j+1,k), proj(0,j+1,k+1), proj(0,j,k+1)], 0.88);
  const topCells   = makeCells(2, Nx, Ny,
    (i,j) => [proj(i,j,Nz), proj(i+1,j,Nz), proj(i+1,j+1,Nz), proj(i,j+1,Nz)], 0.9);

  // ── Key vertices ────────────────────────────────────────────────────────────
  const O   = proj(0,  0,  0);
  const Xv  = proj(Nx, 0,  0);
  const Yv  = proj(0,  Ny, 0);
  const Zv  = proj(0,  0,  Nz);

  // Unit vectors along each axis
  const uv = (a:{px:number;py:number}, b:{px:number;py:number}) => {
    const dx = b.px-a.px, dy = b.py-a.py, l = Math.sqrt(dx*dx+dy*dy);
    return { ux: dx/l, uy: dy/l };
  };
  const xU = uv(O, Xv); const yU = uv(O, Yv);
  const EXT = 48; // arrow extension beyond cube face

  // Arrow tips: start at cube corner, extend outward
  const xTip = { px: Xv.px + xU.ux*EXT, py: Xv.py + xU.uy*EXT };
  const yTip = { px: Yv.px + yU.ux*EXT, py: Yv.py + yU.uy*EXT };
  const zTip = { px: Zv.px,             py: Zv.py - EXT };

  // Hover tooltip text
  const hovInfo = hoveredCell ? (() => {
    const [face, i, j] = hoveredCell.split('-').map(Number);
    const faces = [`${d0.name} × ${d2.name}`, `${d1.name} × ${d2.name}`, `${d0.name} × ${d1.name}`];
    return `${faces[face]}  ·  row ${j+1}, col ${i+1}`;
  })() : null;

  // ── Axis label pill helper ────────────────────────────────────────────────
  const LabelPill = ({
    cx, cy, name, count, cells, color, subColor, anchor = 'start' as 'start'|'middle'|'end',
  }: {
    cx:number; cy:number; name:string; count:number; cells:number;
    color:string; subColor:string; anchor?:'start'|'middle'|'end';
  }) => {
    const W = name.length * 7.5 + 20;
    const ox = anchor === 'middle' ? -W/2 : anchor === 'end' ? -W : 0;
    return (
      <g>
        <rect x={cx + ox} y={cy - 13} width={W} height={24} rx={12} fill={color} />
        <text x={cx + ox + W/2} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={11} fontWeight="700" fill="white" fontFamily="sans-serif">
          {name}
        </text>
        <text x={cx + ox + W/2} y={cy + 19} textAnchor="middle"
          fontSize={8} fill={subColor} fontFamily="sans-serif">
          {count > 0 ? `${count.toLocaleString()} members` : `${cells} cols shown`}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Structure Diagram</p>
          {cubeName && <p className="text-sm font-bold text-gray-800 dark:text-white mt-0.5">📦 {cubeName}</p>}
        </div>
        <span className="text-xs text-gray-400 italic">Hover any cell for details</span>
      </div>

      {/* ── Main layout: SVG cube + right panel ── */}
      <div className="flex gap-0">

        {/* SVG — cube + 3 axis arrows only, no text inside cube */}
        <div className="flex-1 min-w-0">
          <svg width="100%" viewBox="0 0 430 370" style={{ maxHeight: 370 }}>
            <defs>
              {[['arr-x','#1E40AF'],['arr-y','#065F46'],['arr-z','#7C3AED']].map(([id,c]) => (
                <marker key={id} id={id} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0 L0,7 L7,3.5 z" fill={c} />
                </marker>
              ))}
            </defs>

            {/* Back dashed edges */}
            {[[proj(Nx,Ny,0), proj(Nx,Ny,Nz)],
              [proj(Nx,Ny,0), proj(Nx,0,0)],
              [proj(Nx,Ny,0), proj(0,Ny,0)]
            ].map(([a,b],i) => (
              <line key={i} x1={a.px} y1={a.py} x2={b.px} y2={b.py}
                stroke="#CBD5E1" strokeWidth={0.8} strokeDasharray="5 3" />
            ))}

            {/* Cells */}
            {rightCells}{leftCells}{topCells}

            {/* Outer edges */}
            {[
              [O,Xv],[O,Yv],[O,Zv],
              [Xv,proj(Nx,0,Nz)],[Yv,proj(0,Ny,Nz)],
              [Zv,proj(Nx,0,Nz)],[Zv,proj(0,Ny,Nz)],
              [proj(Nx,0,Nz),proj(Nx,Ny,Nz)],[proj(0,Ny,Nz),proj(Nx,Ny,Nz)],
              [Xv,proj(Nx,Ny,0)],[Yv,proj(Nx,Ny,0)],[proj(Nx,Ny,0),proj(Nx,Ny,Nz)],
            ].map(([a,b],i) => (
              <line key={i} x1={a.px} y1={a.py} x2={b.px} y2={b.py}
                stroke="#1E293B" strokeWidth={1.4} />
            ))}

            {/* ── X axis arrow → bottom-right, label at tip ── */}
            <line x1={Xv.px} y1={Xv.py} x2={xTip.px} y2={xTip.py}
              stroke="#1E40AF" strokeWidth={2} markerEnd="url(#arr-x)" />
            <LabelPill cx={xTip.px + 6} cy={xTip.py}
              name={d0.name} count={d0.count} cells={Nx}
              color="#1E40AF" subColor="#93C5FD" anchor="start" />

            {/* ── Y axis arrow → bottom-left, label at tip ── */}
            <line x1={Yv.px} y1={Yv.py} x2={yTip.px} y2={yTip.py}
              stroke="#065F46" strokeWidth={2} markerEnd="url(#arr-y)" />
            <LabelPill cx={yTip.px - 6} cy={yTip.py}
              name={d1.name} count={d1.count} cells={Ny}
              color="#065F46" subColor="#6EE7B7" anchor="end" />

            {/* ── Z axis arrow → top, label above ── */}
            <line x1={Zv.px} y1={Zv.py} x2={zTip.px} y2={zTip.py}
              stroke="#7C3AED" strokeWidth={2} markerEnd="url(#arr-z)" />
            <LabelPill cx={zTip.px} cy={zTip.py - 18}
              name={d2.name} count={d2.count} cells={Nz}
              color="#7C3AED" subColor="#C4B5FD" anchor="middle" />

            {/* Hover tooltip */}
            {hovInfo && (
              <g>
                <rect x={10} y={350} width={410} height={16} rx={4} fill="#F8FAFC" />
                <text x={14} y={361} fontSize={9} fill="#475569" fontFamily="sans-serif">{hovInfo}</text>
              </g>
            )}
          </svg>
        </div>

        {/* ── Right panel: extra dimensions (4th+) ── */}
        {dimensions.length > 3 && (
          <div className="w-44 flex-shrink-0 border-l border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 flex flex-col gap-2 justify-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
              + {dimensions.length - 3} more dimension{dimensions.length - 3 > 1 ? 's' : ''}
            </p>
            {dimensions.slice(3).map((dim, i) => {
              const cc = DIM_COLORS[(i + 3) % DIM_COLORS.length];
              return (
                <div key={i} className="rounded-lg p-2.5 border"
                  style={{ background: cc.light, borderColor: cc.face }}>
                  <p className="text-xs font-bold" style={{ color: cc.text }}>{dim.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: cc.text, opacity: 0.7 }}>
                    {dim.type}
                  </p>
                  {dim.count > 0 && (
                    <p className="text-xs font-semibold mt-0.5" style={{ color: cc.edge }}>
                      {dim.count.toLocaleString()} members
                    </p>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-gray-400 mt-1 leading-tight">
              These dimensions also slice the cube — each adds another axis of analysis.
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom: summary + colour key ── */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
          This cube has <strong>{dimensions.length}</strong> dimension{dimensions.length !== 1 ? 's' : ''}.
          The 3 main axes are shown on the cube — each coloured face represents data at the intersection of two dimensions.
        </span>
        <div className="flex items-center gap-3 ml-auto">
          {[['#1E3A5F','Base'],['#F59E0B','Mid'],['#10B981','High'],['#EF4444','Peak']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c }} />{l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── Star Topology Diagram (cube in center, dimensions radiate out) ─────────

function StarTopology({ dimensions, measures, cubeName }: {
  dimensions: Array<{ name: string; type: string; count: number }>;
  measures: string[];
  cubeName?: string;
}) {
  const [hoveredDim, setHoveredDim] = useState<number | null>(null);

  const n = Math.max(dimensions.length, 1);

  const NODE_R = n <= 4 ? 78 : n <= 6 ? 70 : n <= 8 ? 60 : 50;
  const HOVER_PAD = 6;
  const CUBE_SIZE = 200; // overall width/height footprint of the 3D cube hub

  const minRadiusForSpacing =
    (NODE_R + HOVER_PAD + 20) / Math.sin(Math.PI / n) + CUBE_SIZE * 0.75;
  const RADIUS = Math.max(210, minRadiusForSpacing);

  // Extra top margin so the cube's top face never clips
  const MARGIN = NODE_R + HOVER_PAD + 50;
  const TOP_EXTRA = 50;

  const W = (RADIUS + MARGIN) * 2;
  const H = (RADIUS + MARGIN) * 2 + TOP_EXTRA;
  const CX = W / 2, CY = H / 2 + TOP_EXTRA / 2;

  const nodePos = (i: number) => {
    const angle = (-90 + (360 / n) * i) * (Math.PI / 180);
    return {
      x: CX + RADIUS * Math.cos(angle),
      y: CY + RADIUS * Math.sin(angle),
    };
  };

  const order = dimensions.map((_, i) => i);
  if (hoveredDim !== null) {
    order.splice(order.indexOf(hoveredDim), 1);
    order.push(hoveredDim);
  }

  // ── Word-wrap helper — always wraps on word boundaries, balanced across max 2 lines ──
  // ── Word-wrap helper — always splits multi-word labels into balanced lines ──
  const wrapLabel = (text: string, maxLines: number = 2): string[] => {
    const words = text.split(' ').filter(Boolean);
    if (words.length <= 1) return [text];

    if (words.length === 2) {
      return [words[0], words[1]];
    }

    // For 3+ words, find the split point that best balances line lengths
    let bestSplit = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const line1 = words.slice(0, i).join(' ');
      const line2 = words.slice(i).join(' ');
      const diff = Math.abs(line1.length - line2.length);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSplit = i;
      }
    }

    const lines = [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];

    if (lines.length > maxLines) {
      return lines.slice(0, maxLines);
    }
    return lines;
  };

  // ── 3D cube hub geometry (simple isometric cube, drawn in screen space) ──
  const cs = CUBE_SIZE;
  const depth = cs * 0.20;

  const cubeOffsetX = depth / 2;
  const cubeOffsetY = depth / 2;

  const fx = CX - cs / 2 - cubeOffsetX;
  const fy = CY - cs / 2 + cubeOffsetY;

  const front = {
    tl: { x: fx, y: fy },
    tr: { x: fx + cs, y: fy },
    br: { x: fx + cs, y: fy + cs },
    bl: { x: fx, y: fy + cs },
  };

  const top = {
    tl: { x: front.tl.x + depth, y: front.tl.y - depth },
    tr: { x: front.tr.x + depth, y: front.tr.y - depth },
  };

  const rightFace = {
    tr: top.tr,
    br: { x: front.br.x + depth, y: front.br.y - depth },
  };

  const cubeCenterX = CX - 10;
  const cubeNameLines = wrapLabel(cubeName ?? 'Cube');

  // Vertically center the cube's name + stats block inside the front face
  const cubeNameFontSize = 24;
  const cubeNameLineHeight = cubeNameFontSize + 6;
  const statsLineHeight = 22;
  const cubeBlockHeight = cubeNameLines.length * cubeNameLineHeight + 2 * statsLineHeight;
  const cubeBlockTop = CY - cubeBlockHeight / 2 + cubeNameFontSize / 2;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Cube </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {n} dimension{n !== 1 ? 's' : ''} radiating from the cube
          </p>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 540, maxHeight: 600 }}>
          {/* Spokes */}
          {dimensions.map((dim, i) => {
            const p = nodePos(i);
            const cc = DIM_COLORS[i % DIM_COLORS.length];
            const isHov = hoveredDim === i;
            return (
              <line key={`spoke-${i}`}
                x1={CX} y1={CY} x2={p.x} y2={p.y}
                stroke={isHov ? cc.edge : '#CBD5E1'}
                strokeWidth={isHov ? 3 : 1.5}
                strokeDasharray={isHov ? undefined : '4 3'}
                style={{ transition: 'all 0.15s' }}
              />
            );
          })}

          {/* Satellite nodes — hovered one drawn last so it's on top */}
          {order.map((i) => {
            const dim = dimensions[i];
            const p = nodePos(i);
            const cc = DIM_COLORS[i % DIM_COLORS.length];
            const isHov = hoveredDim === i;
            const r = isHov ? NODE_R + HOVER_PAD : NODE_R;
            const nameLines = wrapLabel(dim.name);
            const nameFontSize = n > 6 ? 18 : 20;
            const lineHeight = nameFontSize + 4;
            const hasCount = dim.count > 0;
            const countLineHeight = 18;

            // Total vertical block (name lines + optional count line), centered on p.y
            const blockHeight = nameLines.length * lineHeight + (hasCount ? countLineHeight : 0);
            const blockTop = p.y - blockHeight / 2 + lineHeight / 2;

            return (
              <g key={`node-${i}`}
                onMouseEnter={() => setHoveredDim(i)}
                onMouseLeave={() => setHoveredDim(null)}
                style={{ cursor: 'pointer' }}>
                <circle cx={p.x} cy={p.y} r={r}
                  fill={cc.light} stroke={cc.edge} strokeWidth={isHov ? 2.5 : 1.5}
                  style={{ transition: 'r 0.15s, stroke-width 0.15s' }} />

                {/* Wrapped dimension name, vertically centered */}
                <text x={p.x} textAnchor="middle" fontWeight="700" fill={cc.text} fontFamily="sans-serif">
                  {nameLines.map((line, li) => (
                    <tspan key={li} x={p.x} y={blockTop + li * lineHeight} fontSize={nameFontSize}>
                      {line}
                    </tspan>
                  ))}
                </text>

                {hasCount && (
                  <text x={p.x} y={blockTop + nameLines.length * lineHeight} textAnchor="middle"
                    fontSize={11.5} fontWeight="600" fill={cc.edge} fontFamily="sans-serif">
                    {dim.count.toLocaleString()}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── 3D Cube hub ── */}
          {/* Right face (darkest) */}
          <polygon
            points={`${front.tr.x},${front.tr.y} ${rightFace.tr.x},${rightFace.tr.y} ${rightFace.br.x},${rightFace.br.y} ${front.br.x},${front.br.y}`}
            fill="#B8C8F5" stroke="#8DA4E8" strokeWidth={1.5} />
          {/* Top face (lighter) */}
          <polygon
            points={`${front.tl.x},${front.tl.y} ${top.tl.x},${top.tl.y} ${top.tr.x},${top.tr.y} ${front.tr.x},${front.tr.y}`}
            fill="#E6ECFF" stroke="#8DA4E8" strokeWidth={1.5} />
          {/* Front face (mid tone) */}
          <polygon
            points={`${front.tl.x},${front.tl.y} ${front.tr.x},${front.tr.y} ${front.br.x},${front.br.y} ${front.bl.x},${front.bl.y}`}
            fill="#D5E1FF" stroke="#8DA4E8" strokeWidth={1.5} />

          {/* Cube name — wraps on word boundaries, vertically centered in front face */}
          <text x={cubeCenterX} textAnchor="middle" fontWeight="800" fill="#233876" fontFamily="sans-serif">
            {cubeNameLines.map((line, li) => (
              <tspan
                key={li}
                x={cubeCenterX - 10}
                y={cubeBlockTop + li * cubeNameLineHeight}
                fontSize={cubeNameFontSize}
              >
                {line}
              </tspan>
            ))}
          </text>
          <text x={cubeCenterX} textAnchor="middle" fontSize={20} fill="#233876" fontFamily="sans-serif">
            <tspan x={cubeCenterX} y={cubeBlockTop + cubeNameLines.length * cubeNameLineHeight + statsLineHeight}>
              {n} dims
            </tspan>
            <tspan x={cubeCenterX} y={cubeBlockTop + cubeNameLines.length * cubeNameLineHeight + 2 * statsLineHeight}>
              {measures.length} measures
            </tspan>
          </text>
        </svg>
      </div>
    </div>
  );
}



// ─── Structure Tree (TM1 Architect style) ─────────────────────────────────────
function DimensionTree({ cubeDetails }: { cubeDetails: { cube_name:string; dimensions:Array<{name:string;type:string;count:number}>; measures:string[]; cell_count:number; last_update:string } }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['dims','measures']));
  const toggle = (key: string) => setExpanded(prev => { const n=new Set(prev); n.has(key)?n.delete(key):n.add(key); return n; });

  const Node = ({ id, label, icon, children, depth=0, color }: {
    id:string; label:string; icon?:React.ReactNode; children?:React.ReactNode; depth?:number; color?:string;
  }) => {
    const isOpen = expanded.has(id); const hasChildren = !!children;
    return (
      <div>
        <div className="flex items-center gap-1 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer select-none"
          style={{paddingLeft:`${depth*16+8}px`}} onClick={()=>hasChildren&&toggle(id)}>
          {hasChildren
            ? (isOpen ? <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0"/> : <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0"/>)
            : <span className="w-3 h-3 flex-shrink-0"/>}
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className={`text-sm font-medium ${color ?? 'text-gray-800 dark:text-gray-200'}`}>{label}</span>
        </div>
        {hasChildren && isOpen && <div>{children}</div>}
      </div>
    );
  };

  return (
    <div className="font-mono bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <Node id="root" label={`📦 ${cubeDetails.cube_name}`} color="text-blue-700 dark:text-blue-400">
        <Node id="dims" depth={1} label={`Dimensions (${cubeDetails.dimensions.length})`}
          icon={<span className="text-xs">📐</span>} color="text-indigo-600 dark:text-indigo-400">
          {cubeDetails.dimensions.map((dim, idx) => {
            const cc = DIM_COLORS[idx % DIM_COLORS.length];
            return (
              <Node key={idx} id={`dim-${idx}`} depth={2} label={dim.name}
                color="text-gray-700 dark:text-gray-300"
                icon={<span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{background:cc.face}} />}>
                <Node id={`dim-${idx}-type`}  depth={3} label={`Type: ${dim.type}`}  color="text-gray-500 dark:text-gray-400" />
                <Node id={`dim-${idx}-count`} depth={3} label={`Elements: ${(dim.count ?? 0).toLocaleString()}`} color="text-gray-500 dark:text-gray-400" />
              </Node>
            );
          })}
        </Node>
        <Node id="measures" depth={1} label={`Measures (${cubeDetails.measures.length})`}
          icon={<span className="text-xs">📊</span>} color="text-emerald-600 dark:text-emerald-400">
          {cubeDetails.measures.map((m,idx) => (
            <Node key={idx} id={`m-${idx}`} depth={2} label={m}
              icon={<span className="text-xs">∑</span>} color="text-gray-700 dark:text-gray-300" />
          ))}
        </Node>
        <Node id="stats" depth={1} label="Statistics"
          icon={<span className="text-xs">📈</span>} color="text-orange-600 dark:text-orange-400">
          <Node id="stat-cells"  depth={2} label={`Cell Count: ${(cubeDetails.cell_count ?? 0).toLocaleString()}`} color="text-gray-500 dark:text-gray-400" />
          {cubeDetails.last_update && (
            <Node id="stat-upd" depth={2} label={`Last Update: ${cubeDetails.last_update}`} color="text-gray-500 dark:text-gray-400" />
          )}
        </Node>
      </Node>
    </div>
  );
}

type ViewMode = 'diagram' | 'structure' ;

interface Cube {
  cube_id: string;
  cube_name: string;
  description: string;
  dimensions: string[];
  measures: string[];
  dimension_count: number;
  measure_count: number;
}

interface CubeDetails {
  cube_id: string;
  cube_name: string;
  description: string;
  dimensions: Array<{ name: string; type: string; count: number }>;
  measures: string[];
  cell_count: number;
  last_update: string;
}

export default function CubeExplorer() {
  const [cubes, setCubes] = useState<Cube[]>([]);
  const [selectedCube, setSelectedCube] = useState<string | null>(null);
  const [cubeDetails, setCubeDetails] = useState<CubeDetails | null>(null);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('diagram');

  useEffect(() => {
    loadCubes();
  }, []);

  useEffect(() => {
    if (selectedCube) {
      loadCubeDetails(selectedCube);
      loadSampleData(selectedCube);
    }
  }, [selectedCube]);

const DUMMY_CUBES: Cube[] = [
  {
    cube_id: 'demo-revenue',
    cube_name: 'Revenue Cube',
    description: 'Demo cube with 6 dimensions (no backend connected — showing sample data)',
    dimensions: ['Year', 'Customer', 'Product', 'Scenario', 'Entity', 'Version'],
    measures: ['Revenue', 'Cost', 'Margin'],
    dimension_count: 6,
    measure_count: 3,
  },
];

  const DUMMY_DETAILS: CubeDetails = {
    cube_id: 'demo-revenue',
    cube_name: 'Revenue Cube',
    description: 'Demo cube with 6 dimensions (no backend connected — showing sample data)',
    dimensions: [
      { name: 'Year',     type: 'Time',     count: 5 },
      { name: 'Customer', type: 'Regular',  count: 1240 },
      { name: 'Product',  type: 'Regular',  count: 380 },
      { name: 'Scenario', type: 'Regular',  count: 4 },
      { name: 'Entity',   type: 'Regular',  count: 22 },
      { name: 'Version',  type: 'Regular',  count: 3 },
    ],
    measures: ['Revenue', 'Cost', 'Margin'],
    cell_count: 1240 * 380 * 5,
    last_update: new Date().toISOString().split('T')[0],
  };

  const DUMMY_SAMPLE = Array.from({ length: 8 }, (_, i) => ({
    Year: 2020 + (i % 5),
    Customer: `Customer ${i + 1}`,
    Product: `Product ${(i % 4) + 1}`,
    Scenario: ['Actual', 'Budget', 'Forecast'][i % 3],
    Revenue: Math.round(50000 + Math.random() * 200000),
    Margin: `${(15 + Math.random() * 20).toFixed(1)}%`,
  }));

  const loadCubes = async () => {
    try {
      setLoading(true);
      const res = await getCubes();
      if (res.data.success && res.data.data && res.data.data.length > 0) {
        setCubes(res.data.data);
        setSelectedCube(res.data.data[0].cube_id);
      } else {
        setCubes(DUMMY_CUBES);
        setSelectedCube(DUMMY_CUBES[0].cube_id);
      }
    } catch (err: any) {
      console.error('Failed to load cubes, using dummy data:', err);
      setCubes(DUMMY_CUBES);
      setSelectedCube(DUMMY_CUBES[0].cube_id);
    } finally {
      setLoading(false);
    }
  };

  const loadCubeDetails = async (cubeId: string) => {
    if (cubeId === 'demo-revenue') {
      setCubeDetails(DUMMY_DETAILS);
      return;
    }
    try {
      const res = await getCubeDetails(cubeId);
      if (res.data.success) {
        setCubeDetails(res.data.data);
      } else {
        setCubeDetails(DUMMY_DETAILS);
      }
    } catch (err: any) {
      console.error('Failed to load cube details, using dummy data:', err);
      setCubeDetails(DUMMY_DETAILS);
    }
  };

  const loadSampleData = async (cubeId: string) => {
    if (cubeId === 'demo-revenue') {
      setSampleData(DUMMY_SAMPLE);
      return;
    }
    try {
      const res = await getCubeSampleData(cubeId, 20);
      if (res.data.success) {
        setSampleData(res.data.data.sample_data || []);
      } else {
        setSampleData(DUMMY_SAMPLE);
      }
    } catch (err: any) {
      console.error('Failed to load sample data, using dummy data:', err);
      setSampleData(DUMMY_SAMPLE);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading cubes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cube Explorer</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">✅ Explore TM1 cubes with real metadata from SQL Server</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Cube List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Available Cubes</h2>
            <div className="space-y-2">
              {cubes.map((cube) => (
                <button
                  key={cube.cube_id}
                  onClick={() => setSelectedCube(cube.cube_id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedCube === cube.cube_id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center">
                    <Database className="w-4 h-4 mr-2 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{cube.cube_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cube.dimension_count}D · {cube.measure_count} measures</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cube Details */}
        <div className="lg:col-span-3">
          {cubeDetails && (
            <div className="space-y-4">
              {/* Quick stats header */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{cubeDetails.cube_name}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{cubeDetails.description}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Dimensions', value: cubeDetails.dimensions.length, color: 'text-blue-600' },
                    { label: 'Measures',   value: cubeDetails.measures.length,   color: 'text-emerald-600' },
                    { label: 'Cell Count', value: (cubeDetails.cell_count ?? 0).toLocaleString(), color: 'text-orange-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* View mode tabs */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  {([
                    { id: 'diagram',   label: 'Cube Diagram',   icon: <Box className="w-4 h-4" /> },
                    { id: 'structure', label: 'Structure',       icon: <List className="w-4 h-4" /> },
                  ] as { id: ViewMode; label: string; icon: React.ReactNode }[]).map(tab => (
                    <button key={tab.id} onClick={() => setViewMode(tab.id)}
                      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                        viewMode === tab.id
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}>
                      {tab.icon}{tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* Cube Diagram */}
                  {viewMode === 'diagram' && (
                    <div>
                     
                      <StarTopology
                          dimensions={cubeDetails.dimensions}
                          measures={cubeDetails.measures}
                          cubeName={cubeDetails.cube_name}
                        />
                      {/* <div className="mt-4 flex flex-wrap gap-2">
                        {cubeDetails.dimensions.map((dim, idx) => {
                          const cc = DIM_COLORS[idx % DIM_COLORS.length];
                          return (
                            <div key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                              style={{background:cc.light, color:cc.text, border:`1px solid ${cc.face}`}}>
                              <span className="inline-block w-2 h-2 rounded-full" style={{background:cc.face}} />
                              {dim.name}
                              <span className="opacity-60 ml-1">({(dim.count ?? 0).toLocaleString()})</span>
                            </div>
                          );
                        })}
                      </div> */}
                      {/* <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Measures</p>
                        <div className="flex flex-wrap gap-2">
                          {cubeDetails.measures.map((m, idx) => (
                            <span key={idx} className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-medium">
                              ∑ {m}
                            </span>
                          ))}
                        </div>
                      </div> */}
                    </div>
                  )}

                  {/* Structure Tree */}
                  {viewMode === 'structure' && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        
                        Click any node to expand or collapse.
                      </p>
                      <DimensionTree cubeDetails={cubeDetails} />
                    </div>
                  )}

                  {/* Data & Metadata (original view) */}
                  {/* {viewMode === 'data' && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">Dimensions</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {cubeDetails.dimensions.map((dim, idx) => {
                            const cc = DIM_COLORS[idx % DIM_COLORS.length];
                            return (
                              <div key={idx} className="rounded-lg p-3 border"
                                style={{borderColor:cc.face, background:cc.light}}>
                                <p className="text-sm font-medium" style={{color:cc.text}}>{dim.name}</p>
                                <p className="text-xs mt-0.5" style={{color:cc.text, opacity:0.7}}>
                                  {dim.type} · {(dim.count ?? 0).toLocaleString()} elements
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">Measures</h3>
                        <div className="flex flex-wrap gap-2">
                          {cubeDetails.measures.map((measure, idx) => (
                            <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                              {measure}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )} */}
                </div>
              </div>

              {/* Sample Data — always visible below tabs */}
              {sampleData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Sample Data <span className="text-gray-400 font-normal text-sm">(first 20 rows)</span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          {Object.keys(sampleData[0]).map((key, idx) => (
                            <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sampleData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            {Object.values(row).map((value: any, vidx) => (
                              <td key={vidx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {typeof value === 'number' ? value.toLocaleString() : value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* <AnnotationPanel pageKey="cfo-cube-explorer" /> */}
    </div>
  );
}
