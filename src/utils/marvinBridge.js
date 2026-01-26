let _initPromise = null;
let _sketcher = null;
let _molchangeBound = false;
const _smilesChangeListeners = new Set();

function _waitForInitStart(timeoutMs = 15000) {
  if (_initPromise) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (_initPromise) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error('Marvin editor initialization did not start in time.'));
      }
    }, 50);
  });
}

function _ensureConfig() {
  if (window.ChemicalizeMarvinJsConfig) {
    if (
      Array.isArray(window.ChemicalizeMarvinJsConfig.userDomains) &&
      !window.ChemicalizeMarvinJsConfig.userDomains.includes(window.location.origin)
    ) {
      window.ChemicalizeMarvinJsConfig.userDomains.push(window.location.origin);
    }
    return;
  }

  const config = {
    serviceBackendDomain: 'https://marvinjs.chemicalize.com',
    apiKey: '0bb3e0bda52f49189c286e052b0d1665',
    userDomains: [window.location.origin],
    serviceDomain: 'https://marvinjs.chemicalize.com',
    adminDomain: 'https://pro.chemicalize.com',
  };

  window.ChemicalizeMarvinJsConfig = config;
}

function _loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    });
    script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)));
    document.head.appendChild(script);
  });
}

async function _ensureChemicalizeMarvinJs() {
  _ensureConfig();

  if (window.ChemicalizeMarvinJs && typeof window.ChemicalizeMarvinJs.createEditor === 'function') {
    return;
  }

  await _loadScriptOnce('https://marvinjs.chemicalize.com/v1/client.js');

  if (!window.ChemicalizeMarvinJs || typeof window.ChemicalizeMarvinJs.createEditor !== 'function') {
    throw new Error('ChemicalizeMarvinJs is not available after script load.');
  }
}

function _notifySmilesChange(smiles) {
  _smilesChangeListeners.forEach((cb) => {
    try {
      cb(smiles);
    } catch (_) {}
  });
}

async function _bindMolchangeIfNeeded() {
  if (!_sketcher || typeof _sketcher.on !== 'function') {
    return;
  }
  if (_molchangeBound) {
    return;
  }
  _molchangeBound = true;

  _sketcher.on('molchange', function () {
    if (!_sketcher || typeof _sketcher.exportStructure !== 'function') {
      return;
    }
    _sketcher
      .exportStructure('smiles')
      .then(function (smiles) {
        _notifySmilesChange(smiles);
      })
      .catch(function () {});
  });
}

async function _loadInitialSmilesFromUrlIfPresent() {
  if (!_sketcher || typeof _sketcher.importStructure !== 'function') {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const smiles = urlParams.get('smiles');
  const cas = urlParams.get('cas');

  try {
    if (cas) {
      await _sketcher.importStructure(null, cas.trim());
      const currentSmiles = await _sketcher.exportStructure('smiles');
      _notifySmilesChange(currentSmiles);
    } else if (smiles) {
      await _sketcher.importStructure('smiles', smiles.trim());
      _notifySmilesChange(smiles);
    }
  } catch (err) {
    console.error("Failed to load initial structure from URL", err);
  }
}

export function onSmilesChange(callback) {
  if (typeof callback !== 'function') {
    return function () {};
  }
  _smilesChangeListeners.add(callback);
  return function () {
    _smilesChangeListeners.delete(callback);
  };
}

export async function initMarvinEditor(containerSelector) {
  if (_initPromise) {
    return _initPromise;
  }

  _initPromise = (async () => {
    await _ensureChemicalizeMarvinJs();

    const createOptions = {};
    if (window.ChemicalizeMarvinJsConfig && Array.isArray(window.ChemicalizeMarvinJsConfig.userDomains)) {
      createOptions.userDomains = window.ChemicalizeMarvinJsConfig.userDomains;
    }

    const editor = await window.ChemicalizeMarvinJs.createEditor(containerSelector, createOptions);
    _sketcher = editor && editor.sketcherInstance ? editor.sketcherInstance : editor;

    await _bindMolchangeIfNeeded();
    await _loadInitialSmilesFromUrlIfPresent();

    return _sketcher;
  })();

  return _initPromise;
}

export async function whenReady() {
  if (_sketcher) {
    return _sketcher;
  }
  if (_initPromise) {
    return _initPromise;
  }

  await _waitForInitStart();
  return _initPromise;
}

export async function importSmiles(smiles) {
  let sketcher;
  try {
    sketcher = await whenReady();
  } catch (_) {
    return;
  }
  if (!sketcher) {
    return;
  }

  const value = (smiles || '').trim();
  if (!value) {
    if (typeof sketcher.clear === 'function') {
      sketcher.clear();
      _notifySmilesChange('');
    }
    return;
  }

  if (typeof sketcher.importStructure !== 'function') {
    return;
  }

  try {
    await sketcher.importStructure('smiles', value);
    _notifySmilesChange(value);
  } catch (_) {}
}

export async function importCas(cas) {
  let sketcher;
  try {
    sketcher = await whenReady();
  } catch (_) {
    return;
  }
  if (!sketcher || !cas) return;

  try {
    await sketcher.importStructure(null, cas.trim());
    const currentSmiles = await sketcher.exportStructure('smiles');
    _notifySmilesChange(currentSmiles);
  } catch (_) {}
}

export async function clearSketch() {
  let sketcher;
  try {
    sketcher = await whenReady();
  } catch (_) {
    return;
  }
  if (sketcher && typeof sketcher.clear === 'function') {
    sketcher.clear();
    _notifySmilesChange('');
  }
}

export async function exportSmiles() {
  let sketcher;
  try {
    sketcher = await whenReady();
  } catch (_) {
    return null;
  }
  if (!sketcher || typeof sketcher.exportStructure !== 'function') {
    return null;
  }
  try {
    return await sketcher.exportStructure('smiles');
  } catch (_) {
    return null;
  }
}

export async function exportIupacName() {
  let sketcher;
  try {
    sketcher = await whenReady();
  } catch (_) {
    return null;
  }
  if (!sketcher || typeof sketcher.exportStructure !== 'function') {
    return null;
  }
  try {
    return await sketcher.exportStructure('name');
  } catch (_) {
    return null;
  }
}
