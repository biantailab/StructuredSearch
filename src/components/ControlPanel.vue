<template>
  <div class="control-panel">
    <div class="control-group">
      <input 
        type="text" 
        id="smilesInput"
        v-model="smilesValue" 
        placeholder="输入SMILES" 
        @input="handleInput"
        class="smiles-input"
      >
      <div class="button-group">
        <button @click="handleClear">Clear</button>
        <button @click="handleCopy">Copy</button>
        <button @click="handlePubChem">PubChem</button>
        <button @click="handleHNMR">HNMR</button>
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
  max-width: 400px;
  box-sizing: border-box;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style> 