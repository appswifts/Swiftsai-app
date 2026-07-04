import { useState, useRef, useCallback } from 'react';

export interface EditorAnimation {
  type: 'fadeIn' | 'fadeOut' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'bounce' | 'pulse' | 'rotate';
  duration: number;
  delay: number;
  repeat: number;
}

export interface EditorObject {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'image';
  x: number; y: number;
  width: number; height: number;
  rotation: number;
  fill?: string;
  fillLinearGradientStartPoint?: { x: number; y: number };
  fillLinearGradientEndPoint?: { x: number; y: number };
  fillLinearGradientColorStops?: (number | string)[];
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  groupId?: string;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  blurRadius?: number;
  brightness?: number;
  contrast?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  letterSpacing?: number;
  lineHeight?: number;
  cornerRadius?: number;
  image?: HTMLImageElement;
  src?: string;
  animations?: EditorAnimation[];
}

export interface GuideLine {
  x: number; y: number; width: number; height: number;
  orientation: 'horizontal' | 'vertical';
}

let idCounter = 0;
export function genId() { return `el_${++idCounter}_${Date.now()}`; }
let groupIdCounter = 0;
export function genGroupId() { return `grp_${++groupIdCounter}`; }

const TOLERANCE = 5;
const STORAGE_KEY = 'swiftsai-editor-design';

export function useEditor(artboardW: number, artboardH: number) {
  const [objects, setObjects] = useState<EditorObject[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(0.65);
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [gridSize] = useState(20);
  const [canvasBg, setCanvasBg] = useState('#ffffff');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const clipboardRef = useRef<EditorObject[]>([]);
  const historyRef = useRef<EditorObject[][]>([JSON.parse(JSON.stringify(objects))]);
  const historyIdxRef = useRef(0);
  const [, forceUpdate] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((objs: EditorObject[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(objs)); } catch { } }, 3000);
  }, []);

  const pushHistory = useCallback((objs: EditorObject[]) => {
    const h = historyRef.current, idx = historyIdxRef.current;
    const next = h.slice(0, idx + 1);
    next.push(JSON.parse(JSON.stringify(objs)));
    historyRef.current = next;
    historyIdxRef.current = next.length - 1;
    scheduleSave(objs);
    forceUpdate(n => n + 1);
  }, [scheduleSave]);

  const selectOne = useCallback((id: string | null) => setSelectedIds(id ? [id] : []), []);
  const toggleSelect = useCallback((id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]), []);
  const selectAll = useCallback(() => setSelectedIds(objects.map(o => o.id)), [objects]);

  const addObject = useCallback((obj: EditorObject) => {
    setObjects(prev => { const next = [...prev, obj]; pushHistory(next); return next; });
    setSelectedIds([obj.id]);
  }, [pushHistory]);

  const updateObject = useCallback((id: string, patch: Partial<EditorObject>) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
  }, []);

  const updateSelected = useCallback((patch: Partial<EditorObject>) => {
    setObjects(prev => prev.map(o => selectedIds.includes(o.id) ? { ...o, ...patch } : o));
  }, [selectedIds]);

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return;
    setObjects(prev => { const next = prev.filter(o => !selectedIds.includes(o.id)); pushHistory(next); return next; });
    setSelectedIds([]);
  }, [selectedIds, pushHistory]);

  const duplicateSelected = useCallback(() => {
    if (!selectedIds.length) return;
    setObjects(prev => {
      const copies = prev.filter(o => selectedIds.includes(o.id)).map(o => ({ ...o, id: genId(), x: o.x + 20, y: o.y + 20 }));
      const next = [...prev, ...copies]; pushHistory(next); return next;
    });
  }, [selectedIds, pushHistory]);

  const copySelected = useCallback(() => {
    clipboardRef.current = objects.filter(o => selectedIds.includes(o.id)).map(o => ({ ...o, image: undefined }));
  }, [objects, selectedIds]);

  const pasteClipboard = useCallback(() => {
    if (!clipboardRef.current.length) return;
    setObjects(prev => { const copies = clipboardRef.current.map(o => ({ ...o, id: genId(), x: o.x + 30, y: o.y + 30 })); const next = [...prev, ...copies]; pushHistory(next); return next; });
  }, [pushHistory]);

  const groupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    const gid = genGroupId();
    setObjects(prev => { const next = prev.map(o => selectedIds.includes(o.id) ? { ...o, groupId: gid } : o); pushHistory(next); return next; });
  }, [selectedIds, pushHistory]);

  const ungroupSelected = useCallback(() => {
    const gid = objects.find(o => selectedIds.includes(o.id))?.groupId;
    if (!gid) return;
    setObjects(prev => { const next = prev.map(o => o.groupId === gid ? { ...o, groupId: undefined } : o); pushHistory(next); return next; });
  }, [objects, selectedIds, pushHistory]);

  const addAnimationToSelected = useCallback((anim: EditorAnimation) => {
    setObjects(prev => prev.map(o => selectedIds.includes(o.id) ? { ...o, animations: [...(o.animations || []), anim] } : o));
  }, [selectedIds]);

  const removeAnimation = useCallback((objId: string, idx: number) => {
    setObjects(prev => prev.map(o => o.id === objId ? { ...o, animations: (o.animations || []).filter((_, i) => i !== idx) } : o));
  }, []);

  const moveUp = useCallback(() => {
    setObjects(prev => { const idx = prev.findIndex(o => o.id === selectedIds[0]); if (idx >= prev.length - 1) return prev; const next = [...prev]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; pushHistory(next); return next; });
  }, [selectedIds, pushHistory]);

  const moveDown = useCallback(() => {
    setObjects(prev => { const idx = prev.findIndex(o => o.id === selectedIds[0]); if (idx <= 0) return prev; const next = [...prev]; [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]]; pushHistory(next); return next; });
  }, [selectedIds, pushHistory]);

  const moveToTop = useCallback(() => {
    setObjects(prev => { const obj = prev.find(o => o.id === selectedIds[0]); if (!obj) return prev; const next = prev.filter(o => o.id !== selectedIds[0]); next.push(obj); pushHistory(next); return next; });
  }, [selectedIds, pushHistory]);

  const moveToBottom = useCallback(() => {
    setObjects(prev => { const obj = prev.find(o => o.id === selectedIds[0]); if (!obj) return prev; const next = prev.filter(o => o.id !== selectedIds[0]); next.unshift(obj); pushHistory(next); return next; });
  }, [selectedIds, pushHistory]);

  const nudge = useCallback((dx: number, dy: number) => {
    setObjects(prev => { const next = prev.map(o => selectedIds.includes(o.id) ? { ...o, x: o.x + dx, y: o.y + dy } : o); pushHistory(next); return next; });
  }, [selectedIds, pushHistory]);

  const alignSelected = useCallback((align: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedIds.length < 2) return;
    setObjects(prev => { const sel = prev.filter(o => selectedIds.includes(o.id)); const ref = sel[0]; const next = prev.map(o => { if (!selectedIds.includes(o.id)) return o; switch (align) { case 'left': return { ...o, x: ref.x }; case 'center': return { ...o, x: ref.x + ref.width / 2 - o.width / 2 }; case 'right': return { ...o, x: ref.x + ref.width - o.width }; case 'top': return { ...o, y: ref.y }; case 'middle': return { ...o, y: ref.y + ref.height / 2 - o.height / 2 }; case 'bottom': return { ...o, y: ref.y + ref.height - o.height }; default: return o; } }); pushHistory(next); return next; });
  }, [selectedIds, pushHistory]);

  const commitObjects = useCallback(() => { setGuideLines([]); setObjects(prev => { pushHistory(prev); return prev; }); }, [pushHistory]);
  const loadObjects = useCallback((objs: EditorObject[]) => { setObjects(objs); setSelectedIds([]); historyRef.current = [JSON.parse(JSON.stringify(objs))]; historyIdxRef.current = 0; scheduleSave(objs); }, [scheduleSave]);
  const undo = useCallback(() => { if (historyIdxRef.current > 0) { historyIdxRef.current--; setObjects(JSON.parse(JSON.stringify(historyRef.current[historyIdxRef.current]))); setSelectedIds([]); forceUpdate(n => n + 1); } }, []);
  const redo = useCallback(() => { if (historyIdxRef.current < historyRef.current.length - 1) { historyIdxRef.current++; setObjects(JSON.parse(JSON.stringify(historyRef.current[historyIdxRef.current]))); setSelectedIds([]); forceUpdate(n => n + 1); } }, []);

  const computeGuides = useCallback((movingId: string, nx: number, ny: number) => {
    if (!showGuides) return { x: nx, y: ny, lines: [] };
    const moving = objects.find(o => o.id === movingId);
    if (!moving) return { x: nx, y: ny, lines: [] };
    const others = objects.filter(o => o.id !== movingId);
    const lines: GuideLine[] = []; let fx = nx, fy = ny;
    const mL = nx, mR = nx + moving.width, mC = nx + moving.width / 2, mT = ny, mB = ny + moving.height, mM = ny + moving.height / 2;
    for (const o of others) {
      const oL = o.x, oR = o.x + o.width, oC = o.x + o.width / 2, oT = o.y, oB = o.y + o.height, oM = o.y + o.height / 2;
      if (Math.abs(mL - oL) < TOLERANCE) { fx = oL; lines.push({ x: oL, y: 0, width: 0, height: artboardH, orientation: 'vertical' }); }
      if (Math.abs(mR - oR) < TOLERANCE) { fx = oR - moving.width; lines.push({ x: oR, y: 0, width: 0, height: artboardH, orientation: 'vertical' }); }
      if (Math.abs(mC - oC) < TOLERANCE) { fx = oC - moving.width / 2; lines.push({ x: oC, y: 0, width: 0, height: artboardH, orientation: 'vertical' }); }
      if (Math.abs(mL - oR) < TOLERANCE) { fx = oR; lines.push({ x: oR, y: 0, width: 0, height: artboardH, orientation: 'vertical' }); }
      if (Math.abs(mR - oL) < TOLERANCE) { fx = oL - moving.width; lines.push({ x: oL, y: 0, width: 0, height: artboardH, orientation: 'vertical' }); }
      if (Math.abs(mT - oT) < TOLERANCE) { fy = oT; lines.push({ x: 0, y: oT, width: artboardW, height: 0, orientation: 'horizontal' }); }
      if (Math.abs(mB - oB) < TOLERANCE) { fy = oB - moving.height; lines.push({ x: 0, y: oB, width: artboardW, height: 0, orientation: 'horizontal' }); }
      if (Math.abs(mM - oM) < TOLERANCE) { fy = oM - moving.height / 2; lines.push({ x: 0, y: oM, width: artboardW, height: 0, orientation: 'horizontal' }); }
      if (Math.abs(mT - oB) < TOLERANCE) { fy = oB; lines.push({ x: 0, y: oB, width: artboardW, height: 0, orientation: 'horizontal' }); }
      if (Math.abs(mB - oT) < TOLERANCE) { fy = oT - moving.height; lines.push({ x: 0, y: oT, width: artboardW, height: 0, orientation: 'horizontal' }); }
    }
    const cx = artboardW / 2, cy = artboardH / 2;
    if (Math.abs(mC - cx) < TOLERANCE) { fx = cx - moving.width / 2; lines.push({ x: cx, y: 0, width: 0, height: artboardH, orientation: 'vertical' }); }
    if (Math.abs(mM - cy) < TOLERANCE) { fy = cy - moving.height / 2; lines.push({ x: 0, y: cy, width: artboardW, height: 0, orientation: 'horizontal' }); }
    setGuideLines(lines); return { x: fx, y: fy, lines };
  }, [objects, showGuides, artboardW, artboardH]);

  const addText = useCallback((t: string, s: number, f: string, fs?: string) => addObject({ id: genId(), type: 'text', x: artboardW * 0.1, y: artboardH * 0.2, width: Math.min(artboardW * 0.6, t.length * s * 0.5), height: s * 1.4, rotation: 0, text: t, fontSize: s, fontFamily: f, fontStyle: fs || 'normal', fill: '#0e1318', opacity: 1, visible: true, locked: false, letterSpacing: 0, lineHeight: 1.2 }), [addObject]);
  const addRect = useCallback(() => addObject({ id: genId(), type: 'rect', x: 100, y: 100, width: 200, height: 140, rotation: 0, fill: '#00c4cc', cornerRadius: 12, opacity: 1, visible: true, locked: false }), [addObject]);
  const addCircle = useCallback(() => addObject({ id: genId(), type: 'circle', x: 200, y: 200, width: 120, height: 120, rotation: 0, fill: '#8b3dff', opacity: 1, visible: true, locked: false }), [addObject]);
  const snapToGrid = useCallback((x: number, y: number) => ({ x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize }), [gridSize]);

  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current < historyRef.current.length - 1;
  const selectedObjs = objects.filter(o => selectedIds.includes(o.id));
  const groupIds = [...new Set(objects.filter(o => o.groupId).map(o => o.groupId))];

  return {
    objects, selectedIds, setSelectedIds, selectedObjs, zoom, setZoom,
    showGrid, setShowGrid, showGuides, setShowGuides, gridSize, canvasBg, setCanvasBg,
    contextMenu, setContextMenu, guideLines, setGuideLines, groupIds, isPlaying, setIsPlaying,
    selectOne, toggleSelect, selectAll,
    addObject, updateObject, updateSelected, deleteSelected, duplicateSelected,
    copySelected, pasteClipboard, groupSelected, ungroupSelected,
    addAnimationToSelected, removeAnimation,
    moveUp, moveDown, moveToTop, moveToBottom, nudge, alignSelected,
    commitObjects, loadObjects, undo, redo,
    addText, addRect, addCircle, pushHistory, canUndo, canRedo, snapToGrid, computeGuides,
  };
}
