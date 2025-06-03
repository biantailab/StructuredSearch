<template>
  <div v-if="show" class="molview-container" ref="molviewContainer">
    <div class="molview-header" @mousedown="startDrag" @touchstart="startTouchDrag">
      <span>3D</span>
      <button @click="close" class="close-button">×</button>
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
      }
    }
  },
  computed: {
    molviewUrl() {
      const defaultSmiles = 'C(C1=CC=CC=C1)[Ti](CC1=CC=CC=C1)(CC1=CC=CC=C1)CC1=CC=CC=C1';
      return `https://embed.molview.org/v1/?mode=balls&smiles=${encodeURIComponent(this.smiles || defaultSmiles)}`;
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
        left: this.containerPosition.left,
        top: this.containerPosition.top
      };
      
      const marvinFrame = document.getElementById('marvinFrame');
      if (marvinFrame) {
        marvinFrame.style.pointerEvents = 'none';
        marvinFrame.style.zIndex = '0';
      }
      
      container.style.zIndex = '9999';
      container.style.transform = 'none';
      
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
      
      this.containerPosition = {
        left: newLeft,
        top: newTop
      };
      
      requestAnimationFrame(() => {
        container.style.left = `${newLeft}px`;
        container.style.top = `${newTop}px`;
      });
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
        left: this.containerPosition.left,
        top: this.containerPosition.top
      };
      
      const marvinFrame = document.getElementById('marvinFrame');
      if (marvinFrame) {
        marvinFrame.style.pointerEvents = 'none';
        marvinFrame.style.zIndex = '0';
      }
      
      container.style.zIndex = '9999';
      
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
      
      this.containerPosition = {
        left: newLeft,
        top: newTop
      };
      
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
  will-change: transform, left, top;
  transition: none;
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