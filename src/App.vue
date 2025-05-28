<template>
  <div class="app-container">
    <ControlPanel />
    <MarvinEditor @iframe-loaded="handleIframeLoaded" />
  </div>
</template>

<script>
import ControlPanel from './components/ControlPanel.vue'
import MarvinEditor from './components/MarvinEditor.vue'

export default {
  name: 'App',
  components: {
    ControlPanel,
    MarvinEditor
  },
  methods: {
    handleIframeLoaded() {
      // 通知 Marvin 编辑器已加载完成
      const marvinIframe = document.getElementById('marvinFrame');
      if (marvinIframe?.contentWindow) {
        marvinIframe.contentWindow.postMessage(
          { type: 'marvinReady' },
          window.location.origin
        );
      }
    }
  }
}
</script>

<style>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
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
</style> 