<template>
  <div class="control-panel">
    <div v-if="loading" class="loading-overlay">
      <div>Loading...</div>
    </div>
    <div class="control-group">
      <div class="input-stars-row">
        <input 
          type="text" 
          id="smilesInput"
          v-model="smilesValue" 
          placeholder="SMILES" 
          @input="handleInput"
          class="smiles-input"
        />
        <a
          href="https://github.com/biantailab/StructuredSearch"
          target="_blank"
          class="github-stars-link"
        >
          <img
            src="https://img.shields.io/github/stars/biantailab/StructuredSearch.svg?style=social"
            alt="GitHub stars"
            class="github-stars-img"
          />
        </a>
      </div>
      <div class="button-group">
        <select @change="loadExample" class="example-select">
          <option value="">Example:</option>
          <option value="C(C1=CC=CC=C1)[Ti](CC1=CC=CC=C1)(CC1=CC=CC=C1)CC1=CC=CC=C1">Benzyl titanium</option>
          <option value="COC1C=CC2C(=C([C@@H](O)[C@H]3N4C[C@H](C=C)C(CC4)C3)C=CN=2)C=1">Quinine</option>
          <option value="CCN1C=C(C(=O)C2=CC(=C(C=C21)N3CCNCC3)F)C(=O)O">Norfloxacin</option>
        </select>
        <button @click="handleImageUpload" title="Upload structure image">
          <input 
            type="file" 
            ref="fileInput" 
            accept="image/*" 
            @change="handleFileSelect" 
            style="display: none"
          >
          <span>Image</span>
        </button>
        <button @click="handleClear" :disabled="!smilesValue">Clear</button>
        <button @click="handleCopy" :disabled="!smilesValue">Copy</button>
        <select @change="handleGetSelect" class="get-select" :disabled="!smilesValue">
          <option value="">Get:</option>
          <option value="cas">CAS</option>
          <option value="iupac" title="IUPACName">Name</option>
          <option value="formula" title="Molecular Formula">Formula</option>
          <option value="link" title="Compound Link">Link</option>
        </select>
        <button @click="handle3DView" :disabled="!smilesValue">3D</button>
        <button @click="handleHNMR" :disabled="!smilesValue">HNMR</button>
        <button @click="handlePubChem" :disabled="!smilesValue">PubChem</button>
        <button @click="handleGetWikipedia" :disabled="!smilesValue">Wikipedia</button>
        <select @change="handleDrugBankSelect" class="drugbank-select" :disabled="!smilesValue">
          <option value="">DrugBank:</option>
          <option value="exact">exact</option>
          <option value="fuzzy">fuzzy</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script>
import {
  getMolecularFormulaByCID,
  getPubChemCID,
  getCASByCID,
  getIUPACNameByCID,
  getPubChemCompoundUrlByCID,
} from '@/utils/pubchem';
import { getWikipediaUrlByCID } from '@/utils/wikipedia';
import { 
  getDrugBankInfoBySmiles,
  getDrugBankFuzzySearchUrl,
  getDrugBankUrlByCAS 
} from '@/utils/drugbank';
import { generateSmilesLink } from '@/utils/link';
import { imageToSmiles } from '../utils/ocrService';

export default {
  name: 'ControlPanel',
  data() {
    return {
      smilesValue: '',
      iframeOrigin: null,
      loading: false,
      drugBankMode: 'exact',
      fileInput: null,
      messages: {
        compoundNotFound: '未找到对应的化合物',
        copySuccess: (label, value) => `${label}: ${value}\n已复制到剪贴板`,
        copyFail: (label, value) => `${label}: ${value}\n复制失败，请手动复制`,
        pubchemFail: '获取 PubChem CID 失败，请检查网络连接',
        casNotFound: '未找到 CAS 号',
        iupacNotFound: '未找到 IUPACName',
        formulaNotFound: '未找到分子式',
        fetchFail: '获取信息失败，请检查网络连接',
        drugbankNotFound: '未找到 DrugBank ID 或 CAS 号',
        drugbankFail: '获取 DrugBank 信息失败',
        wikipediaNotFound: '未找到 Wikipedia 链接',
        wikipediaFail: '获取 Wikipedia 链接失败',
        CAS: 'CAS',
        IUPACName: 'IUPACName',
        MolecularFormula: 'Molecular Formula',
      },

      currentCid: null,
      lastCidSmiles: ''
    }
  },
  mounted() {
    this.setupMessageListener();
  },
  methods: {
    notifyUser(message, type = 'info') {
      alert(message);
    },

    async copyTextToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(textarea);
          return ok;
        } catch (_) {
          return false;
        }
      }
    },

    async copyWithFeedback(label, value) {
      const ok = await this.copyTextToClipboard(value);
      if (ok) {
        this.notifyUser(this.messages.copySuccess(label, value), 'success');
      } else {
        this.notifyUser(this.messages.copyFail(label, value), 'error');
      }
    },

    handleInput(event) {
      const value = event.target.value;
      this.smilesValue = value;
      this.currentCid = null;
      this.lastCidSmiles = '';
      this.sendSmilesToMarvin(value);
    },

    setupMessageListener() {
      window.addEventListener('message', (event) => {
        const marvinIframe = document.getElementById('marvinFrame');
        if (!marvinIframe || event.source !== marvinIframe.contentWindow) {
          return;
        }

        // 处理来自 Marvin 编辑器的消息
        if (event.data?.type === 'smilesChangedInSketcher') {
          this.smilesValue = event.data.value;
        } else if (event.data?.type === 'smilesImported') {
          if (event.data.status === 'error') {
            console.error('SMILES 导入失败:', event.data.error);
          }
        } else if (event.data?.type === 'iupacNameResult') {
          if (this._iupacNameResolver) {
            if (event.data.status === 'success') {
              this._iupacNameResolver.resolve(event.data.value || null);
            } else {
              this._iupacNameResolver.resolve(null);
            }
            this._iupacNameResolver = null;
          }
        } else if (event.data?.type === 'sketchCleared') {
          if (event.data.status === 'success') {
            this.smilesValue = '';
          }
        }
      });
    },

    sendSmilesToMarvin(value) {
      const marvinIframe = document.getElementById('marvinFrame');
      if (marvinIframe?.contentWindow) {
        marvinIframe.contentWindow.postMessage(
          { type: 'smilesUpdate', value: value },
          '*'
        );
      }
    },

    requestIUPACNameFromMarvin() {
      return new Promise((resolve) => {
        const marvinIframe = document.getElementById('marvinFrame');
        if (!marvinIframe?.contentWindow) {
          resolve(null);
          return;
        }
        this._iupacNameResolver = { resolve };
        marvinIframe.contentWindow.postMessage({ type: 'getIUPACName' }, '*');
        setTimeout(() => {
          if (this._iupacNameResolver) {
            this._iupacNameResolver = null;
            resolve(null);
          }
        }, 6000);
      });
    },

    handleClear() {
      const marvinIframe = document.getElementById('marvinFrame');
      if (marvinIframe?.contentWindow) {
        marvinIframe.contentWindow.postMessage(
          { type: 'clearSketch' },
          '*'
        );
      }
      const select = document.querySelector('.example-select');
      if (select) {
        select.value = '';
      }
      this.smilesValue = '';
    },

    showNotification(message, type = 'info') {
      alert(message);
    },

    async handleCopy(type = 'smiles') {
      if (!this.smilesValue) return;

      const shouldShowLoading = type === 'link';
      if (shouldShowLoading) {
        this.loading = true;
      }
  
      let textToCopy = this.smilesValue;
      let label = 'SMILES';
      let displayText = this.smilesValue; 
      
      try {
        if (type === 'link') {
          textToCopy = await generateSmilesLink(this.smilesValue);
          
          if (textToCopy.includes('/s/')) {
            label = '短链接';
            displayText = textToCopy;
          } else {
            label = '原链接';
            displayText = '完整长链接'; 
          }
        }

        if (label === 'SMILES') {
          await this.copyTextToClipboard(textToCopy);
        } else {
          await this.copyWithFeedback(label, displayText);
          
          await this.copyTextToClipboard(textToCopy);
        }
      } catch (_) {
        if (label !== 'SMILES') {
          this.notifyUser(this.messages.copyFail(label, displayText), 'error');
        }
      } finally {
        if (shouldShowLoading) {
          this.loading = false;
        }
      }
    },
    
    handleCopyClick(event) {
      event.stopPropagation();
    },

    async ensureCID() {
      const smiles = (this.smilesValue || '').trim();
      if (!smiles) return null;
      if (this.currentCid && this.lastCidSmiles === smiles) {
        return this.currentCid;
      }
      const cid = await getPubChemCID(smiles);
      if (cid) {
        this.currentCid = cid;
        this.lastCidSmiles = smiles;
      }
      return cid || null;
    },

    async handlePubChem() {
      if (!this.smilesValue) return;
      this.loading = true;
      try {
        const cid = await this.ensureCID();
        if (!cid) {
          this.notifyUser(this.messages.compoundNotFound, 'warning');
          return;
        }
        const url = getPubChemCompoundUrlByCID(cid);
        window.open(url, '_blank');
      } catch (e) {
        this.notifyUser(this.messages.pubchemFail, 'error');
      } finally {
        this.loading = false;
      }
    },

    handleHNMR() {
      if (this.smilesValue) {
        const searchUrl = `https://www.nmrdb.org/new_predictor/index.shtml?v=latest&smiles=${encodeURIComponent(this.smilesValue)}`;
        window.open(searchUrl, '_blank');
      }
    },

    loadExample(event) {
      const value = event.target.value;
      if (value) {
        this.smilesValue = value;
        this.sendSmilesToMarvin(value);
      }
    },

    async handleGet(type) {
      if (!this.smilesValue) return;
      this.loading = true;
      try {
        const cid = await this.ensureCID();
        if (!cid && type !== 'iupac') {
          this.notifyUser(this.messages.compoundNotFound, 'warning');
          return;
        }
        if (type === 'cas') {
          const cas = cid ? await getCASByCID(cid) : null;
          if (cas) {
            await this.copyWithFeedback(this.messages.CAS, cas);
          } else {
            this.notifyUser(this.messages.casNotFound, 'warning');
          }
        } else if (type === 'iupac') {
          let iupacName = null;
          if (cid) {
            try {
              iupacName = await getIUPACNameByCID(cid);
            } catch (_) {}
          }
          if (!iupacName) {
            iupacName = await this.requestIUPACNameFromMarvin();
          }
          if (iupacName) {
            await this.copyWithFeedback(this.messages.IUPACName, iupacName);
          } else {
            this.notifyUser(this.messages.iupacNotFound, 'warning');
          }
        } else if (type === 'formula') {
          const formula = cid ? await getMolecularFormulaByCID(cid) : null;
          if (formula) {
            await this.copyWithFeedback(this.messages.MolecularFormula, formula);
          } else {
            this.notifyUser(this.messages.formulaNotFound, 'warning');
          }
        }
      } catch (error) {
        this.notifyUser(this.messages.fetchFail, 'error');
      } finally {
        this.loading = false;
      }
    },

    handle3DView() {
      if (!this.smilesValue) {
        return;
      }
      this.$emit('show-3d', this.smilesValue);
    },

    async handleGetDrugBank() {
      if (!this.smilesValue) return;
      this.loading = true;
      try {
        const { cid, drugBankUrl, cas } = await getDrugBankInfoBySmiles(this.smilesValue);
        if (!cid) {
          this.notifyUser(this.messages.compoundNotFound, 'warning');
          return;
        }
        if (drugBankUrl) {
          window.open(drugBankUrl, '_blank');
        } else if (cas) {
          const url = getDrugBankUrlByCAS(cas);
          window.open(url, '_blank');
        } else {
          this.notifyUser(this.messages.drugbankNotFound, 'warning');
        }
      } catch (e) {
        this.notifyUser(this.messages.drugbankFail, 'error');
      } finally {
        this.loading = false;
      }
    },

    async handleGetIUPACName() {
      return this.handleGet('iupac');
    },

    async handleGetWikipedia() {
      if (!this.smilesValue) return;
      this.loading = true;
      try {
        const cid = await this.ensureCID();
        if (!cid) {
          this.notifyUser(this.messages.compoundNotFound, 'warning');
          return;
        }
        const { wikipediaUrl } = await getWikipediaUrlByCID(cid);
        if (wikipediaUrl) {
          window.open(wikipediaUrl, '_blank');
        } else {
          this.notifyUser(this.messages.wikipediaNotFound, 'warning');
        }
      } catch (e) {
        this.notifyUser(this.messages.wikipediaFail, 'error');
      } finally {
        this.loading = false;
      }
    },

    handleDrugBankSelect(event) {
      const value = event.target.value;
      if (!this.smilesValue || !value) return;
      if (value === 'exact') {
        this.handleGetDrugBank();
      } else if (value === 'fuzzy') {
        this.handleDrugBankFuzzy();
      }
      event.target.value = '';
    },

    handleDrugBankFuzzy() {
      if (!this.smilesValue) return;
      const url = getDrugBankFuzzySearchUrl(this.smilesValue);
      window.open(url, '_blank');
    },

    async handleGetFormula() {
      return this.handleGet('formula');
    },

    handleGetSelect(event) {
      const value = event.target.value;
      if (!this.smilesValue || !value) return;
      
      if (value === 'link') {
        this.handleCopy('link');
      } else if (value === 'cas' || value === 'iupac' || value === 'formula') {
        this.handleGet(value);
      }
      event.target.value = '';
    },
    
    handleImageUpload() {
      this.$refs.fileInput.click();
    },
    
    async handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.loading = true;
      
      try {
        console.log('Processing file:', file.name);
        const smiles = await imageToSmiles(file);
        console.log('Received SMILES:', smiles);
        
        if (!smiles) {
          throw new Error('无法识别该图片结构');
        }

        this.smilesValue = smiles;
        this.sendSmilesToMarvin(smiles);
      } catch (error) {
        console.error('图片处理错误:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = this.messages.fetchFail;
        } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
          errorMessage = this.messages.fetchFail;
        } else if (!error.message.startsWith('处理图片失败:')) {
          errorMessage = `处理图片失败: ${error.message || '未知错误'}`;
        }
        
        this.showNotification(errorMessage, 'error');
      } finally {
        this.loading = false;
        event.target.value = '';
      }
    },
  }
}
</script>

<style scoped>
.control-panel {
  margin-bottom: 4px;
  padding: 4px;
  border: 1px solid #e0e0e0;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.control-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 4px;
}

.input-stars-row {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 734px;
  gap: 4px;
}

.smiles-input {
  flex: 1;
  max-width: 100%;
  box-sizing: border-box;
}

.github-stars-link {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.github-stars-img {
  height: 22px;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
  width: 100%;
  max-width: 734px;
}

/* Button and select styles */
.button-group button,
.button-group select {
  --uno: "border-0 border-b-2 border-transparent rounded-none px-2 py-1 border-solid";
  --uno: "bg-transparent transition-all outline-none";
}

/* Hover effects */
.button-group button:not(:disabled):hover,
.button-group select:not(:disabled):hover {
  --uno: "hover:bg-ma-bg";
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255,255,255,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

@media screen and (max-width: 743px) {
  .button-group {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .button-group button {
    flex: 1;
    min-width: 100px;
  }
}
</style>