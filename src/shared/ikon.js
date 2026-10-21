/**
 * Ikon garis SVG (24×24, stroke = currentColor). Pengganti emoji supaya tampil sama di semua perangkat.
 * - ik('nama') → string <svg> untuk template.
 * - pasangIkon(root) → isi semua <i data-ikon="nama"></i> di dalam root.
 */
const G = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  pedang: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 17.5L21 6V3h-3L6.5 14.5"/><path d="M11 19l-6-6M8 16l-4 4M5 21l-2-2"/>',
  tv: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  pemain: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5a5 5 0 0 1 4.5 5"/>',
  gerigi: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  buku: '<path d="M2 5c3-1.5 6.5-1.5 10 1 3.5-2.5 7-2.5 10-1v14c-3-1.5-6.5-1.5-10 1-3.5-2.5-7-2.5-10-1z"/><path d="M12 6v14"/>',
  mahkota: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  kembali: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  maju: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  ulang: '<path d="M20 11a8 8 0 0 0-14.5-4.5L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.5 4.5L21 15"/><path d="M21 20v-5h-5"/>',
  simpan: '<path d="M5 3h11l4 4v14H4V4a1 1 0 0 1 1-1z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  naga: '<path d="M4 20c2-6 6-9 11-9l-2-4 5 2 2-4 1 7c0 6-5 9-11 9"/><path d="M9 15l-3 1"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  catatan: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v3h6V3M9 11h6M9 15h6"/>',
  layar: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8"/><path d="M10 8l4 2.5-4 2.5z"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  tirai: '<path d="M3 3l18 18"/><path d="M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3 3.6M6.6 6.6C4.2 8.2 3 12 3 12s4 6 9 6a9 9 0 0 0 4.4-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  bendera: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  gulungan: '<path d="M6 3h12v15a3 3 0 0 1-3 3H6"/><path d="M6 3a3 3 0 0 0 0 6h3M6 21a3 3 0 0 1 0-6h9"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  jam: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>',
  cuaca: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  topeng: '<path d="M4 5c5 2 11 2 16 0v6c0 5-4 9-8 9s-8-4-8-9z"/><path d="M8 10.5h2.5M13.5 10.5H16M9 15c2 1.5 4 1.5 6 0"/>',
  petir: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  hati: '<path d="M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11z"/>',
  perisai: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  dadu: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>',
  bantuan: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 4M12 17h.01"/>',
  layarPenuh: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  batal: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  tutup: '<path d="M6 6l12 12M18 6L6 18"/>',
  kompas: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  kanan: '<path d="M9 6l6 6-6 6"/>',
  bawah: '<path d="M6 9l6 6 6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  piala: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6"/>',
};

export function ik(nama, kelas = '') {
  const d = G[nama]; if (!d) return '';
  return `<svg class="ik${kelas ? ' ' + kelas : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
}
export function pasangIkon(root = document) {
  root.querySelectorAll('[data-ikon]:empty').forEach(el => { el.innerHTML = ik(el.dataset.ikon); });
}
