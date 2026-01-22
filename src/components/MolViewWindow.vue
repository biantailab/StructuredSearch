<template>
  <div v-if="show" class="molview-container" ref="molviewContainer">
    <div class="molview-header">
      <span class="title">3D</span>
      <div class="mode-selector">
        <button 
          v-for="mode in modes" 
          :key="mode.value"
          :class="{ active: currentMode === mode.value }"
          @click.stop="changeMode(mode.value)"
          @touchstart.stop="changeMode(mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>
      <button @click="close" class="close-button">&nbsp;&nbsp;×</button>
    </div>
    <div class="view-content">
      <iframe 
        :src="molviewUrl" 
        frameborder="0" 
        class="molview-frame"
        :key="smiles"
      ></iframe>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MolViewWindow',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    smiles: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      currentMode: 'balls',
      modes: [
        { label: 'Ball', value: 'balls' },
        { label: 'Stick', value: 'stick' },
        { label: 'VDW', value: 'vdw' },
        { label: 'Wireframe', value: 'wireframe' }
      ]
    }
  },
  computed: {
    molviewUrl() {
      if (!this.smiles) {
        return '';
      }
      return `https://embed.molview.org/v1/?mode=${this.currentMode}&smiles=${encodeURIComponent(this.smiles)}`;
    }
  },
  watch: {
    smiles: {
      immediate: true,
      handler() {
      }
    },
    show: {
      immediate: true,
      handler() {
      }
    }
  },
  mounted() {
  },
  beforeUnmount() {
  },
  methods: {
    close() {
      this.$emit('close');
    },

    changeMode(mode) {
      this.currentMode = mode;
    }
  }
}
</script>

<style scoped>
.molview-container {
  position: fixed;
  top: 50%;
  left: 80%;
  transform: translate(-50%, -50%);
  background: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.molview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f5f5f5;
  border-bottom: 1px solid #ccc;
  height: 12px;
}

.molview-header span {
  display: flex;
  align-items: center;
  height: 100%;
  font-size: 16px;
  font-weight: bold;
}

.mode-selector {
  display: flex;
  margin: 0 8px;
  gap: 4px;
}

.mode-selector button {
  font-size: 12px;
  cursor: pointer;
  --uno: "border-0 border-b-2 border-transparent rounded-none px-2 py-1 border-solid";
  --uno: "bg-transparent hover:bg-ma-h transition-all outline-none text-ma-text";
}

.mode-selector button.active {
  --uno: "text-ma bg-ma-bg border-ma border-b-2 border-solid";
}

.view-content {
  width: 400px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  position: relative;
}

.title {
  cursor: default;
  color: #757575;
  font-family: sans-serif;
}

.close-button {
  background: none;
  border: none;
  font-size: 25px;
  cursor: pointer;
  padding: 0 8px;
  display: flex;
  align-items: center;
  height: 100%;
  color: #757575;
  font-family: sans-serif;
}

.molview-frame {
  width: 100%;
  height: 100%;
  border: none;
}

@media screen and (max-width: 1024px) {
  .molview-container {
    position: fixed;
    top: 50%;
    left: 75%;
    transform: translate(-50%, -50%);
    width: 325px;
    height: 325px;
  }

  .view-content {
    width: 100%;
    height: calc(100% - 40px);
  }

  .molview-header {
    padding: 6px 8px;
  }

  .close-button {
    padding: 0 4px;
  }
}

@media screen and (max-width: 600px) {
  .molview-container {
    top: 75%;
    left: 50%;
    width: 300px;
    height: 300px;
  }
}
</style> 