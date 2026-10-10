// Pembangun diagram DFA sebagai SVG.
//
// Berkas ini tidak menyentuh DOM: fungsinya mengembalikan elemen SVG, jadi
// pemanggilnya yang menentukan di mana diagram dipasang. Dipakai oleh tampilan
// aplikasi (src/app.js) dan oleh skrip pembuat gambar pratinjau
// (scripts/make-og-image.mjs), supaya geometrinya hanya ada di satu tempat.

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

// Perkiraan lebar teks monospace, dipakai untuk memberi latar pada label sisi.
const textWidth = (str, size) => String(str).length * size * 0.6;

const RADIUS_NODE = 28;

// Kerangka SVG: kotak gambar, kisi titik, dan penanda panah.
function diagramScaffold(width, height) {
  const root = svg('svg', {
    viewBox: `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`,
    width: Math.ceil(width),
    height: Math.ceil(height),
    role: 'img',
    'aria-label': 'Diagram state DFA',
  });

  const defs = svg('defs');
  // Kisi titik sebagai pattern: dilukis sekali oleh compositor, bukan latar CSS berulang.
  const grid = svg('pattern', {
    id: 'canvas-grid', width: 22, height: 22, patternUnits: 'userSpaceOnUse',
  });
  grid.appendChild(svg('circle', { cx: 1, cy: 1, r: 1, class: 'grid-dot' }));
  defs.appendChild(grid);

  // Dua marker: satu untuk sisi biasa, satu untuk sisi aktif pada jejak simulasi.
  //
  // refX 10 menaruh ujung mata panah tepat di titik akhir path (viewBox 10x10,
  // ujung runcing ada di x=10). Dengan begitu panah menyentuh tepi lingkaran
  // tanpa perlu menarik mundur ujung path, yang dulu membuat panah loop berputar
  // ke arah salah karena arah datang kurvanya hampir vertikal di ujung.
  for (const [id, cls] of [['arrow', 'arrow-head'], ['arrow-active', 'arrow-head arrow-head--active']]) {
    const marker = svg('marker', {
      id, viewBox: '0 0 10 10', refX: 10, refY: 5,
      markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse',
    });
    marker.appendChild(svg('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: cls }));
    defs.appendChild(marker);
  }
  root.appendChild(defs);

  root.appendChild(svg('rect', {
    x: 0, y: 0, width: Math.ceil(width), height: Math.ceil(height),
    fill: 'url(#canvas-grid)', 'pointer-events': 'none',
  }));
  return root;
}

// Bentuk satu sisi: busur untuk loop mandiri, kurva untuk sisi berbalasan,
// dan garis lurus untuk sisi tunggal. Mengembalikan lintasan sekaligus titik labelnya.
function edgeGeometry(from, to, nodeRadius, hasReverse) {
  if (from === to) {
    // Loop mandiri: busur setengah lingkaran yang menempel di tepi atas node.
    //
    // Kedua ujung busur duduk di tepi lingkaran pada sudut 55 derajat dari titik
    // puncak, jadi tidak ada bagian busur yang tertanam di dalam node.
    // Ujung akhir dikembalikan tepat ke tepi lingkaran: penarikan mundur tidak
    // dipakai karena arah datang kurva di sini hampir vertikal, sehingga mata
    // panah berputar ke arah yang salah. Marker-nya sendiri yang diatur supaya
    // tidak menarik panah ke belakang (lihat refX pada marker panah).
    const spread = (55 * Math.PI) / 180;
    const startX = from.x - nodeRadius * Math.sin(spread);
    const startY = from.y - nodeRadius * Math.cos(spread);
    const endX = from.x + nodeRadius * Math.sin(spread);
    const endY = startY;
    // Tinggi busur: cukup menjulang supaya terbaca sebagai loop, bukan garis datar.
    const loopHeight = nodeRadius * 1.55;
    const controlY = startY - loopHeight;
    return {
      path: `M ${startX} ${startY} C ${startX} ${controlY} ${endX} ${controlY} ${endX} ${endY}`,
      labelX: from.x,
      labelY: controlY - 9,
    };
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const startX = from.x + ux * nodeRadius;
  const startY = from.y + uy * nodeRadius;
  const endX = to.x - ux * (nodeRadius + 6);
  const endY = to.y - uy * (nodeRadius + 6);

  if (!hasReverse) {
    return {
      path: `M ${startX} ${startY} L ${endX} ${endY}`,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2,
    };
  }

  // Sisi berbalasan dibengkokkan agar tidak saling menimpa.
  const offset = 26;
  const controlX = (startX + endX) / 2 - uy * offset;
  const controlY = (startY + endY) / 2 + ux * offset;
  return {
    path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
    labelX: 0.25 * startX + 0.5 * controlX + 0.25 * endX,
    labelY: 0.25 * startY + 0.5 * controlY + 0.25 * endY,
  };
}

// Satu state: cincin sorotan, lingkaran luar, lingkaran dalam untuk state
// penerima, lalu nama state dan himpunan posisinya.
function stateNode(state, point, markerRadius, flags = {}) {
  const { isActive = false, isPositionMatch = false } = flags;
  const group = svg('g', {
    class: `state-group${state.isAccept ? ' is-accept' : ''}${isActive ? ' is-active' : ''}${isPositionMatch ? ' is-position-match' : ''}`,
  });

  if (isPositionMatch) {
    group.appendChild(svg('circle', {
      cx: point.x, cy: point.y, r: markerRadius, class: 'state-ring',
    }));
  }
  group.appendChild(svg('circle', {
    cx: point.x, cy: point.y, r: RADIUS_NODE, class: 'state-circle',
  }));
  if (state.isAccept) {
    group.appendChild(svg('circle', {
      cx: point.x, cy: point.y, r: RADIUS_NODE - 5, class: 'state-circle--accept-inner',
    }));
  }
  group.appendChild(svg('text', {
    x: point.x, y: point.y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'state-label',
  }, state.id));

  // Himpunan posisi ditaruh di bawah lingkaran: teksnya lebih lebar daripada diameternya.
  const positionsLabel = svg('text', {
    x: point.x, y: point.y + RADIUS_NODE + 13, 'text-anchor': 'middle',
    class: `state-positions${isPositionMatch ? ' state-positions--match' : ''}`,
  });
  positionsLabel.textContent = `{${state.positions.join(',')}}`;
  group.appendChild(positionsLabel);

  return group;
}

// Menghitung ukuran dan posisi seluruh state pada susunan melingkar.
export function layoutDiagram(view) {
  const count = view.states.length;
  const nodeRadius = RADIUS_NODE;
  const ringRadius = Math.max(120, count * 34);
  // State yang memuat posisi tersorot diberi cincin luar, jadi sisi diberi ruang lebih.
  const markerRadius = nodeRadius + 7;
  const width = (ringRadius + markerRadius + 74) * 2;
  const height = (ringRadius + nodeRadius * 1.6 + 44) + (ringRadius + nodeRadius + 46);
  const centerX = width / 2;
  const centerY = ringRadius + nodeRadius * 1.6 + 44;

  const pos = new Map();
  view.states.forEach((state, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / Math.max(1, count);
    pos.set(state.id, {
      x: centerX + ringRadius * Math.cos(angle),
      y: centerY + ringRadius * Math.sin(angle),
    });
  });

  return { width, height, ringRadius, nodeRadius, markerRadius, pos };
}

/**
 * Membangun elemen SVG diagram untuk satu automaton.
 *
 * @param view automaton: { states, transitions, startState, alphabet }
 * @param opsi.markState  fungsi (stateId) => boolean, untuk cincin sorotan posisi
 * @param opsi.markEdge   fungsi (transisi) => boolean, untuk sisi putus-putus
 * @param opsi.activeState id state yang sedang ditelusuri simulator
 * @param opsi.activeTransition transisi yang sedang ditelusuri simulator
 */
export function buildDiagramSvg(view, opsi = {}) {
  const {
    markState = () => false,
    markEdge = () => false,
    activeState = null,
    activeTransition = null,
  } = opsi;

  const { width, height, ringRadius, nodeRadius, markerRadius, pos } = layoutDiagram(view);

  const root = diagramScaffold(width, height);
  const edgeLayer = svg('g', { class: 'edges' });
  const nodeLayer = svg('g', { class: 'states' });
  root.append(edgeLayer, nodeLayer);

  // Panah masuk ke state awal.
  const startState = view.states.find((state) => state.isStart);
  if (startState) {
    const point = pos.get(startState.id);
    edgeLayer.appendChild(svg('line', {
      x1: point.x - ringRadius - 40, y1: point.y,
      x2: point.x - nodeRadius - 6, y2: point.y,
      class: 'start-arrow', 'marker-end': 'url(#arrow)',
    }));
  }

  const hasReverse = (a, b) => view.transitions.some((t) => t.from === b && t.to === a);

  for (const transition of view.transitions) {
    const isActive = Boolean(activeTransition)
      && activeTransition.from === transition.from
      && activeTransition.symbol === transition.symbol
      && activeTransition.to === transition.to;
    const isMarked = markEdge(transition);
    const { path, labelX, labelY } = edgeGeometry(
      pos.get(transition.from),
      pos.get(transition.to),
      nodeRadius,
      hasReverse(transition.from, transition.to),
    );

    edgeLayer.appendChild(svg('path', {
      d: path,
      class: `edge${isActive ? ' edge--active' : ''}${isMarked ? ' edge--position' : ''}`,
      'marker-end': isActive ? 'url(#arrow-active)' : 'url(#arrow)',
    }));

    const label = transition.symbol;
    const labelW = textWidth(label, 11) + 10;
    const labelH = 16;
    edgeLayer.appendChild(svg('rect', {
      x: labelX - labelW / 2, y: labelY - labelH / 2, width: labelW, height: labelH,
      rx: 3, class: `edge-label-bg${isMarked ? ' edge-label-bg--position' : ''}`,
    }));
    edgeLayer.appendChild(svg('text', {
      x: labelX, y: labelY, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      class: `edge-label${isActive ? ' edge-label--active' : ''}`,
    }, label));
  }

  for (const state of view.states) {
    nodeLayer.appendChild(stateNode(state, pos.get(state.id), markerRadius, {
      isActive: state.id === activeState,
      isPositionMatch: markState(state.id),
    }));
  }

  return root;
}
