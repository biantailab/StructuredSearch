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
          <option value="iupac">Name</option>
          <option value="img">PNG</option>
          <option value="sdf">SDF</option>
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
  getPubChemCID,
  getCASByCID,
  getPubChemData,
  getIUPACNameByCID,
  findDrugBankId,
  findWikipediaLink
} from '@/utils/pubchem';

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

    handlePubChem() {
      if (this.smilesValue) {
        const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(this.smilesValue)}`;
        window.open(searchUrl, '_blank');
      }
    },

    handleHNMR() {
      if (this.smilesValue) {
        const searchUrl = `https://www.nmrdb.org/new_predictor/index.shtml?v=v2.157.0&smiles=${encodeURIComponent(this.smilesValue)}`;
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

    async handleGetCAS() {
      if (!this.smilesValue) {
        return;
      }
      this.loading = true;
      try {
        console.log('正在查询 CAS，SMILES:', this.smilesValue);
        const cid = await getPubChemCID(this.smilesValue);
        if (!cid) {
          alert('未找到对应的化合物');
          return;
        }
        console.log('找到 PubChem CID:', cid);
        const casNumber = await getCASByCID(cid);
        if (casNumber) {
          try {
            await navigator.clipboard.writeText(casNumber);
            alert(`CAS ${casNumber} 已复制`);
          } catch (err) {
            try {
              const textArea = document.createElement('textarea');
              textArea.value = casNumber;
              textArea.style.position = 'fixed';
              textArea.style.left = '-999999px';
              textArea.style.top = '-999999px';
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              const successful = document.execCommand('copy');
              document.body.removeChild(textArea);
              if (successful) {
                alert(`CAS ${casNumber} 已复制`);
              } else {
                alert('复制失败，请手动复制');
              }
            } catch (fallbackErr) {
              console.error('复制失败:', fallbackErr);
              alert('复制失败，请手动复制');
            }
          }
        } else {
          alert('未找到 CAS 号');
        }
      } catch (error) {
        console.error('获取 CAS 时出错:', error);
        alert('获取 CAS 失败，请检查网络连接');
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

    async handlePubChemImage() {
      if (!this.smilesValue) {
        return;
      }
      this.loading = true;
      try {
        console.log('正在获取PubChem图片，SMILES:', this.smilesValue);
        
        const cid = await getPubChemCID(this.smilesValue);
        if (!cid) {
          alert('未找到对应的化合物');
          return;
        }
        console.log('找到 PubChem CID:', cid);
        
        let compoundName = `CID_${cid}`;
        try {
          const iupacName = await getIUPACNameByCID(cid);
          if (iupacName) {
            compoundName = iupacName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
          }
        } catch (e) {
          // 保持默认 CID 名称
        }
        
        const imageUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`;
        console.log('PubChem 图片下载 URL:', imageUrl);
        
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`图片下载失败: ${imageResponse.status}`);
        }
        
        const imageBlob = await imageResponse.blob();
        const downloadUrl = URL.createObjectURL(imageBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = `${compoundName}_2D_structure.png`;
        downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        URL.revokeObjectURL(downloadUrl);
        
        console.log(`图片已下载: ${compoundName}_2D_structure.png`);
        
      } catch (error) {
        console.error('获取PubChem图片时出错:', error);
        alert('获取PubChem图片失败，请检查网络连接');
      } finally {
        this.loading = false;
      }
    },

    async handleGetDrugBank() {
      if (!this.smilesValue) {
        return;
      }
      this.loading = true;
      try {
        const cid = await getPubChemCID(this.smilesValue);
        if (!cid) {
          alert('未找到对应的化合物');
          return;
        }
        const data = await getPubChemData(cid);
        const result = findDrugBankId(data.Record?.Section);
        if (result && result.url) {
          window.open(result.url, '_blank');
        } else {
          const casNumber = await getCASByCID(cid);
          if (casNumber) {
            const url = `https://go.drugbank.com/unearth/q?searcher=drugs&query=${encodeURIComponent(casNumber)}`;
            window.open(url, '_blank');
          } else {
            alert('未找到 DrugBank ID 或 CAS 号');
          }
        }
      } catch (e) {
        alert('获取 DrugBank 信息失败');
      } finally {
        this.loading = false;
      }
    },

    async handleGetIUPACName() {
      if (!this.smilesValue) {
        return;
      }
      this.loading = true;
      try {
        const cid = await getPubChemCID(this.smilesValue);
        if (!cid) {
          alert('未找到对应的化合物');
          return;
        }
        const iupacName = await getIUPACNameByCID(cid);
        if (iupacName) {
          try {
            await navigator.clipboard.writeText(iupacName);
            alert(`IUPACName: ${iupacName}\n已复制到剪贴板`);
          } catch (err) {
            alert(`IUPACName: ${iupacName}\n复制失败，请手动复制`);
          }
        } else {
          alert('未找到 IUPACName');
        }
      } catch (error) {
        alert('获取 IUPACName 失败，请检查网络连接');
      } finally {
        this.loading = false;
      }
    },

    async handleGetWikipedia() {
      if (!this.smilesValue) {
        return;
      }
      this.loading = true;
      try {
        const cid = await getPubChemCID(this.smilesValue);
        if (!cid) {
          alert('未找到对应的化合物');
          return;
        }
        const data = await getPubChemData(cid);
        const wikipediaUrl = findWikipediaLink(data.Record?.Section, data.Record?.RecordTitle);
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
      const url = `https://go.drugbank.com/structures/search/small_molecule_drugs/structure?utf8=✓&searcher=structure&structure_search_type=substructure&structure=${encodeURIComponent(this.smilesValue)}#results`;
      window.open(url, '_blank');
    },

    handleGetSelect(event) {
      const value = event.target.value;
      if (!this.smilesValue || !value) return;
      if (value === 'cas') {
        this.handleGetCAS();
      } else if (value === 'iupac') {
        this.handleGetIUPACName();
      } else if (value === 'img') {
        this.handlePubChemImage();
      } else if (value === 'sdf') {
        this.handleGetSDF();
      }
      event.target.value = '';
    },

    async handleGetSDF() {
      if (!this.smilesValue) return;
      this.loading = true;
      try {
        const cid = await getPubChemCID(this.smilesValue);
        if (!cid) {
          alert('未找到对应的化合物');
          return;
        }
        const baseUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/record/SDF`;
        let sdfUrl = `${baseUrl}?record_type=3d&response_type=save&response_basename=Conformer3D_COMPOUND_CID_${cid}`;
        let response = await fetch(sdfUrl, { method: 'HEAD' });
        if (!response.ok) {
          sdfUrl = `${baseUrl}?record_type=2d&response_type=save&response_basename=Compound2D_COMPOUND_CID_${cid}`;
          response = await fetch(sdfUrl, { method: 'HEAD' });
          if (!response.ok) {
            alert('该化合物在PubChem中没有3D或2D结构数据');
            return;
          }
        }
        window.location.href = sdfUrl;
      } catch (error) {
        console.error('获取SDF时出错:', error);
        alert('获取SDF失败，请检查网络连接');
      } finally {
        this.loading = false;
      }
    }
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
  max-width: 615px;
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

@media screen and (max-width: 640px) {
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