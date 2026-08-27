// js/hbvs_worker.js - heavy "without seams" work off UI thread
// Uses underscore naming as per project convention
importScripts('hbvs_engine.js');

let WRAPPER_INDEX = null;
let isReady = false;

function buildIndex() {
  try {
    const wrappers = self.HBVS.getWrappers(); // from hbvs_engine.js
    if (!wrappers || wrappers.length === 0) return false;
    WRAPPER_INDEX = new Map();
    for (let w of wrappers) {
      let key = (w.first || w.key || "").split(' ')[0].toLowerCase();
      if (!WRAPPER_INDEX.has(key)) WRAPPER_INDEX.set(key, []);
      WRAPPER_INDEX.get(key).push(w);
    }
    console.log(`Worker: Indexed ${wrappers.length} wrappers into ${WRAPPER_INDEX.size} buckets`);
    isReady = true;
    return true;
  } catch (e) {
    console.error("Worker index build failed", e);
    return false;
  }
}

// Allow main thread to push wrapper data if worker starts empty
function initFromMain(data) {
  if (data.wrappers && self.HBVS) {
    // Re-create internal structures via load if needed
    // For now just build index from passed keys
    WRAPPER_INDEX = new Map();
    for (let w of data.wrappers) {
      let key = (w.key || w.trigger || "").split(' ')[0].toLowerCase();
      if (!WRAPPER_INDEX.has(key)) WRAPPER_INDEX.set(key, []);
      WRAPPER_INDEX.get(key).push(w);
    }
    isReady = true;
  }
}

self.onmessage = function(e) {
  const {id, TEXT, mode, type, wrappers} = e.data;

  if (type === 'init') {
    initFromMain({wrappers});
    self.postMessage({id, ready: true});
    return;
  }

  // Lazy index build on first real render
  if (!isReady) {
    buildIndex();
  }

  try {
    // Uses optimized indexed path in hbvs_engine.js
    // If index exists, engine will use it internally
    const result = self.HBVS.renderVerse({TEXT: TEXT}, mode);
    self.postMessage({id, processed: result.text, wordcount: result.wordcount});
  } catch(err) {
    self.postMessage({id, error: err.message, stack: err.stack});
  }
};