// 类型定义
interface ChemicalizeMarvinJsConfig {
  serviceBackendDomain: string;
  apiKey: string;
  userDomains: string[];
  serviceDomain: string;
  adminDomain: string;
}

interface MarvinJsEditor {
  sketcherInstance?: MarvinJsSketcher;
}

interface MarvinJsSketcher {
  on: (event: string, callback: (...args: any[]) => void) => void;
  exportStructure: (format: string) => Promise<string>;
  importStructure: (format: string | null, data: string) => Promise<void>;
  clear?: () => void;
}

// Import services
import { parseStructureParams, importStructureFromParams } from './paramsService';
import { SmilesCommunicator } from './smilesCommunicator';

declare global {
  interface Window {
    ChemicalizeMarvinJsConfig?: ChemicalizeMarvinJsConfig;
    ChemicalizeMarvinJs?: {
      createEditor: (containerSelector: string, options: any) => Promise<MarvinJsEditor>;
    };
  }
}

let _initPromise: Promise<MarvinJsSketcher> | null = null;
let _sketcher: MarvinJsSketcher | null = null;
let _molchangeBound = false;

// 确保 MarvinJS 初始化已开始
function _waitForInitStart(timeoutMs = 15000): Promise<void> {
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

// MarvinJS 的配置参数
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

// 动态加载 MarvinJS 脚本
function _loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
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

// 确保 MarvinJS 库已加载
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

// 通知 SMILES 改变
function _notifySmilesChange(smiles: string) {
  SmilesCommunicator.notifyChange(smiles);
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

// 从 URL 参数加载初始结构
async function _loadInitialSmilesFromUrlIfPresent() {
  if (!_sketcher || typeof _sketcher.importStructure !== 'function') {
    return;
  }

  const params = parseStructureParams();
  if (!params.smiles && !params.cas) {
    return;
  }

  try {
    const smiles = await importStructureFromParams(_sketcher, params);
    if (smiles) {
      _notifySmilesChange(smiles);
    }
  } catch (err) {
    console.error("Failed to load initial structure from URL", err);
  }
}

// 监听 SMILES 字符串的变化
export function onSmilesChange(callback: (smiles: string) => void) {
  return SmilesCommunicator.subscribe(callback);
}

// 初始化编辑器
export async function initMarvinEditor(containerSelector: string) {
  if (_initPromise) {
    return _initPromise;
  }

  _initPromise = (async () => {
    await _ensureChemicalizeMarvinJs();

    const createOptions: { 
      'data-toolbars': string;
      userDomains?: string[];
    } = {
      'data-toolbars': 'reporting' 
    };
    
    if (window.ChemicalizeMarvinJsConfig && Array.isArray(window.ChemicalizeMarvinJsConfig.userDomains)) {
      createOptions.userDomains = window.ChemicalizeMarvinJsConfig.userDomains;
    }

    if (!window.ChemicalizeMarvinJs) {
      throw new Error('ChemicalizeMarvinJs is not available');
    }
    
    const editor = await window.ChemicalizeMarvinJs.createEditor(containerSelector, createOptions);
    _sketcher = editor && editor.sketcherInstance ? editor.sketcherInstance : editor as MarvinJsSketcher;

    await _bindMolchangeIfNeeded();
    await _loadInitialSmilesFromUrlIfPresent();

    return _sketcher;
  })();

  return _initPromise;
}

// 等待编辑器初始化
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

// 将 SMILES 导入编辑器
export async function importSmiles(smiles: string) {
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

// 通过 CAS 导入结构
export async function importCas(cas: string) {
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

//  清空编辑器画布
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

// 导出 SMILES
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

// 导出 IUPACNAME
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