<template>
  <div class="app-container">
    <ControlPanel />
    <MarvinEditor />
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
  mounted() {
  },
  beforeUnmount() {
  }
}
</script>

<style>
html, body {
  height: 100%;
  margin: 0;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
</style>