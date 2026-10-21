/**
 * YouTube Player Controller: satu pemutar resmi (YouTube IFrame Player API) untuk seluruh aplikasi.
 * Tidak mengunduh/mengekstrak audio. Pemutar selalu terlihat saat memutar (kebijakan YouTube).
 */
const API_SRC = 'https://www.youtube.com/iframe_api';
let apiJanji = null;

function muatApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiJanji) return apiJanji;
  apiJanji = new Promise((ok, gagal) => {
    const lama = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (typeof lama === 'function') lama(); ok(window.YT); };
    const s = document.createElement('script'); s.src = API_SRC; s.async = true;
    s.onerror = () => { apiJanji = null; s.remove(); gagal(new Error('Pemutar YouTube tidak bisa dimuat (periksa internet).')); };
    document.head.appendChild(s);
    setTimeout(() => { if (!(window.YT && window.YT.Player)) { apiJanji = null; gagal(new Error('Pemutar YouTube terlalu lama dimuat.')); } }, 15000);
  });
  return apiJanji;
}

/** Kode galat YouTube → pesan & apakah video perlu dilewati. */
const GALAT = { 2: 'ID video tidak valid', 5: 'Video tidak bisa diputar di browser ini', 100: 'Video tidak tersedia / dihapus', 101: 'Pemilik video melarang pemutaran di aplikasi lain', 150: 'Pemilik video melarang pemutaran di aplikasi lain' };

export class PemutarYT {
  /** @param {HTMLElement} wadah @param {{onStatus?:Function,onGalat?:Function,onSelesai?:Function,onDiblokir?:Function}} cb */
  constructor(wadah, cb = {}) { this.wadah = wadah; this.cb = cb; this.p = null; this.siap = null; this.vol = 60; this.bisu = false; this.fadeT = null; this.cekT = null; this.id = null; }

  async pastikan() {
    if (this.siap) return this.siap;
    this.siap = muatApi().then(YT => new Promise(ok => {
      const el = document.createElement('div'); this.wadah.replaceChildren(el);
      this.p = new YT.Player(el, {
        host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%',
        playerVars: { autoplay: 0, controls: 1, rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3, origin: location.origin },
        events: {
          onReady: () => { this.p.setVolume(this.vol); if (this.bisu) this.p.mute(); ok(this.p); },
          onStateChange: e => this.ubahStatus(e.data),
          onError: e => { clearTimeout(this.cekT); const k = e.data; if (this.cb.onGalat) this.cb.onGalat({ kode: k, pesan: GALAT[k] || 'Video gagal diputar', id: this.id }); },
        },
      });
    })).catch(e => { this.siap = null; throw e; });
    return this.siap;
  }
  ubahStatus(s) {
    const YT = window.YT; if (!YT) return;
    if (s === YT.PlayerState.PLAYING) clearTimeout(this.cekT);
    if (s === YT.PlayerState.ENDED && this.cb.onSelesai) this.cb.onSelesai();
    if (this.cb.onStatus) this.cb.onStatus(this.statusTeks(s));
  }
  statusTeks(s) {
    const S = (window.YT || {}).PlayerState || {};
    return s === S.PLAYING ? 'main' : s === S.PAUSED ? 'jeda' : s === S.BUFFERING ? 'muat' : s === S.ENDED ? 'selesai' : s === S.CUED ? 'siap' : 'diam';
  }
  status() { try { return this.p && this.p.getPlayerState ? this.statusTeks(this.p.getPlayerState()) : 'diam'; } catch (e) { return 'diam'; } }
  sedangMain() { const s = this.status(); return s === 'main' || s === 'muat'; }

  /** Pelan-pelan ubah volume (transisi halus) lalu jalankan `lalu`. */
  fade(ke, ms, lalu) {
    clearInterval(this.fadeT); const p = this.p; if (!p || !p.getVolume) { if (lalu) lalu(); return; }
    const dari = p.getVolume(); const langkah = Math.max(1, Math.round(ms / 50)); let i = 0;
    if (ms <= 0 || dari === ke) { p.setVolume(ke); if (lalu) lalu(); return; }
    this.fadeT = setInterval(() => { i++; p.setVolume(Math.round(dari + (ke - dari) * (i / langkah))); if (i >= langkah) { clearInterval(this.fadeT); this.fadeT = null; if (lalu) lalu(); } }, 50);
  }

  /** Ganti lagu. Bila sedang memutar: volume turun → lagu baru → volume naik. */
  async putar(id, { halus = true } = {}) {
    await this.pastikan(); const p = this.p; const sambung = halus && this.sedangMain();
    const mulai = () => {
      this.id = id; if (!this.bisu) p.setVolume(sambung ? 0 : this.vol);
      p.loadVideoById({ videoId: id });
      if (sambung && !this.bisu) setTimeout(() => this.fade(this.vol, 1500), 600);
      // Browser bisa memblokir autoplay bersuara: bila belum main dalam 4 detik, minta pengguna menekan Play.
      clearTimeout(this.cekT);
      this.cekT = setTimeout(() => { const s = this.status(); if (s !== 'main' && s !== 'muat' && this.cb.onDiblokir) this.cb.onDiblokir(); }, 4000);
    };
    if (sambung) this.fade(0, 800, mulai); else mulai();
  }
  /** Siapkan lagu tanpa memutar (dipakai saat pengguna sedang menjeda). */
  async siapkan(id) { await this.pastikan(); clearTimeout(this.cekT); this.id = id; this.p.cueVideoById({ videoId: id }); }
  main() { if (this.p && this.p.playVideo) { this.p.playVideo(); if (!this.bisu) this.fade(this.vol, 400); } }
  jeda() { clearTimeout(this.cekT); if (this.p && this.p.pauseVideo) this.fade(0, 300, () => this.p.pauseVideo()); }
  ulang() { if (this.p && this.p.seekTo) { this.p.seekTo(0, true); this.p.playVideo(); } }
  setVolume(v) { this.vol = Math.max(0, Math.min(100, Math.round(v))); clearInterval(this.fadeT); if (this.p && this.p.setVolume && !this.bisu) this.p.setVolume(this.vol); }
  setBisu(b) { this.bisu = !!b; if (!this.p || !this.p.mute) return; if (b) this.p.mute(); else { this.p.unMute(); this.p.setVolume(this.vol); } }
  judulSaatIni() { try { const d = this.p && this.p.getVideoData && this.p.getVideoData(); return d && d.title || ''; } catch (e) { return ''; } }
  hancurkan() { clearInterval(this.fadeT); clearTimeout(this.cekT); try { if (this.p && this.p.destroy) this.p.destroy(); } catch (e) { /* abaikan */ } this.p = null; this.siap = null; this.wadah.replaceChildren(); }
}
