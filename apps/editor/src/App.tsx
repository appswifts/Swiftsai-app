import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Transformer, Image as KonvaImage, Line } from 'react-konva';
import Konva from 'konva';
import { useEditor, EditorObject, EditorAnimation } from './useEditor';

const artboardW = 1080, artboardH = 1080;
type PanelTab = 'text' | 'elements' | 'design' | 'brand' | 'uploads' | 'tools' | 'projects';

export default function App() {
  const ed = useEditor(artboardW, artboardH);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('text');
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [fonts, setFonts] = useState<string[]>([]);
  const [unsplashResults, setUnsplashResults] = useState<any[]>([]);
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState('');
  const isDragging = useRef(false);
  const dragIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const svgInputRef = useRef<HTMLInputElement>(null);
  const isInIframe = typeof window !== 'undefined' && window !== window.parent;

  // Load fonts
  useEffect(() => {
    fetch('/api/fonts').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setFonts(data.map((f: any) => f.family || f));
    }).catch(() => {});
  }, []);

  // Load templates
  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setTemplates(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    trRef.current.nodes(ed.selectedIds.map(id => stageRef.current!.findOne('#' + id)).filter(Boolean));
    trRef.current.getLayer()?.batchDraw();
  }, [ed.selectedIds]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key, ctrl = e.ctrlKey || e.metaKey;
    if (key === 'Delete' || key === 'Backspace') { ed.deleteSelected(); }
    else if (key === 'z' && ctrl) { e.preventDefault(); e.shiftKey ? ed.redo() : ed.undo(); }
    else if (key === 'a' && ctrl) { e.preventDefault(); ed.selectAll(); }
    else if (key === 'd' && ctrl) { e.preventDefault(); ed.duplicateSelected(); }
    else if (key === 'c' && ctrl) { e.preventDefault(); ed.copySelected(); }
    else if (key === 'v' && ctrl) { e.preventDefault(); ed.pasteClipboard(); }
    else if (key === 'x' && ctrl) { e.preventDefault(); ed.copySelected(); ed.deleteSelected(); }
    else if (key === 'g' && ctrl) { e.preventDefault(); ed.groupSelected(); }
    else if (key === 'g' && ctrl && e.shiftKey) { e.preventDefault(); ed.ungroupSelected(); }
    else if (key === 'Escape') { ed.setSelectedIds([]); ed.setContextMenu(null); }
    else if (key === 'ArrowUp') { e.preventDefault(); ed.nudge(0, e.shiftKey ? -10 : -1); }
    else if (key === 'ArrowDown') { e.preventDefault(); ed.nudge(0, e.shiftKey ? 10 : 1); }
    else if (key === 'ArrowLeft') { e.preventDefault(); ed.nudge(e.shiftKey ? -10 : -1, 0); }
    else if (key === 'ArrowRight') { e.preventDefault(); ed.nudge(e.shiftKey ? 10 : 1, 0); }
    else if (key === ']' && ctrl) { e.preventDefault(); ed.moveUp(); }
    else if (key === '[' && ctrl) { e.preventDefault(); ed.moveDown(); }
  }, [ed]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'EXPORT' && stageRef.current) {
        window.parent.postMessage({ type: 'EXPORT_READY', payload: { dataUrl: stageRef.current.toDataURL({ mimeType: 'image/png', pixelRatio: 2 }), format: 'png' } }, '*');
      }
    };
    window.addEventListener('message', handleMsg);
    if (isInIframe) window.parent.postMessage({ type: 'EDITOR_READY' }, '*');
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('message', handleMsg); };
  }, [handleKeyDown]);

  // ─── Animation Playback via Konva.Tween ─────────────────────────
  const tweensRef = useRef<Konva.Tween[]>([]);
  const originals = useRef<Record<string, Record<string, any>>>({});

  useEffect(() => {
    // Cleanup previous tweens
    tweensRef.current.forEach(t => { try { t.destroy(); } catch {} });
    tweensRef.current = [];

    if (!ed.isPlaying || !stageRef.current) return;

    // Save originals and run tweens for objects with animations
    const objs = ed.selectedObjs.length > 0 ? ed.selectedObjs : ed.objects;
    for (const obj of objs) {
      if (!obj.animations || obj.animations.length === 0) continue;
      const node = stageRef.current.findOne('#' + obj.id);
      if (!node) continue;

      // Save original properties for reset
      originals.current[obj.id] = {
        opacity: node.opacity(),
        x: node.x(), y: node.y(),
        scaleX: node.scaleX(), scaleY: node.scaleY(),
        rotation: node.rotation(),
      };

      for (const anim of obj.animations) {
        let tweenConfig: Record<string, any> = {
          node, duration: anim.duration || 1, easing: Konva.Easings.EaseInOut,
        };

        switch (anim.type) {
          case 'fadeIn':
            node.opacity(0);
            tweenConfig.opacity = 1;
            break;
          case 'fadeOut':
            tweenConfig.opacity = 0;
            break;
          case 'slideUp':
            node.y(node.y() + 80);
            tweenConfig.y = originals.current[obj.id].y;
            break;
          case 'slideDown':
            node.y(node.y() - 80);
            tweenConfig.y = originals.current[obj.id].y;
            break;
          case 'slideLeft':
            node.x(node.x() + 80);
            tweenConfig.x = originals.current[obj.id].x;
            break;
          case 'slideRight':
            node.x(node.x() - 80);
            tweenConfig.x = originals.current[obj.id].x;
            break;
          case 'bounce':
            tweenConfig.y = node.y() - 30;
            tweenConfig.easing = Konva.Easings.BounceEaseOut;
            break;
          case 'pulse':
            tweenConfig.scaleX = 1.15;
            tweenConfig.scaleY = 1.15;
            tweenConfig.yoyo = true;
            break;
          case 'rotate':
            tweenConfig.rotation = node.rotation() + 360;
            break;
        }

        const tween = new Konva.Tween(tweenConfig);
        tweensRef.current.push(tween);
        setTimeout(() => tween.play(), (anim.delay || 0) * 1000);
      }
    }

    return () => {
      tweensRef.current.forEach(t => { try { t.destroy(); } catch {} });
      tweensRef.current = [];
      // Restore originals
      if (stageRef.current) {
        for (const [id, orig] of Object.entries(originals.current)) {
          const node = stageRef.current.findOne('#' + id);
          if (node) {
            node.opacity(orig.opacity); node.x(orig.x); node.y(orig.y);
            node.scaleX(orig.scaleX); node.scaleY(orig.scaleY); node.rotation(orig.rotation);
          }
        }
        originals.current = {};
        stageRef.current.batchDraw();
      }
    };
  }, [ed.isPlaying]);

  const handleStageClick = (e: any) => {
    ed.setContextMenu(null);
    if (e.target === e.target.getStage()) { ed.setSelectedIds([]); return; }
    if (e.evt?.shiftKey) { ed.toggleSelect(e.target.id()); return; }
    ed.selectOne(e.target.id());
  };

  const handleContextMenu = (e: any) => { e.evt?.preventDefault(); const pos = e.target.getStage().getPointerPosition(); if (pos) ed.setContextMenu({ x: pos.x, y: pos.y }); };

  const handleMouseDown = (e: any) => {
    if (e.target !== e.target.getStage()) { dragIdRef.current = e.target.id(); return; }
    isDragging.current = true; const pos = e.target.getStage().getPointerPosition();
    if (pos) setMarquee({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
  };

  const handleMouseMove = (e: any) => {
    if (isDragging.current && marquee) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) setMarquee(p => p ? { ...p, x2: pos.x, y2: pos.y } : null);
    }
  };

  const handleMouseUp = () => {
    if (isDragging.current && marquee) {
      isDragging.current = false;
      const x1 = Math.min(marquee.x1, marquee.x2), x2 = Math.max(marquee.x1, marquee.x2);
      const y1 = Math.min(marquee.y1, marquee.y2), y2 = Math.max(marquee.y1, marquee.y2);
      ed.setSelectedIds(ed.objects.filter(o => o.x < x2 && o.x + o.width > x1 && o.y < y2 && o.y + o.height > y1).map(o => o.id));
      setMarquee(null);
    }
    dragIdRef.current = null;
  };

  const loadUnsplashImage = (url: string) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxDim = Math.min(artboardW, artboardH) * 0.6;
      let w = img.width, h = img.height;
      if (w > maxDim) { h = (h * maxDim) / w; w = maxDim; }
      if (h > maxDim) { w = (w * maxDim) / h; h = maxDim; }
      ed.addObject({ id: `img_${Date.now()}`, type: 'image', x: (artboardW - w) / 2, y: (artboardH - h) / 2, width: w, height: h, rotation: 0, image: img, opacity: 1, visible: true, locked: false });
    };
    img.src = url;
  };

  const searchUnsplash = async () => {
    if (!unsplashQuery) return;
    try {
      const res = await fetch(`/api/unsplash/search?query=${encodeURIComponent(unsplashQuery)}`);
      const data = await res.json();
      setUnsplashResults(Array.isArray(data) ? data : []);
    } catch { }
  };

  const generateAI = async () => {
    if (!aiPrompt) return;
    try {
      const res = await fetch('/api/ai/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: aiPrompt }) });
      const data = await res.json();
      setAiResult(data.description || 'Generation complete');
    } catch { setAiResult('Generation failed'); }
  };

  const saveTemplate = async () => {
    if (!templateName) return;
    try {
      const thumbnail = stageRef.current?.toDataURL({ mimeType: 'image/png', width: 200, height: 200 });
      await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: templateName, objects: ed.objects.map(({ image, ...o }) => o), thumbnail }) });
      setTemplateName('');
      const res = await fetch('/api/templates'); const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch { }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { ed.loadObjects(JSON.parse(reader.result as string)); } catch { alert('Invalid JSON'); } };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSVGImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const txt = r.result as string;
      const m = txt.match(/viewBox="([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)"/);
      const sw = m ? parseFloat(m[3]) : 800, sh = m ? parseFloat(m[4]) : 600;
      const sc = Math.min(artboardW * 0.6 / sw, artboardH * 0.6 / sh);
      const b64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(txt)));
      const img = new window.Image();
      img.onload = () => ed.addObject({ id: `svg_${Date.now()}`, type: 'image', x: (artboardW - sw * sc) / 2, y: (artboardH - sh * sc) / 2, width: sw * sc, height: sh * sc, rotation: 0, image: img, opacity: 1, visible: true, locked: false });
      img.src = b64;
    };
    r.readAsText(file);
    e.target.value = '';
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.name.endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = () => {
        const txt = reader.result as string;
        const m = txt.match(/viewBox="([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)"/);
        const sw = m ? parseFloat(m[3]) : 800, sh = m ? parseFloat(m[4]) : 600;
        const sc = Math.min(artboardW * 0.6 / sw, artboardH * 0.6 / sh);
        const b64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(txt)));
        const img = new window.Image();
        img.onload = () => ed.addObject({ id: `svg_${Date.now()}`, type: 'image', x: (artboardW - sw * sc) / 2, y: (artboardH - sh * sc) / 2, width: sw * sc, height: sh * sc, rotation: 0, image: img, opacity: 1, visible: true, locked: false });
        img.src = b64;
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const md = Math.min(artboardW, artboardH) * 0.5;
          let w = img.width, h = img.height;
          if (w > md) { h = (h * md) / w; w = md; }
          if (h > md) { w = (w * md) / h; h = md; }
          ed.addObject({ id: `img_${Date.now()}`, type: 'image', x: (artboardW - w) / 2, y: (artboardH - h) / 2, width: w, height: h, rotation: 0, image: img, opacity: 1, visible: true, locked: false });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const loadTemplate = (t: any) => {
    if (t.objects) ed.loadObjects(t.objects);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader(); reader.onload = () => {
        const img = new window.Image(); img.onload = () => {
          const maxDim = Math.min(artboardW, artboardH) * 0.5; let w = img.width, h = img.height;
          if (w > maxDim) { h = (h * maxDim) / w; w = maxDim; }
          if (h > maxDim) { w = (w * maxDim) / h; h = maxDim; }
          ed.addObject({ id: `img_${Date.now()}`, type: 'image', x: (artboardW - w) / 2, y: (artboardH - h) / 2, width: w, height: h, rotation: 0, image: img, opacity: 1, visible: true, locked: false });
        }; img.src = reader.result as string;
      }; reader.readAsDataURL(file);
    }
    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      const reader = new FileReader(); reader.onload = () => {
        const svgText = reader.result as string; const m = svgText.match(/viewBox=["']([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)["']/);
        const sw = m ? parseFloat(m[3]) : 800, sh = m ? parseFloat(m[4]) : 600;
        const sc = Math.min(artboardW * 0.6 / sw, artboardH * 0.6 / sh);
        const b64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
        const img = new window.Image(); img.onload = () => ed.addObject({ id: `svg_${Date.now()}`, type: 'image', x: (artboardW - sw * sc) / 2, y: (artboardH - sh * sc) / 2, width: sw * sc, height: sh * sc, rotation: 0, image: img, opacity: 1, visible: true, locked: false }); img.src = b64;
      }; reader.readAsText(file);
    }
  }, []);

  const renderObject = (obj: EditorObject) => {
    if (obj.visible === false) return null;
    const s = obj.shadowColor ? { shadowColor: obj.shadowColor, shadowBlur: obj.shadowBlur ?? 10, shadowOffsetX: obj.shadowOffsetX ?? 5, shadowOffsetY: obj.shadowOffsetY ?? 5, shadowOpacity: 0.3 } : {};
    const g = obj.fillLinearGradientColorStops ? { fillLinearGradientStartPoint: obj.fillLinearGradientStartPoint || { x: 0, y: 0 }, fillLinearGradientEndPoint: obj.fillLinearGradientEndPoint || { x: obj.width, y: obj.height }, fillLinearGradientColorStops: obj.fillLinearGradientColorStops } : {};
    const imgF: any[] = [];
    if (obj.blurRadius) imgF.push(Konva.Filters.Blur);
    if (obj.brightness !== undefined) imgF.push(Konva.Filters.Brighten);
    if (obj.contrast !== undefined) imgF.push(Konva.Filters.Contrast);
    const fp = obj.type === 'image' && imgF.length > 0 ? { filters: imgF, blurRadius: obj.blurRadius || 0, brightness: (obj.brightness ?? 0) / 100, contrast: (obj.contrast ?? 0) / 100 } : {};
    const base = {
      key: obj.id, id: obj.id, x: obj.x, y: obj.y, width: obj.width, height: obj.height, rotation: obj.rotation,
      draggable: !obj.locked, opacity: obj.opacity ?? 1, ...s, ...fp,
      onClick: (e: any) => { if (e.evt?.shiftKey) ed.toggleSelect(obj.id); else ed.selectOne(obj.id); },
      onTap: () => ed.selectOne(obj.id), onDragStart: () => dragIdRef.current = obj.id,
      onDragMove: (e: any) => { if (ed.showGuides) { const p = e.target.getStage()?.getPointerPosition(); if (p) ed.computeGuides(obj.id, p.x - obj.width / 2, p.y - obj.height / 2); } },
      onDragEnd: (e: any) => { ed.updateObject(obj.id, { x: e.target.x(), y: e.target.y() }); ed.commitObjects(); },
      onTransformEnd: (e: any) => { const n = e.target; ed.updateObject(obj.id, { x: n.x(), y: n.y(), rotation: n.rotation(), width: Math.max(10, n.width() * n.scaleX()), height: Math.max(10, n.height() * n.scaleY()) }); n.scaleX(1); n.scaleY(1); ed.commitObjects(); },
      onContextMenu: handleContextMenu, dragBoundFunc: (p: any) => {
        let fx = p.x, fy = p.y;
        if (ed.showGrid) { const s = ed.snapToGrid(p.x, p.y); fx = s.x; fy = s.y; }
        if (ed.showGuides && dragIdRef.current) { const g = ed.computeGuides(dragIdRef.current, fx, fy); fx = g.x; fy = g.y; }
        return { x: fx, y: fy };
      },
    };
    switch (obj.type) {
      case 'rect': return <Rect {...base} fill={obj.fill || '#00c4cc'} {...g} stroke={obj.stroke} strokeWidth={obj.strokeWidth} cornerRadius={obj.cornerRadius || 0} />;
      case 'circle': return <Circle {...base} fill={obj.fill || '#8b3dff'} {...g} stroke={obj.stroke} strokeWidth={obj.strokeWidth} />;
      case 'text': return <Text {...base} text={obj.text || 'Text'} fontSize={obj.fontSize || 20} fontFamily={obj.fontFamily || 'Inter'} fill={obj.fill || '#0e1318'} fontStyle={obj.fontStyle || 'normal'} letterSpacing={obj.letterSpacing || 0} lineHeight={obj.lineHeight || 1.2} />;
      case 'image': return obj.image ? <KonvaImage {...base} image={obj.image} /> : null;
      default: return null;
    }
  };

  const renderAllObjects = () => ed.objects.map(renderObject).filter(Boolean);
  const firstSel = ed.selectedObjs[0];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      <input ref={fileInputRef} type="file" accept="image/*,.svg" className="hidden" onChange={e => handleFileInput(e)} />
      <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
      <input ref={svgInputRef} type="file" accept=".svg" className="hidden" onChange={handleSVGImport} />

      <header className="h-14 bg-[#00c4cc] flex items-center justify-between px-4 text-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">SwiftsAI Editor</span>
          <div className="flex items-center gap-0.5 ml-4">
            <button onClick={ed.undo} disabled={!ed.canUndo} className="material-symbols-outlined p-1.5 hover:bg-white/20 rounded disabled:opacity-30 text-xl">undo</button>
            <button onClick={ed.redo} disabled={!ed.canRedo} className="material-symbols-outlined p-1.5 hover:bg-white/20 rounded disabled:opacity-30 text-xl">redo</button>
          </div>
          <div className="h-5 w-px bg-white/20 mx-1" />
          <div className="flex items-center gap-1 text-sm">
            <button onClick={() => ed.alignSelected('left')} disabled={ed.selectedIds.length < 2} className="material-symbols-outlined p-1 hover:bg-white/20 rounded disabled:opacity-30 text-lg">align_horizontal_left</button>
            <button onClick={() => ed.alignSelected('center')} disabled={ed.selectedIds.length < 2} className="material-symbols-outlined p-1 hover:bg-white/20 rounded disabled:opacity-30 text-lg">align_horizontal_center</button>
            <button onClick={() => ed.alignSelected('right')} disabled={ed.selectedIds.length < 2} className="material-symbols-outlined p-1 hover:bg-white/20 rounded disabled:opacity-30 text-lg">align_horizontal_right</button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button onClick={ed.groupSelected} disabled={ed.selectedIds.length < 2} className="px-2 py-1 text-xs hover:bg-white/20 rounded disabled:opacity-30">Group</button>
            <button onClick={ed.ungroupSelected} disabled={!ed.selectedObjs.find(o => o.groupId)} className="px-2 py-1 text-xs hover:bg-white/20 rounded disabled:opacity-30">Ungroup</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { const json = JSON.stringify(ed.objects.map(({ image, ...o }) => o), null, 2); const link = document.createElement('a'); link.download = 'design.json'; link.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(json); link.click(); }} className="px-3 h-9 bg-white/15 rounded-lg text-xs font-medium hover:bg-white/25">JSON</button>
          <button onClick={() => importInputRef.current?.click()} className="px-3 h-9 bg-white/15 rounded-lg text-xs font-medium hover:bg-white/25">Import</button>
          <button onClick={() => { if (!stageRef.current) return; const uri = stageRef.current.toDataURL({ mimeType: 'image/png', pixelRatio: 2 }); const link = document.createElement('a'); link.download = 'design.png'; link.href = uri; link.click(); }} className="px-5 h-9 bg-white text-[#0e1318] rounded-lg text-sm font-medium hover:bg-opacity-90">Export</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
        <aside className="w-[72px] bg-[#0e1318] flex flex-col items-center py-3 gap-1 shrink-0">
          {(['text', 'elements', 'design', 'uploads', 'tools', 'brand', 'projects'] as PanelTab[]).map(tab => (
            <button key={tab} onClick={() => setPanelTab(tab)} className={`flex flex-col items-center w-full py-3 transition-colors ${panelTab === tab ? 'text-white bg-white/10' : 'text-white/50 hover:text-white'}`}>
              <span className="material-symbols-outlined text-[22px]">{tab === 'text' ? 'title' : tab === 'elements' ? 'category' : tab === 'design' ? 'photo_library' : tab === 'uploads' ? 'upload' : tab === 'tools' ? 'auto_awesome' : tab === 'brand' ? 'verified' : 'folder'}</span>
              <span className="text-[9px] mt-0.5">{tab === 'brand' ? 'Brand' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            </button>
          ))}
        </aside>

        <div className="w-[300px] bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto p-4">
            {/* Text Panel */}
            {panelTab === 'text' && (
              <div>
                <h3 className="text-sm font-bold mb-3">Add Text</h3>
                {[{ l: 'Heading', t: 'Heading', s: 48, f: 'Plus Jakarta Sans', fs: 'bold' }, { l: 'Subtitle', t: 'Subtitle', s: 32, f: 'Inter', fs: '600' }, { l: 'Body', t: 'Body text', s: 20, f: 'Inter' }, { l: 'Caption', t: 'Caption', s: 14, f: 'Inter' }].map(p => (
                  <button key={p.l} onClick={() => ed.addText(p.t, p.s, p.f, p.fs)} className="w-full p-3 bg-gray-50 rounded-lg border hover:border-[#00c4cc] transition-all text-left mb-2">
                    <p style={{ fontSize: p.s * 0.4, fontWeight: p.fs === 'bold' ? 700 : 400 }}>{p.l}</p>
                    <p className="text-xs text-gray-400">{p.s}px</p>
                  </button>
                ))}
                <h3 className="text-sm font-bold mt-6 mb-3">Google Fonts ({fonts.length})</h3>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {fonts.map(f => (
                    <button key={f} onClick={() => ed.addText(f, 24, f)} className="w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 transition-all truncate" style={{ fontFamily: f }}>{f}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Elements Panel */}
            {panelTab === 'elements' && (
              <div>
                <h3 className="text-sm font-bold mb-3">Shapes</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button onClick={ed.addRect} className="p-6 bg-gray-50 rounded-lg border hover:border-[#00c4cc] flex flex-col items-center gap-2"><span className="material-symbols-outlined text-3xl text-[#00c4cc]">check_box_outline_blank</span><span className="text-xs font-medium">Rectangle</span></button>
                  <button onClick={ed.addCircle} className="p-6 bg-gray-50 rounded-lg border hover:border-[#00c4cc] flex flex-col items-center gap-2"><span className="material-symbols-outlined text-3xl text-[#8b3dff]">circle</span><span className="text-xs font-medium">Circle</span></button>
                </div>
                <h3 className="text-sm font-bold mb-3">Upload Images</h3>
                <div onClick={() => fileInputRef.current?.click()} className="p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-center cursor-pointer hover:border-[#00c4cc] transition-colors mb-4">
                  <span className="material-symbols-outlined text-3xl text-gray-300">cloud_upload</span>
                  <p className="text-xs text-gray-400 mt-1">Click or drag (JPG, PNG, SVG)</p>
                </div>
                <h3 className="text-sm font-bold mb-3">Import SVG</h3>
                <button onClick={() => svgInputRef.current?.click()} className="w-full p-3 bg-gray-50 rounded-lg border hover:border-[#00c4cc] transition-all flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-[#f59e0b]">extension</span>
                  <div className="text-left"><p className="text-sm font-medium">Import SVG File</p><p className="text-xs text-gray-400">Renders as image</p></div>
                </button>
              </div>
            )}

            {/* Design Panel (Unsplash + Templates) */}
            {panelTab === 'design' && (
              <div>
                <h3 className="text-sm font-bold mb-3">Stock Photos</h3>
                <div className="flex gap-2 mb-3">
                  <input value={unsplashQuery} onChange={e => setUnsplashQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchUnsplash()} placeholder="Search photos..." className="flex-1 h-9 px-3 bg-gray-50 rounded border-0 text-sm" />
                  <button onClick={searchUnsplash} className="px-4 h-9 bg-[#00c4cc] text-white rounded text-xs font-medium">Search</button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-4">
                  {unsplashResults.map((photo: any) => (
                    <div key={photo.id} onClick={() => loadUnsplashImage(photo.urls?.regular || photo.urls?.small)} className="aspect-square rounded-lg overflow-hidden cursor-pointer border hover:border-[#00c4cc] transition-all">
                      <img src={photo.urls?.small || photo.urls?.regular} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                    </div>
                  ))}
                  {unsplashResults.length === 0 && <p className="col-span-2 text-xs text-gray-400 text-center py-4">Search for stock photos</p>}
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold mb-3">Templates</h3>
                  <div className="flex gap-2 mb-3">
                    <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name..." className="flex-1 h-9 px-3 bg-gray-50 rounded border-0 text-sm" />
                    <button onClick={saveTemplate} className="px-4 h-9 bg-[#00c4cc] text-white rounded text-xs font-medium">Save</button>
                  </div>
                  <div className="space-y-2">
                    {templates.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No saved templates</p>}
                    {templates.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-all" onClick={() => loadTemplate(t)}>
                        <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                          {t.thumbnail && <img src={t.thumbnail} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <span className="text-xs font-medium flex-1 truncate">{t.name}</span>
                        <button onClick={async (e) => { e.stopPropagation(); await fetch(`/api/templates/${t.id}`, { method: 'DELETE' }); setTemplates(templates.filter((x: any) => x.id !== t.id)); }} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Uploads Panel */}
            {panelTab === 'uploads' && (
              <div className="text-center py-8">
                <div onClick={() => fileInputRef.current?.click()} className="p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-center cursor-pointer hover:border-[#00c4cc] transition-colors">
                  <span className="material-symbols-outlined text-5xl text-gray-300">cloud_upload</span>
                  <p className="text-sm text-gray-400 mt-2">Upload Images</p>
                  <p className="text-xs text-gray-400 mt-1">Drag & drop or click (JPG, PNG, SVG)</p>
                </div>
              </div>
            )}

            {/* Tools Panel (AI + Animations) */}
            {panelTab === 'tools' && (
              <div>
                <h3 className="text-sm font-bold mb-3">AI Design Assistant</h3>
                <div className="flex gap-2 mb-4">
                  <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateAI()} placeholder="Describe a design..." className="flex-1 h-9 px-3 bg-gray-50 rounded border-0 text-sm" />
                  <button onClick={generateAI} className="px-4 h-9 bg-[#8b3dff] text-white rounded text-xs font-medium">Generate</button>
                </div>
                {aiResult && <div className="p-3 bg-purple-50 rounded-lg text-xs mb-4">{aiResult}</div>}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold mb-3">Animations</h3>
                  {firstSel ? (
                    <div className="space-y-1.5">
                      {[{ type: 'fadeIn' as const, label: 'Fade In' }, { type: 'fadeOut' as const, label: 'Fade Out' }, { type: 'slideUp' as const, label: 'Slide Up' }, { type: 'slideDown' as const, label: 'Slide Down' }, { type: 'bounce' as const, label: 'Bounce' }, { type: 'pulse' as const, label: 'Pulse' }, { type: 'rotate' as const, label: 'Rotate' }].map(a => (
                        <button key={a.type} onClick={() => ed.addAnimationToSelected({ type: a.type, duration: 1, delay: 0, repeat: 0 })} className="w-full p-2 bg-gray-50 rounded-lg border hover:border-[#00c4cc] transition-all flex items-center gap-2 text-xs"><span className="material-symbols-outlined text-base text-[#00c4cc]">{a.type === 'fadeIn' || a.type === 'fadeOut' ? 'blur_on' : a.type === 'slideUp' || a.type === 'slideDown' ? 'arrow_upward' : a.type === 'bounce' ? 'sports_kabaddi' : a.type === 'pulse' ? 'pulse' : 'rotate_right'}</span>{a.label}</button>
                      ))}
                      {firstSel.animations && firstSel.animations.length > 0 && <div className="mt-2 pt-2 border-t"><p className="text-xs font-bold text-gray-500 mb-1">Applied ({firstSel.animations.length})</p>{firstSel.animations.map((a, i) => <div key={i} className="flex items-center gap-2 text-xs py-1"><span className="flex-1">{a.type}</span><button onClick={() => ed.removeAnimation(firstSel.id, i)} className="text-red-400 text-xs">✕</button></div>)}</div>}
                      <button onClick={() => ed.setIsPlaying(!ed.isPlaying)} className={`w-full h-8 rounded text-xs font-medium mt-2 ${ed.isPlaying ? 'bg-red-500 text-white' : 'bg-[#00c4cc] text-white'}`}><span className="material-symbols-outlined text-[16px] align-text-bottom">{ed.isPlaying ? 'stop' : 'play_arrow'}</span> {ed.isPlaying ? 'Stop' : 'Play'}</button>
                    </div>
                  ) : <p className="text-xs text-gray-400 text-center py-4">Select an object to animate</p>}
                </div>
              </div>
            )}

            {/* Brand Panel */}
            {panelTab === 'brand' && (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-5xl text-gray-300">verified</span>
                <p className="text-sm text-gray-400 mt-2">Brand Kit</p>
                <p className="text-xs text-gray-400 mt-1">Upload logos and set brand colors</p>
              </div>
            )}

            {/* Projects Panel */}
            {panelTab === 'projects' && (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-5xl text-gray-300">folder_open</span>
                <p className="text-sm text-gray-400 mt-2">My Projects</p>
                <p className="text-xs text-gray-400 mt-1">Saved designs will appear here</p>
                <div className="mt-4 space-y-2">
                  <button onClick={() => fileInputRef.current?.click()} className="w-full p-3 bg-gray-50 rounded-lg border hover:border-[#00c4cc] transition-all flex items-center gap-3 text-xs">
                    <span className="material-symbols-outlined text-lg">upload_file</span> Import a design
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Properties Panel */}
          {firstSel && (
            <div className="p-4 border-t border-gray-200 bg-white shrink-0 max-h-[360px] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase">{firstSel.groupId ? 'Group Object' : 'Properties'}</h4>
                <div className="flex gap-1">
                  <button onClick={ed.moveUp} className="material-symbols-outlined text-lg text-gray-400 hover:text-gray-700">expand_less</button>
                  <button onClick={ed.moveDown} className="material-symbols-outlined text-lg text-gray-400 hover:text-gray-700">expand_more</button>
                  <button onClick={ed.moveToTop} className="material-symbols-outlined text-lg text-gray-400 hover:text-gray-700">keyboard_double_arrow_up</button>
                  <button onClick={ed.moveToBottom} className="material-symbols-outlined text-lg text-gray-400 hover:text-gray-700">keyboard_double_arrow_down</button>
                </div>
              </div>
              {!firstSel.groupId && (
                <>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[['X', 'x'], ['Y', 'y'], ['W', 'width'], ['H', 'height'], ['Rot', 'rotation']].map(([label, key]) => (
                      <div key={key}><label className="text-[10px] text-gray-400">{label}</label><input type="number" value={Math.round((firstSel as any)[key] || 0)} onChange={e => ed.updateSelected({ [key]: parseInt(e.target.value) || 0 })} className="w-full h-7 px-1 bg-gray-50 rounded border text-xs" /></div>
                    ))}
                    <div className="col-span-2"><label className="text-[10px] text-gray-400">Opacity</label><input type="range" min={0} max={100} value={Math.round((firstSel.opacity ?? 1) * 100)} onChange={e => ed.updateSelected({ opacity: parseInt(e.target.value) / 100 })} className="w-full accent-[#00c4cc]" /></div>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <label className="text-[10px] text-gray-400">Fill</label>
                    <input type="color" value={firstSel.fill || '#00c4cc'} onChange={e => ed.updateSelected({ fill: e.target.value, fillLinearGradientColorStops: undefined })} className="w-7 h-7 cursor-pointer border-0 p-0" />
                    <button onClick={() => ed.updateSelected(firstSel.fillLinearGradientColorStops ? { fillLinearGradientColorStops: undefined } : { fillLinearGradientColorStops: [0, (firstSel.fill || '#00c4cc'), 1, '#8b3dff'] })} className={`text-[10px] px-1.5 h-7 rounded border ${firstSel.fillLinearGradientColorStops ? 'bg-[#00c4cc] text-white' : 'bg-gray-50 text-gray-500'}`}>Grad</button>
                    <label className="text-[10px] text-gray-400 ml-1">Str</label>
                    <input type="color" value={firstSel.stroke || '#000'} onChange={e => ed.updateSelected({ stroke: e.target.value })} className="w-7 h-7 cursor-pointer border-0 p-0" />
                    <input type="number" value={firstSel.strokeWidth || 0} onChange={e => ed.updateSelected({ strokeWidth: parseInt(e.target.value) || 0 })} className="w-10 h-7 px-1 bg-gray-50 rounded border text-xs" />
                    <label className="text-[10px] text-gray-400 ml-1">Shd</label>
                    <input type="color" value={firstSel.shadowColor || '#000'} onChange={e => ed.updateSelected({ shadowColor: e.target.value, shadowBlur: firstSel.shadowBlur ?? 10, shadowOffsetX: firstSel.shadowOffsetX ?? 5, shadowOffsetY: firstSel.shadowOffsetY ?? 5 })} className="w-7 h-7 cursor-pointer border-0 p-0" />
                    {firstSel.shadowColor && <button onClick={() => ed.updateSelected({ shadowColor: undefined, shadowBlur: undefined, shadowOffsetX: undefined, shadowOffsetY: undefined })} className="text-[10px] text-red-400 hover:text-red-600">✕</button>}
                    <button onClick={() => ed.updateSelected({ locked: !firstSel.locked })} className={`material-symbols-outlined text-lg ${firstSel.locked ? 'text-red-500' : 'text-gray-400 hover:text-gray-700'}`}>{firstSel.locked ? 'lock' : 'lock_open'}</button>
                    <button onClick={() => ed.updateSelected({ visible: firstSel.visible === false ? true : false })} className={`material-symbols-outlined text-lg ${firstSel.visible === false ? 'text-gray-300' : 'text-gray-400 hover:text-gray-700'}`}>visibility</button>
                  </div>
                  {/* Gradient start/end color pickers */}
                  {firstSel.fillLinearGradientColorStops && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-[10px] text-gray-400">Grad Start</label>
                      <input type="color" value={String(firstSel.fillLinearGradientColorStops[1] || '#00c4cc')} onChange={e => { const s = [...(firstSel.fillLinearGradientColorStops || [])]; s[1] = e.target.value; ed.updateSelected({ fillLinearGradientColorStops: s }); }} className="w-7 h-7 cursor-pointer border-0 p-0" />
                      <label className="text-[10px] text-gray-400 ml-1">End</label>
                      <input type="color" value={String(firstSel.fillLinearGradientColorStops[3] || '#8b3dff')} onChange={e => { const s = [...(firstSel.fillLinearGradientColorStops || [])]; s[3] = e.target.value; ed.updateSelected({ fillLinearGradientColorStops: s }); }} className="w-7 h-7 cursor-pointer border-0 p-0" />
                    </div>
                  )}
                  {/* Shadow detail controls */}
                  {firstSel.shadowColor && (
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-[10px] text-gray-400">Blur</label>
                      <input type="range" min={0} max={50} value={firstSel.shadowBlur ?? 10} onChange={e => ed.updateSelected({ shadowBlur: parseInt(e.target.value) })} className="w-14 accent-[#00c4cc]" />
                      <label className="text-[10px] text-gray-400">OffX</label>
                      <input type="number" value={firstSel.shadowOffsetX ?? 5} onChange={e => ed.updateSelected({ shadowOffsetX: parseInt(e.target.value) || 0 })} className="w-10 h-7 px-1 bg-gray-50 rounded border text-xs" />
                      <label className="text-[10px] text-gray-400">OffY</label>
                      <input type="number" value={firstSel.shadowOffsetY ?? 5} onChange={e => ed.updateSelected({ shadowOffsetY: parseInt(e.target.value) || 0 })} className="w-10 h-7 px-1 bg-gray-50 rounded border text-xs" />
                    </div>
                  )}
                  {/* Corner radius for rects */}
                  {firstSel.type === 'rect' && (
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-[10px] text-gray-400">Radius</label>
                      <input type="range" min={0} max={Math.min(firstSel.width, firstSel.height) / 2} value={firstSel.cornerRadius || 0} onChange={e => ed.updateSelected({ cornerRadius: parseInt(e.target.value) })} className="w-20 accent-[#00c4cc]" />
                      <span className="text-[10px] text-gray-400 w-6">{firstSel.cornerRadius || 0}</span>
                    </div>
                  )}
                  {firstSel.type === 'image' && (
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-[10px] text-gray-400">Blur</label>
                      <input type="range" min={0} max={20} value={firstSel.blurRadius || 0} onChange={e => ed.updateSelected({ blurRadius: parseInt(e.target.value) })} className="w-16 accent-[#00c4cc]" />
                      <label className="text-[10px] text-gray-400 ml-1">Bright</label>
                      <input type="range" min={-100} max={100} value={firstSel.brightness ?? 0} onChange={e => ed.updateSelected({ brightness: parseInt(e.target.value) })} className="w-16 accent-[#00c4cc]" />
                      <label className="text-[10px] text-gray-400 ml-1">Cont</label>
                      <input type="range" min={-100} max={100} value={firstSel.contrast ?? 0} onChange={e => ed.updateSelected({ contrast: parseInt(e.target.value) })} className="w-16 accent-[#00c4cc]" />
                    </div>
                  )}
                  {firstSel.type === 'text' && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <select value={firstSel.fontFamily || 'Inter'} onChange={e => ed.updateSelected({ fontFamily: e.target.value })} className="flex-1 h-7 px-1 bg-gray-50 rounded border text-xs">
                          {fonts.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                        </select>
                        <input type="number" value={firstSel.fontSize || 20} onChange={e => ed.updateSelected({ fontSize: parseInt(e.target.value) || 10 })} className="w-14 h-7 px-1 bg-gray-50 rounded border text-xs" />
                        <button onClick={() => ed.updateSelected({ fontStyle: firstSel.fontStyle === 'bold' ? 'normal' : 'bold' })} className={`w-7 h-7 rounded text-xs font-bold border ${firstSel.fontStyle === 'bold' ? 'bg-[#00c4cc] text-white' : 'bg-gray-50'}`}>B</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-400">LS</label>
                        <input type="number" value={firstSel.letterSpacing || 0} onChange={e => ed.updateSelected({ letterSpacing: parseInt(e.target.value) || 0 })} className="w-14 h-7 px-1 bg-gray-50 rounded border text-xs" />
                        <label className="text-[10px] text-gray-400">LH</label>
                        <input type="number" value={firstSel.lineHeight || 1.2} onChange={e => ed.updateSelected({ lineHeight: parseFloat(e.target.value) || 1 })} className="w-14 h-7 px-1 bg-gray-50 rounded border text-xs" step={0.1} />
                      </div>
                      <textarea value={firstSel.text || ''} onChange={e => ed.updateSelected({ text: e.target.value })} className="w-full h-12 px-2 py-1 bg-gray-50 rounded border text-xs resize-none" />
                    </div>
                  )}
                </>
              )}
              {firstSel.groupId && <div className="text-center py-4"><p className="text-xs text-gray-500">Grouped object. Ungroup to edit individually.</p></div>}
            </div>
          )}
        </div>

        {/* Canvas */}
        <main className="flex-1 bg-[#ebedf0] relative overflow-hidden">
          <div className="absolute inset-0 overflow-auto flex items-center justify-center p-8">
            <div style={{ width: artboardW * ed.zoom, height: artboardH * ed.zoom, boxShadow: '0 2px 20px rgba(0,0,0,0.12)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
              <Stage ref={stageRef} width={artboardW} height={artboardH} scaleX={ed.zoom} scaleY={ed.zoom}
                onClick={handleStageClick} onTap={handleStageClick} onContextMenu={handleContextMenu}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
                <Layer>
                  <Rect x={0} y={0} width={artboardW} height={artboardH} fill={ed.canvasBg} />
                  {ed.showGrid && <>
                    {Array.from({ length: Math.ceil(artboardW / ed.gridSize) }).map((_, i) => (<Line key={`v${i}`} x={i * ed.gridSize} y={0} points={[0, 0, 0, artboardH]} stroke="#e5e7eb" strokeWidth={0.5} />))}
                    {Array.from({ length: Math.ceil(artboardH / ed.gridSize) }).map((_, i) => (<Line key={`h${i}`} x={0} y={i * ed.gridSize} points={[0, 0, artboardW, 0]} stroke="#e5e7eb" strokeWidth={0.5} />))}
                  </>}
                  {renderAllObjects()}
                  {ed.guideLines.map((g, i) => (<Line key={`g${i}`} x={g.x} y={g.y} points={g.orientation === 'vertical' ? [0, 0, 0, artboardH] : [0, 0, artboardW, 0]} stroke="#00c4cc" strokeWidth={1 / ed.zoom} dash={[3 / ed.zoom, 3 / ed.zoom]} />))}
                  {marquee && <Rect x={Math.min(marquee.x1, marquee.x2)} y={Math.min(marquee.y1, marquee.y2)} width={Math.abs(marquee.x2 - marquee.x1)} height={Math.abs(marquee.y2 - marquee.y1)} fill="rgba(0,196,204,0.1)" stroke="#00c4cc" strokeWidth={1 / ed.zoom} dash={[4 / ed.zoom, 4 / ed.zoom]} />}
                  <Transformer ref={trRef} rotateEnabled={true} enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
                    borderStroke="#00c4cc" borderStrokeWidth={2} anchorFill="#fff" anchorStroke="#00c4cc" anchorSize={8}
                    boundBoxFunc={(o, n) => (n.width < 10 || n.height < 10) ? o : n} />
                </Layer>
              </Stage>
            </div>
          </div>

          {ed.contextMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => ed.setContextMenu(null)} />
              <div className="absolute z-30 bg-white rounded-lg shadow-xl border py-1 min-w-[160px]" style={{ left: ed.contextMenu.x * ed.zoom + 16, top: ed.contextMenu.y * ed.zoom + 80 }}>
                <button onClick={() => { ed.copySelected(); ed.setContextMenu(null); }} disabled={!ed.selectedIds.length} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 disabled:text-gray-300"><span className="material-symbols-outlined text-[16px]">content_copy</span>Copy</button>
                <button onClick={() => { ed.pasteClipboard(); ed.setContextMenu(null); }} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">content_paste</span>Paste</button>
                <button onClick={() => { ed.duplicateSelected(); ed.setContextMenu(null); }} disabled={!ed.selectedIds.length} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 disabled:text-gray-300"><span className="material-symbols-outlined text-[16px]">file_copy</span>Duplicate</button>
                <div className="h-px bg-gray-100 my-1" />
                <button onClick={() => { ed.groupSelected(); ed.setContextMenu(null); }} disabled={ed.selectedIds.length < 2} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">group</span>Group</button>
                <button onClick={() => { ed.ungroupSelected(); ed.setContextMenu(null); }} disabled={!ed.selectedObjs.find(o => o.groupId)} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">ungroup</span>Ungroup</button>
                <div className="h-px bg-gray-100 my-1" />
                <button onClick={() => { ed.moveToTop(); ed.setContextMenu(null); }} disabled={!ed.selectedIds.length} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 disabled:text-gray-300"><span className="material-symbols-outlined text-[16px]">vertical_align_top</span>Bring to Front</button>
                <button onClick={() => { ed.moveToBottom(); ed.setContextMenu(null); }} disabled={!ed.selectedIds.length} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 disabled:text-gray-300"><span className="material-symbols-outlined text-[16px]">vertical_align_bottom</span>Send to Back</button>
                <div className="h-px bg-gray-100 my-1" />
                <button onClick={() => { ed.deleteSelected(); ed.setContextMenu(null); }} disabled={!ed.selectedIds.length} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 text-red-500 disabled:text-gray-300"><span className="material-symbols-outlined text-[16px]">delete</span>Delete</button>
              </div>
            </>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            <button onClick={() => ed.addText('Heading', 48, 'Plus Jakarta Sans', 'bold')} className="bg-white px-4 py-2.5 rounded-lg shadow-md border hover:shadow-lg hover:border-[#00c4cc] transition-all flex items-center gap-2 text-sm font-medium">
              <span className="material-symbols-outlined text-lg">title</span> Text
            </button>
            <button onClick={ed.addRect} className="bg-white px-4 py-2.5 rounded-lg shadow-md border hover:shadow-lg hover:border-[#00c4cc] transition-all flex items-center gap-2 text-sm font-medium">
              <span className="material-symbols-outlined text-lg">check_box_outline_blank</span> Shape
            </button>
            <button onClick={ed.addCircle} className="bg-white px-4 py-2.5 rounded-lg shadow-md border hover:shadow-lg hover:border-[#00c4cc] transition-all flex items-center gap-2 text-sm font-medium">
              <span className="material-symbols-outlined text-lg">circle</span> Circle
            </button>
          </div>
        </main>
      </div>

      <footer className="h-10 bg-white border-t border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => ed.setZoom(Math.max(0.1, ed.zoom - 0.1))} className="text-xs font-bold text-gray-400 hover:text-gray-700 px-1">−</button>
            <input type="range" min={10} max={200} value={Math.round(ed.zoom * 100)} onChange={e => ed.setZoom(parseInt(e.target.value) / 100)} className="w-24 h-1 accent-[#00c4cc] cursor-pointer" />
            <button onClick={() => ed.setZoom(Math.min(3, ed.zoom + 0.1))} className="text-xs font-bold text-gray-400 hover:text-gray-700 px-1">+</button>
            <span className="text-xs text-gray-500 w-10">{Math.round(ed.zoom * 100)}%</span>
            <button onClick={() => ed.setZoom(1)} className="text-xs text-gray-400 hover:text-gray-700 px-1">100%</button>
            <button onClick={() => { const w = window.innerWidth - 420; const h = window.innerHeight - 160; ed.setZoom(Math.min(w / artboardW, h / artboardH) * 0.9); }} className="text-xs text-gray-400 hover:text-gray-700 px-1">Fit</button>
          </div>
          <span className="text-xs text-gray-300">|</span>
          <button onClick={() => ed.setShowGrid(!ed.showGrid)} className={`text-xs font-medium px-2 py-0.5 rounded ${ed.showGrid ? 'bg-[#00c4cc] text-white' : 'text-gray-400 hover:text-gray-700'}`}><span className="material-symbols-outlined text-[14px] align-text-bottom">grid_on</span> Grid</button>
          <button onClick={() => ed.setShowGuides(!ed.showGuides)} className={`text-xs font-medium px-2 py-0.5 rounded ${ed.showGuides ? 'bg-[#00c4cc] text-white' : 'text-gray-400 hover:text-gray-700'}`}><span className="material-symbols-outlined text-[14px] align-text-bottom">straighten</span> Guides</button>
          <span className="text-xs text-gray-300">|</span>
          <input type="color" value={ed.canvasBg} onChange={e => ed.setCanvasBg(e.target.value)} className="w-5 h-5 cursor-pointer border-0 p-0" title="Canvas background" />
          <span className="text-xs text-gray-400">{ed.objects.length} objects</span>
          {ed.selectedIds.length > 0 && <span className="text-xs text-[#00c4cc] font-medium">{ed.selectedIds.length} selected</span>}
        </div>
        <div className="flex items-center gap-3">
          {ed.selectedIds.length > 0 && <button onClick={ed.duplicateSelected} className="text-xs text-gray-500 hover:text-gray-700">Duplicate</button>}
          <button onClick={ed.deleteSelected} disabled={!ed.selectedIds.length} className="px-3 h-7 rounded text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 disabled:bg-transparent disabled:text-gray-300 transition-colors">Delete</button>
        </div>
      </footer>
    </div>
  );
}
