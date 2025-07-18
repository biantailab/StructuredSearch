<template>
  <div class="control-panel">
    <iframe id="marvinFrame"
    src="marvin/editorws.html"
    class="marvin-frame"
    allow="clipboard-read; clipboard-write"
    @load="handleIframeLoad">
  </iframe> 
  </div>
</template>

<script>
export default {
  name: 'MarvinEditor',
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
  border: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  align-items: center;
}
@media screen and (max-width: 675px) {
  .control-panel {
    height: 75vh;
    margin-bottom: 0;
    padding: 2px;
  }
  
  .marvin-frame {
    width: 100%;
    height: 75vh;
    border: none;
  }
}
</style> 