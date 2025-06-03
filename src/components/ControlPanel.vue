<template>
  <div class="control-panel">
    <div class="control-group">
      <input 
        type="text" 
        id="smilesInput"
        v-model="smilesValue" 
        placeholder="SMILES" 
        @input="handleInput"
        class="smiles-input"
      >
      <div class="button-group">
        <select @change="loadExample" class="example-select">
          <option value="">Example:</option>
          <option value="C(C1=CC=CC=C1)[Ti](CC1=CC=CC=C1)(CC1=CC=CC=C1)CC1=CC=CC=C1">Benzyl titanium</option>
          <option value="O=C(O)C[C@H](CC(C)C)CN">Pregabalin</option>
          <option value="CNCCC(C1=CC=CC=C1)OC2=CC=C(C=C2)C(F)(F)F">Fluoxetine</option>
        </select>
        <button @click="handleClear">Clear</button>
        <button @click="handleCopy">Copy</button>
        <button @click="handleGetCAS">CAS</button>
        <button @click="handle3DView">3D</button>
        <button @click="handleHNMR">HNMR</button>
        <button @click="handlePubChem">PubChem</button>
      </div>
    </div>
    <div v-if="show3DView" class="molview-container">
      <div class="molview-header">
        <span>3D</span>
        <button @click="close3DView" class="close-button">×</button>
      </div>
      <div class="view-content">
        <iframe 
          :src="molviewUrl" 
          frameborder="0" 
          class="molview-frame"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ControlPanel',
  data() {
    return {
      smilesValue: '',
      iframeOrigin: null,
      show3DView: false,
      molviewUrl: '',
      defaultSmiles: 'C(C1=CC=CC=C1)[Ti](CC1=CC=CC=C1)(CC1=CC=CC=C1)CC1=CC=CC=C1'
    }
  },
  watch: {
    smilesValue: {
      handler() {
        if (this.show3DView) {
          this.updateMolviewUrl();
        }
      },
      immediate: true
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

      try {
        console.log('正在查询 CAS，SMILES:', this.smilesValue);
        
        // 通过SMILES获取PubChem CID
        const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(this.smilesValue)}/cids/JSON`;
        console.log('PubChem 搜索 URL:', searchUrl);
        
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
          throw new Error(`PubChem 搜索失败: ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        if (!searchData.IdentifierList?.CID?.[0]) {
          alert('未找到对应的化合物');
          return;
        }
        
        const cid = searchData.IdentifierList.CID[0];
        console.log('找到 PubChem CID:', cid);
        
        // 使用CID获取CAS
        const casUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`;
        const casResponse = await fetch(casUrl);
        if (!casResponse.ok) {
          throw new Error(`CAS 查询失败: ${casResponse.status}`);
        }
        
        const casData = await casResponse.json();
        const synonyms = casData.InformationList?.Information?.[0]?.Synonym || [];
        
        // 查找CAS 
        const casNumber = synonyms.find(syn => /^\d+-\d+-\d+$/.test(syn));
        
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
      }
    },

    updateMolviewUrl() {
      this.molviewUrl = `https://embed.molview.org/v1/?mode=balls&smiles=${encodeURIComponent(this.smilesValue || this.defaultSmiles)}`;
    },

    async handle3DView() {
      this.updateMolviewUrl();
      this.show3DView = true;
    },

    close3DView() {
      this.show3DView = false;
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
  gap: 8px;
}

.smiles-input {
  width: 100%;
  max-width: 500px;
  box-sizing: border-box;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.molview-container {
  position: fixed;
  top: 50%;
  left: 80%;
  transform: translate(-50%, -50%);
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.molview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f5f5f5;
  border-bottom: 1px solid #ccc;
}

.view-toggle {
  display: flex;
  gap: 4px;
}

.view-toggle button {
  padding: 4px 12px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.view-toggle button.active {
  background: #007bff;
  color: white;
  border-color: #0056b3;
}

.view-content {
  width: 400px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0 8px;
}

.close-button:hover {
  color: #666;
}

.molview-frame {
  width: 100%;
  height: 100%;
  border: none;
}

@media screen and (max-width: 1024px) {
  .molview-container {
    position: fixed;
    top: 50%;
    left: 75%;
    transform: translate(-50%, -50%);
    width: 325px;
    height: 325px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }

  .view-content {
    width: 100%;
    height: calc(100% - 40px);
  }

  .molview-header {
    padding: 4px 8px;
  }

  .close-button {
    padding: 0 4px;
  }
}

@media screen and (max-width: 600px) {

  .molview-container {
    position: fixed;
    top: 75%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 300px;
    height: 300px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }

  .view-content {
    width: 100%;
    height: calc(100% - 40px);
  }

  .molview-header {
    padding: 4px 8px;
  }

  .close-button {
    padding: 0 4px;
  }
}

@media screen and (max-width: 500px) {
  .example-select {
    width: 100%;
  }
  
  .button-group {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .button-group button {
    flex: 1;
    min-width: 60px;
  }
}
</style> 