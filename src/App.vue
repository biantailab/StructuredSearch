<template>
  <div class="app-container">
    <ControlPanel @show-3d="handleShow3D" />
    <MarvinEditor />
    <MolViewWindow 
      :show="show3DView"
      :smiles="currentSmiles"
      @close="handleClose3D"
    />
  </div>
</template>

<script>
import ControlPanel from './components/ControlPanel.vue'
import MarvinEditor from './components/MarvinEditor.vue'
import MolViewWindow from './components/MolViewWindow.vue'
import { onSmilesChange } from '@/utils/marvinBridge';

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
    this._unsubscribeMarvinSmiles = onSmilesChange((smiles) => {
      this.currentSmiles = smiles;
    });
  },
  beforeUnmount() {
    if (this._unsubscribeMarvinSmiles) {
      this._unsubscribeMarvinSmiles();
      this._unsubscribeMarvinSmiles = null;
    }
  },
  methods: {
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