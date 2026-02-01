// 处理 MarvinJS 编辑器和 UI 组件之间的通信

export type SmilesChangeListener = (smiles: string) => void;

export class SmilesCommunicator {
  private static listeners: Set<SmilesChangeListener> = new Set();
  private static currentSmiles: string = '';

  /**
   * 监听 SMILES 的改变
   * @param listener 改变时调用
   * @returns 取消监听
   */
  static subscribe(listener: SmilesChangeListener): () => void {
    if (typeof listener !== 'function') {
      return () => {};
    }
    
    this.listeners.add(listener);
    
    // 立即将当前值通知新的监听器
    if (this.currentSmiles) {
      listener(this.currentSmiles);
    }
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 通知 SMILES 改变
   * @param smiles 新的 SMILES
   */
  static notifyChange(smiles: string): void {
    this.currentSmiles = smiles;
    this.listeners.forEach((listener) => {
      try {
        listener(smiles);
      } catch (error) {
        console.error('Error in SMILES change listener:', error);
      }
    });
  }

  /**
   * 获取 SMILES
   * @returns 当前的 SMILES
   */
  static getCurrentSmiles(): string {
    return this.currentSmiles;
  }

  /**
   * 设置当前的 SMILES
   * @param smiles
   */
  static setCurrentSmiles(smiles: string): void {
    this.currentSmiles = smiles;
  }
}