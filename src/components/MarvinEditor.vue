<template>
  <div class="control-panel">
    <div id="marvinHost" ref="marvinHost" class="marvin-host"></div>
  </div>
</template>

<script>
import { initMarvinEditor } from '@/utils/marvinBridge';

export default {
  name: 'MarvinEditor',
  async mounted() {
    try {
      await initMarvinEditor('#marvinHost');
      this.$emit('ready');
    } catch (e) {
      console.error('Failed to initialize Marvin editor:', e);
    }
  }
}
</script>

<style scoped>
.marvin-host {
  width: 100%;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
}
.control-panel {
  border: 1px solid #e0e0e0;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 0;
}
</style>