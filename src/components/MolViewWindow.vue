<template>
  <div v-if="show" class="molview-container" ref="molviewContainer">
    <div class="molview-header" @mousedown="startDrag" @touchstart="startTouchDrag">
      <span>3D</span>
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
      <button @click="close" class="close-button"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 12 16"><!-- Icon from FormKit Icons by FormKit, Inc - https://github.com/formkit/formkit/blob/master/packages/icons/LICENSE --><path fill="currentColor" d="M10 12.5a.47.47 0 0 1-.35-.15l-8-8c-.2-.2-.2-.51 0-.71s.51-.2.71 0l7.99 8.01c.2.2.2.51 0 .71c-.1.1-.23.15-.35.15Z"/><path fill="currentColor" d="M2 12.5a.47.47 0 0 1-.35-.15c-.2-.2-.2-.51 0-.71l8-7.99c.2-.2.51-.2.71 0s.2.51 0 .71l-8.01 7.99c-.1.1-.23.15-.35.15"/></svg></button>
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
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
      touchStartPos: { x: 0, y: 0, left: 0, top: 0 },
      lastMoveTime: 0,
      moveThrottle: 8,
      marvinBounds: {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      },
      initialPosition: {
        left: '80%',
        top: '50%'
      },
      containerPosition: {
        left: 0,
        top: 0
      },
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
      handler(newSmiles) {
        if (this.show) {
          this.$nextTick(() => {
            this.update3DView();
          });
        }
      }
    },
    show: {
      immediate: true,
      handler(newShow) {
        if (newShow) {
          this.$nextTick(() => {
            this.update3DView();
          });
        }
      }
    }
  },
  mounted() {
    this.updateMarvinBounds();
    window.addEventListener('resize', this.updateMarvinBounds);
    this.$nextTick(() => {
      const container = this.$refs.molviewContainer;
      if (container) {
        const rect = container.getBoundingClientRect();
        this.containerPosition = {
          left: rect.left,
          top: rect.top
        };
      }
    });
  },
  beforeUnmount() {
    this.cleanupDragEvents();
    this.cleanupTouchEvents();
    window.removeEventListener('resize', this.updateMarvinBounds);
  },
  methods: {
    update3DView() {
      if (!this.$el) return;
      
      const iframe = this.$el.querySelector('.molview-frame');
      if (iframe) {
        iframe.src = this.molviewUrl;
      }
    },
    updateMarvinBounds() {
      const marvinFrame = document.getElementById('marvinFrame');
      if (marvinFrame) {
        const rect = marvinFrame.getBoundingClientRect();
        this.marvinBounds = {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom
        };
      }
    },
    startDrag(event) {
      if (event.target.classList.contains('close-button')) {
        return;
      }
      this.isDragging = true;
      const container = this.$refs.molviewContainer;
      const rect = container.getBoundingClientRect();
      
      this.touchStartPos = {
        x: event.clientX,
        y: event.clientY,
        left: rect.left,
        top: rect.top
      };
      
      const marvinFrame = document.getElementById('marvinFrame');
      if (marvinFrame) {
        marvinFrame.style.pointerEvents = 'none';
        marvinFrame.style.zIndex = '0';
      }
      
      container.style.zIndex = '9999';
      container.style.transition = 'none';
      
      this.lastMoveTime = performance.now();
      document.addEventListener('mousemove', this.onDrag, { passive: true });
      document.addEventListener('mouseup', this.stopDrag);
    },
    
    onDrag(event) {
      if (!this.isDragging) return;
      
      const now = performance.now();
      if (now - this.lastMoveTime < this.moveThrottle) return;
      this.lastMoveTime = now;

      const container = this.$refs.molviewContainer;
      const rect = container.getBoundingClientRect();
      
      const deltaX = event.clientX - this.touchStartPos.x;
      const deltaY = event.clientY - this.touchStartPos.y;
      
      let newLeft = this.touchStartPos.left + deltaX;
      let newTop = this.touchStartPos.top + deltaY;
      
      const minX = this.marvinBounds.left;
      const maxX = this.marvinBounds.right - rect.width;
      const minY = this.marvinBounds.top;
      const maxY = this.marvinBounds.bottom - rect.height;
      
      newLeft = Math.max(minX, Math.min(newLeft, maxX));
      newTop = Math.max(minY, Math.min(newTop, maxY));
      
      container.style.left = `${newLeft}px`;
      container.style.top = `${newTop}px`;
      container.style.transform = 'none';
    },
    
    stopDrag() {
      if (!this.isDragging) return;
      this.isDragging = false;
      
      const marvinFrame = document.getElementById('marvinFrame');
      if (marvinFrame) {
        marvinFrame.style.pointerEvents = 'auto';
        marvinFrame.style.zIndex = '';
      }
      
      const container = this.$refs.molviewContainer;
      if (container) {
        container.style.zIndex = '1000';
      }
      
      this.cleanupDragEvents();
    },

    startTouchDrag(event) {
      if (event.target.classList.contains('close-button')) {
        return;
      }
      event.preventDefault();
      const touch = event.touches[0];
      const container = this.$refs.molviewContainer;
      const rect = container.getBoundingClientRect();
      
      this.isDragging = true;
      this.touchStartPos = {
        x: touch.clientX,
        y: touch.clientY,
        left: rect.left,
        top: rect.top
      };
      
      const marvinFrame = document.getElementById('marvinFrame');
      if (marvinFrame) {
        marvinFrame.style.pointerEvents = 'none';
        marvinFrame.style.zIndex = '0';
      }
      
      container.style.zIndex = '9999';
      container.style.transition = 'none';
      
      this.lastMoveTime = performance.now();
      document.addEventListener('touchmove', this.onTouchDrag, { passive: false });
      document.addEventListener('touchend', this.stopTouchDrag);
      document.addEventListener('touchcancel', this.stopTouchDrag);
    },
    
    onTouchDrag(event) {
      if (!this.isDragging) return;
      event.preventDefault();
      
      const now = performance.now();
      if (now - this.lastMoveTime < this.moveThrottle) return;
      this.lastMoveTime = now;

      const touch = event.touches[0];
      const container = this.$refs.molviewContainer;
      const rect = container.getBoundingClientRect();
      
      const deltaX = touch.clientX - this.touchStartPos.x;
      const deltaY = touch.clientY - this.touchStartPos.y;
      
      let newLeft = this.touchStartPos.left + deltaX;
      let newTop = this.touchStartPos.top + deltaY;
      
      const minX = this.marvinBounds.left;
      const maxX = this.marvinBounds.right - rect.width;
      const minY = this.marvinBounds.top;
      const maxY = this.marvinBounds.bottom - rect.height;
      
      newLeft = Math.max(minX, Math.min(newLeft, maxX));
      newTop = Math.max(minY, Math.min(newTop, maxY));
      
      container.style.left = `${newLeft}px`;
      container.style.top = `${newTop}px`;
      container.style.transform = 'none';
    },
    
    stopTouchDrag() {
      if (!this.isDragging) return;
      this.isDragging = false;
      
      const marvinFrame = document.getElementById('marvinFrame');
      if (marvinFrame) {
        marvinFrame.style.pointerEvents = 'auto';
        marvinFrame.style.zIndex = '';
      }
      
      const container = this.$refs.molviewContainer;
      if (container) {
        container.style.zIndex = '1000';
      }
      
      this.cleanupTouchEvents();
    },

    cleanupDragEvents() {
      document.removeEventListener('mousemove', this.onDrag);
      document.removeEventListener('mouseup', this.stopDrag);
      const marvinFrame = document.getElementById('marvinFrame');
      if (marvinFrame) {
        marvinFrame.style.pointerEvents = 'auto';
      }
    },

    cleanupTouchEvents() {
      document.removeEventListener('touchmove', this.onTouchDrag);
      document.removeEventListener('touchend', this.stopTouchDrag);
      document.removeEventListener('touchcancel', this.stopTouchDrag);
      const marvinFrame = document.getElementById('marvinFrame');
      if (marvinFrame) {
        marvinFrame.style.pointerEvents = 'auto';
      }
    },

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
  cursor: move;
  touch-action: none;
  user-select: none;
  will-change: transform;
}

.molview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f5f5f5;
  border-bottom: 1px solid #ccc;
  user-select: none;
  touch-action: none;
  height: 25px;
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

.close-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0 8px;
  display: flex;
  align-items: center;
  height: 100%;
}

.close-button svg {
  display: block;
  height: 20px;
  width: 20px;
}

.close-button:hover {
  color: #666;
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
    padding: 4px 8px;
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