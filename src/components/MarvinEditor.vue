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
      
      let marvinUrl = '/marvin/editorws.html';
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
  height: 100%;
  border: none;
  flex: 1;
  display: block;
}
.control-panel {
  padding: 2px;
  border: 1px solid #e0e0e0;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}
</style>