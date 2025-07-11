<template>
  <div class="control-panel">
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
          href="https://github.com/biantailab/MarvinJS"
          target="_blank"
          class="github-stars-link"
        >
          <img
            src="https://img.shields.io/github/stars/biantailab/MarvinJS?style=social"
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
        <button @click="handleGetCAS">get CAS</button>
        <button @click="handlePubChemImage">get Img</button>
        <button @click="handle3DView">3D</button>
        <button @click="handleHNMR">HNMR</button>
        <button @click="handlePubChem">PubChem</button>
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
      iframeOrigin: null
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
        
        // 查找CAS号 - 使用标准格式验证
        const casNumber = synonyms.find(syn => {
          // CAS号标准格式：多位数字-两位数字-一位数字
          const casRegex = /^\d+-\d{2}-\d$/;
          // 排除EC编号（通常以EC开头）
          return casRegex.test(syn) && !syn.startsWith('EC');
        });
        
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

    handle3DView() {
      if (!this.smilesValue) {
        return;
      }
      this.$emit('show-3d', this.smilesValue);
    },

    async handlePubChemImage() {
      if (!this.smilesValue) {
        alert('请先输入SMILES');
        return;
      }

      try {
        console.log('正在获取PubChem图片，SMILES:', this.smilesValue);
        
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
        
        const nameUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IUPACName/JSON`;
        const nameResponse = await fetch(nameUrl);
        let compoundName = `CID_${cid}`;
        
        if (nameResponse.ok) {
          const nameData = await nameResponse.json();
          if (nameData.PropertyTable?.Properties?.[0]?.IUPACName) {
            compoundName = nameData.PropertyTable.Properties[0].IUPACName;
            compoundName = compoundName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
          }
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
  max-width: 520px;
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

@media screen and (max-width: 550px) {
  .button-group {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .button-group button {
    flex: 1;
    min-width: 65px;
  }
}
</style> 