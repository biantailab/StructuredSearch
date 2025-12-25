<template>
  <div class="control-panel">
    <iframe id="marvinFrame"
    :src="marvinUrl"
    class="marvin-frame"
    allow="clipboard-read; clipboard-write"
    @load="handleIframeLoad">
  </iframe> 
  </div>
</template>

<script>
export default {
  name: 'MarvinEditor',
  computed: {
    marvinUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      const smiles = urlParams.get('smiles');
      
      let marvinUrl = 'marvin/editorws.html';
      if (smiles) {
        marvinUrl += `?smiles=${encodeURIComponent(smiles)}`;
      }
      
      return marvinUrl;
    }
  },
  methods: {
    handleIframeLoad() {
      // 通知父组件 iframe 已加载
      this.$emit('iframe-loaded');
    }
  }
}
</script>

<style scoped>
.marvin-frame {
  width: 100%;
  height: 90vh;
  border: none;
}
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
@media screen and (max-width: 759px) {
  .control-panel {
    height: 75vh;
    margin-bottom: 0;
    padding: 2px;
  }
}
</style> 