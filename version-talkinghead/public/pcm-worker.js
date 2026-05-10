/* global self */
/**
 * Float32 samples (mono, target rate) -> PCM16 Int16Array; posts transferable ArrayBuffer back.
 */
self.onmessage = function (e) {
  var ab = e.data;
  if (!(ab instanceof ArrayBuffer)) {
    self.postMessage(null);
    return;
  }
  var input = new Float32Array(ab);
  var n = input.length;
  var out = new Int16Array(n);
  for (var i = 0; i < n; i++) {
    var v = Math.round(input[i] * 32767);
    if (v > 32767) v = 32767;
    if (v < -32768) v = -32768;
    out[i] = v;
  }
  self.postMessage(out.buffer, [out.buffer]);
};
