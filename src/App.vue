<template>
  <div class="app-container">
    <ControlPanel @show-3d="handleShow3D" />
    <MarvinEditor @iframe-loaded="handleIframeLoaded" />
    <MolViewWindow 
      :show="show3DView"
      :smiles="currentSmiles"
      @close="handleClose3D"
    />
    <div class="chemaxon-corner">
      <a href="http://www.chemaxon.com/" target="_blank" rel="noopener">
        <img src="/imgs/chemaxon.png" alt="Chemaxon" />
      </a>
    </div>
  </div>
</template>

<script>
import ControlPanel from './components/ControlPanel.vue'
import MarvinEditor from './components/MarvinEditor.vue'
import MolViewWindow from './components/MolViewWindow.vue'

export default {
  name: 'App',
  components: {
    ControlPanel,
    MarvinEditor,
    MolViewWindow
  },
  data() {
    return {
      show3DView: false,
      currentSmiles: ''
    }
  },
  mounted() {
    this.setupMessageListener();
  },
  methods: {
    setupMessageListener() {
      window.addEventListener('message', (event) => {
        const marvinIframe = document.getElementById('marvinFrame');
        if (!marvinIframe || event.source !== marvinIframe.contentWindow) {
          return;
        }

        // 处理来自 Marvin 编辑器的消息
        if (event.data?.type === 'smilesChangedInSketcher') {
          this.currentSmiles = event.data.value;
        }
      });
    },
    handleIframeLoaded() {
      // 通知 Marvin 编辑器已加载完成
      const marvinIframe = document.getElementById('marvinFrame');
      if (marvinIframe?.contentWindow) {
        marvinIframe.contentWindow.postMessage(
          { type: 'marvinReady' },
          window.location.origin
        );
      }
    },
    handleShow3D(smiles) {
      this.currentSmiles = smiles;
      this.show3DView = true;
    },
    handleClose3D() {
      this.show3DView = false;
    }
  }
}
</script>

<style>
html,
body {
  height: 100%;
  margin: 0;
  overflow: hidden;
}

#app {
  height: 100%;
  overflow: hidden;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  box-sizing: border-box;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: #f5f5f5;
  gap: 1rem;
}

.logo {
  height: 40px;
  width: auto;
}

.site-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.chemaxon-corner {
  position: fixed;
  right: 12px;
  bottom: 8px;
  z-index: 9999;
  background: rgba(0,0,0,0.0);
  padding: 0;
  border-radius: 8px;
}

.chemaxon-corner img {
  height: 20px;
}

@media (max-width: 655px) {
  .chemaxon-corner img {
    height: 16px;
  }
}
</style> 