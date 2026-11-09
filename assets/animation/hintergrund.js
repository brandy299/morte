// Quiet moving backgrounds for explainer pieces. Own code after the idea of a collection of generative background
// patterns. Each one is a pure function of the time t (seconds): the same moment always gives the same picture,
// so a video can be cut from the page later. No random values, no clock.
// f: { accent, fills: [a, b, c], ton } from the piece's colors.
var PULT_HINTERGRUND = (function () {
  var TAU = Math.PI * 2;
  var rnd = function (i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  var ease = function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  var dot = function (c, x, y, r) { if (r <= 0.15) return; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  return {
    // Lines like ranges of hills in the lower part; the top stays free for the title.
    wellenlinien: function (c, w, h, t, f) {
      var u = w / 640;
      for (var l = 0; l < 7; l++) {
        c.strokeStyle = l % 2 ? f.ton : f.accent; c.globalAlpha = 0.14 + l * 0.035; c.lineWidth = 2 * u; c.beginPath();
        var base = h * (0.6 + l * 0.055), amp = h * 0.025 + l * 2 * u;
        for (var x = 0; x <= w; x += 4) { var y = base + Math.sin((x / w) * TAU * 1.4 + t * 0.6 + l * 0.6) * amp; if (x) c.lineTo(x, y); else c.moveTo(x, y); }
        c.stroke();
      }
    },
    // Two sets of rings like drops on water, from opposite corners.
    wellenringe: function (c, w, h, t, f) {
      var u = w / 640, max = w * 0.85, mitten = [[w * 0.14, h * 0.82, 0], [w * 0.88, h * 0.2, 0.5]];
      for (var m = 0; m < 2; m++) {
        for (var k = 0; k < 9; k++) {
          var r = (k * max / 9 + t * 22 * u + mitten[m][2] * 40 * u) % max;
          c.strokeStyle = f.ton; c.lineWidth = 1.6 * u; c.globalAlpha = Math.max(0, 0.32 - (r / (max * 1.1)) * 0.32);
          c.beginPath(); c.arc(mitten[m][0], mitten[m][1], r, 0, TAU); c.stroke();
        }
      }
    },
    // Small pills and wavy strokes drifting at the left and right edge; the middle stays free.
    formen: function (c, w, h, t, f) {
      var u = w / 640;
      for (var i = 0; i < 12; i++) {
        var side = i % 2 ? 0.04 + rnd(i) * 0.16 : 0.8 + rnd(i) * 0.16;
        var x = side * w + Math.sin(t * 0.3 + i) * 10 * u, y = (0.1 + rnd(i + 5) * 0.8) * h + Math.cos(t * 0.25 + i * 1.3) * 12 * u;
        if (i % 3) {
          c.fillStyle = f.fills[i % 3]; c.globalAlpha = 0.55; c.beginPath();
          if (c.roundRect) c.roundRect(x - 26 * u, y - 10 * u, 52 * u, 20 * u, 10 * u); else c.rect(x - 26 * u, y - 10 * u, 52 * u, 20 * u);
          c.fill();
        } else {
          c.strokeStyle = f.accent; c.globalAlpha = 0.25; c.lineWidth = 3 * u; c.lineCap = "round"; c.beginPath();
          for (var k = 0; k <= 50; k += 5) { var yy = y + Math.sin(k * 0.22 + t * 1.2) * 5 * u; if (k) c.lineTo(x - 25 * u + k * u, yy); else c.moveTo(x - 25 * u, yy); }
          c.stroke();
        }
      }
    },
    // Large soft patches of color drifting slowly, like watercolor.
    flecken: function (c, w, h, t, f) {
      for (var i = 0; i < 5; i++) {
        var x = w * 0.5 + Math.sin(t * 0.18 + i * 1.7) * w * 0.34, y = h * 0.5 + Math.cos(t * 0.15 + i * 2.1) * h * 0.36, r = w * (0.2 + i * 0.03);
        var g = c.createRadialGradient(x, y, 0, x, y, r), col = f.fills[i % 3];
        g.addColorStop(0, col + "B0"); g.addColorStop(1, col + "00");
        c.fillStyle = g; c.globalAlpha = 1; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }
    },
    // A fine grid of dots with waves coming up from below.
    punktraster: function (c, w, h, t, f) {
      var step = w / 30, cx = w / 2, cy = h * 1.15;
      c.fillStyle = f.ton;
      for (var x = step / 2; x < w; x += step) for (var y = step / 2; y < h; y += step) {
        var v = Math.max(0, Math.sin((Math.hypot(x - cx, y - cy) / w) * 10 - t * 0.9));
        c.globalAlpha = 0.12 + 0.2 * v; dot(c, x, y, v * step * 0.2);
      }
    },
    // Two bands at the very top and bottom edge that slide slowly against each other; nothing sits behind text.
    flaechen: function (c, w, h, t, f) {
      var p = ease((Math.sin(t * 0.3) + 1) / 2);
      c.globalAlpha = 0.85;
      c.fillStyle = f.fills[0]; c.fillRect(w * (-0.1 + p * 0.25), 0, w * 0.55, h * 0.035);
      c.fillStyle = f.fills[2]; c.fillRect(w * (0.55 - p * 0.25), h * 0.965, w * 0.6, h * 0.035);
      c.globalAlpha = 0.6; c.fillStyle = f.ton; c.fillRect(w * (0.08 + p * 0.1), h * 0.95, w * 0.12, h * 0.008);
    },
  };
})();
