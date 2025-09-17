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
            src="https://img.shields.io/github/stars/biantailab/StructuredSearch?style=social"
            alt="GitHub stars"
            class="github-stars-img"
          />
        </a>
      </div>
      <div class="button-group">
        <select @change="loadExample" class="example-select">
          <option value="">Example:</option>
          <option value="C(C1=CC=CC=C1)[Ti](CC1=CC=CC=C1)(CC1=CC=CC=C1)CC1=CC=CC=C1">Benzyl titanium</option>
          <option value="O=C(O)C[C@H](CC(C)C)CN">Pregabalin</option>
          <option value="CNCCC(C1=CC=CC=C1)OC2=CC=C(C=C2)C(F)(F)F">Fluoxetine</option>
        </select>
        <button @click="handleClear">Clear</button>
        <button @click="handleCopy">Copy</button>
        <select @change="handleGetSelect" class="get-select">
          <option value="">Get:</option>
          <option value="cas">CAS</option>
          <option value="iupac" title="IUPACName">Name</option>
          <option value="formula" title="Molecular Formula">Formula</option>
        </select>
        <button @click="handle3DView">3D</button>
        <button @click="handleHNMR">HNMR</button>
        <button @click="handlePubChem">PubChem</button>
        <button @click="handleGetWikipedia">Wikipedia</button>
        <select @change="handleDrugBankSelect" class="drugbank-select">
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
  getWikipediaUrlBySmiles,
  getMolecularFormulaByCID,
  getPubChemCID,
  getCASByCID,
  getIUPACNameByCID,
  getPubChemCompoundUrlBySmiles,
} from '@/utils/pubchem';
import { 
  getDrugBankInfoBySmiles,
  getDrugBankFuzzySearchUrl,
   getDrugBankUrlByCAS 
} from '@/utils/drugbank';

export default {
  name: 'ControlPanel',
  data() {
    return {
      smilesValue: '',
      iframeOrigin: null,
      loading: false,
      drugBankMode: 'exact'
    }
  },
  mounted() {
    this.setupMessageListener();
  },
  methods: {
    notifyCompoundNotFound() {
      alert('未找到对应的化合物');
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
        alert(`${label}: ${value}\n已复制到剪贴板`);
      } else {
        alert(`${label}: ${value}\n复制失败，请手动复制`);
      }
    },

    handleInput(event) {
      const value = event.target.value;
      this.smilesValue = value;
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

    handleCopy() {
      if (this.smilesValue) {
        navigator.clipboard.writeText(this.smilesValue);
      }
    },

    async handlePubChem() {
      if (!this.smilesValue) return;
      this.loading = true;
      try {
        const url = await getPubChemCompoundUrlBySmiles(this.smilesValue);
        if (!url) {
          this.notifyCompoundNotFound();
          return;
        }
        window.open(url, '_blank');
      } catch (e) {
        alert('获取 PubChem CID 失败，请检查网络连接');
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
        const cid = await getPubChemCID(this.smilesValue);
        if (!cid && type !== 'iupac') {
          this.notifyCompoundNotFound();
          return;
        }
        if (type === 'cas') {
          const cas = cid ? await getCASByCID(cid) : null;
          if (cas) {
            await this.copyWithFeedback('CAS', cas);
          } else {
            alert('未找到 CAS 号');
          }
        } else if (type === 'iupac') {
          let iupacName = null;
          if (cid) {
            try {
              iupacName = await getIUPACNameByCID(cid);
            } catch (_) {
              // ignore and try marvin fallback
            }
          }
          if (!iupacName) {
            iupacName = await this.requestIUPACNameFromMarvin();
          }
          if (iupacName) {
            await this.copyWithFeedback('IUPACName', iupacName);
          } else {
            alert('未找到 IUPACName');
          }
        } else if (type === 'formula') {
          const formula = cid ? await getMolecularFormulaByCID(cid) : null;
          if (formula) {
            await this.copyWithFeedback('Molecular Formula', formula);
          } else {
            alert('未找到分子式');
          }
        }
      } catch (error) {
        alert('获取信息失败，请检查网络连接');
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
          this.notifyCompoundNotFound();
          return;
        }
        if (drugBankUrl) {
          window.open(drugBankUrl, '_blank');
        } else if (cas) {
          const url = getDrugBankUrlByCAS(cas);
          window.open(url, '_blank');
        } else {
          alert('未找到 DrugBank ID 或 CAS 号');
        }
      } catch (e) {
        alert('获取 DrugBank 信息失败');
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
        const { cid, wikipediaUrl } = await getWikipediaUrlBySmiles(this.smilesValue);
        if (!cid) {
          this.notifyCompoundNotFound();
          return;
        }
        if (wikipediaUrl) {
          window.open(wikipediaUrl, '_blank');
        } else {
          alert('未找到 Wikipedia 链接');
        }
      } catch (e) {
        alert('获取 Wikipedia 链接失败');
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
      if (value === 'cas' || value === 'iupac' || value === 'formula') {
        this.handleGet(value);
      }
      event.target.value = '';
    },
  }
}
</script>

<style scoped>
.control-panel {
  margin-bottom: 4px;
  padding: 4px;
  border: 1px solid #ccc;
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
  max-width: 628px;
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
}

.button-group button,
.button-group select {
  cursor: pointer;
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

@media screen and (max-width: 655px) {
  .button-group {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .button-group button {
    flex: 1;
    min-width: 90px;
  }
}
</style> 