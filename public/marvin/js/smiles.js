let PARENT_FRAME_ORIGIN = null; // 用于存储父窗口的源

        window.addEventListener("message", function(event) {
            if (event.source !== window.parent) {
                return;
            }

            // 安全性：在首次消息时存储父窗口的源
            // 后续消息应来自同一源
            if (!PARENT_FRAME_ORIGIN) {
                // 最好在这里也对 event.origin 进行校验，例如检查它是否是你期望的父页面部署的域名
                // if (event.origin === "https://your-expected-parent-domain.com") {
                //    PARENT_FRAME_ORIGIN = event.origin;
                // } else {
                //    console.warn("iframe: Received initial message from unexpected origin:", event.origin);
                //    return;
                // }
                PARENT_FRAME_ORIGIN = event.origin; // 简化处理，直接采用第一个消息的源
            } else if (event.origin !== PARENT_FRAME_ORIGIN) {
                console.warn("iframe: Message received from unexpected origin:", event.origin, "Expected:", PARENT_FRAME_ORIGIN);
                return; // 忽略来自其他源的消息
            }

            let messageData = event.data;
            if (typeof messageData === 'string') {
                try {
                    messageData = JSON.parse(messageData);
                } catch (e) {
                    console.warn('iframe: Failed to parse message data as JSON string:', messageData);
                    return;
                }
            }

            if (messageData && messageData.type) {
                marvin.onReady(function() { // 确保 sketcher 实例已准备好
                    if (messageData.type === 'smilesUpdate') {
                        console.log("iframe: 接收到 SMILES 更新:", messageData.value);
                        if (marvin.sketcherInstance) {
                            marvin.sketcherInstance.importStructure("smiles", messageData.value)
                                .then(() => {
                                    console.log("iframe: SMILES 导入成功");
                                    if (PARENT_FRAME_ORIGIN) {
                                        window.parent.postMessage({ type: 'smilesImported', status: 'success' }, PARENT_FRAME_ORIGIN);
                                    }
                                })
                                .catch(error => {
                                    console.error("iframe: SMILES 导入错误:", error);
                                    if (PARENT_FRAME_ORIGIN) {
                                        window.parent.postMessage({ type: 'smilesImported', status: 'error', error: error.message || error }, PARENT_FRAME_ORIGIN);
                                    }
                                });
                        }
                    } else if (messageData.type === 'getIUPACName') {
                        if (!PARENT_FRAME_ORIGIN) {
                            console.warn("iframe: 父窗口源未知，无法返回 IUPAC 名称。");
                            return;
                        }
                        if (marvin.sketcherInstance) {
                            marvin.sketcherInstance.exportStructure("name")
                                .then(function(name) {
                                    window.parent.postMessage({ type: 'iupacNameResult', status: 'success', value: name }, PARENT_FRAME_ORIGIN);
                                })
                                .catch(function(error) {
                                    console.error('iframe: 导出 IUPAC 名称错误:', error);
                                    window.parent.postMessage({ type: 'iupacNameResult', status: 'error', error: error.message || String(error) }, PARENT_FRAME_ORIGIN);
                                });
                        }
                    } else if (messageData.type === 'clearSketch') {
                        console.log("iframe: 接收到清空指令");
                        if (marvin.sketcherInstance) {
                            marvin.sketcherInstance.clear();
                            console.log("iframe: 编辑器已清空");
                            if (PARENT_FRAME_ORIGIN) {
                                window.parent.postMessage({ type: 'sketchCleared', status: 'success' }, PARENT_FRAME_ORIGIN);
                            }
                        }
                    } else {
                        console.warn("iframe: 收到未知类型的消息:", messageData.type);
                    }
                });
            } else {
                console.warn("iframe: 收到格式不正确的消息或缺少 type 属性:", messageData);
            }
        }, false);

        // called when Marvin JS loaded
        function sketchOnLoad() {
            if (marvin.sketcherInstance && typeof marvin.sketcherInstance.importStructure === 'function') {
                if (typeof marvin.sketcherInstance.setServices === 'function') {
                    marvin.sketcherInstance.setServices(getDefaultServices());
                }

                // Load initial SMILES from URL if provided
                if (window.initialSmiles) {
                    console.log("Attempting to load SMILES from URL:", window.initialSmiles);
                    marvin.sketcherInstance.importStructure("smiles", window.initialSmiles)
                        .then(() => {
                            console.log("SMILES successfully loaded into editor:", window.initialSmiles);
                            // Force a redraw of the canvas
                            if (marvin.sketcherInstance && typeof marvin.sketcherInstance.repaint === 'function') {
                                marvin.sketcherInstance.repaint();
                            } else if (marvin.sketcherInstance && marvin.sketcherInstance.editor) {
                                marvin.sketcherInstance.editor.repaint();
                            }
                            
                            if (PARENT_FRAME_ORIGIN) {
                                window.parent.postMessage({ 
                                    type: 'smilesChangedInSketcher', 
                                    value: window.initialSmiles 
                                }, PARENT_FRAME_ORIGIN);
                            }
                        })
                        .catch(error => {
                            console.error("Error loading initial SMILES:", error);
                            // Try to get more detailed error information
                            if (error && error.message) {
                                console.error("Error details:", error.message);
                            }
                            // Try to export the current structure to see what's in the editor
                            if (marvin.sketcherInstance) {
                                marvin.sketcherInstance.exportStructure("smiles")
                                    .then(smiles => console.log("Current editor SMILES:", smiles))
                                    .catch(e => console.error("Could not export current structure:", e));
                            }
                        });
                } else {
                    console.log("No initial SMILES found in URL");
                }

                // Add event listener for structure changes
                if (typeof marvin.sketcherInstance.on === 'function') {
                    marvin.sketcherInstance.on('molchange', function() {
                        if (!PARENT_FRAME_ORIGIN) {
                            console.warn("iframe (molchange): 父窗口源未知，无法发送 SMILES。");
                            return;
                        }
                        if (marvin.sketcherInstance) {
                            marvin.sketcherInstance.exportStructure("smiles").then(function(smiles) {
                                // 将新的 SMILES 字符串发送回父窗口
                                console.log("iframe (molchange): 发送 SMILES 到父窗口:", smiles);
                                window.parent.postMessage({ type: 'smilesChangedInSketcher', value: smiles }, PARENT_FRAME_ORIGIN);
                            }).catch(function(error) {
                                console.error('iframe (molchange): 导出 SMILES 错误:', error);
                            });
                        }
                    });
                }

            } else if (marvin.Sketch && typeof marvin.Sketch.isSupported === 'function' && marvin.Sketch.isSupported()) {
                marvin.sketcherInstance = new marvin.Sketch("sketch");
                marvin.sketcherInstance.setServices(getDefaultServices());

                // Load initial SMILES from URL if provided
                if (window.initialSmiles) {
                    console.log("Attempting to load SMILES from URL:", window.initialSmiles);
                    marvin.sketcherInstance.importStructure("smiles", window.initialSmiles)
                        .then(() => {
                            console.log("SMILES successfully loaded into editor:", window.initialSmiles);
                            // Force a redraw of the canvas
                            if (marvin.sketcherInstance && marvin.sketcherInstance.editor) {
                                marvin.sketcherInstance.editor.repaint();
                            }
                            
                            if (PARENT_FRAME_ORIGIN) {
                                window.parent.postMessage({ 
                                    type: 'smilesChangedInSketcher', 
                                    value: window.initialSmiles 
                                }, PARENT_FRAME_ORIGIN);
                            }
                        })
                        .catch(error => {
                            console.error("Error loading initial SMILES:", error);
                            // Try to get more detailed error information
                            if (error && error.message) {
                                console.error("Error details:", error.message);
                            }
                            // Try to export the current structure to see what's in the editor
                            if (marvin.sketcherInstance) {
                                marvin.sketcherInstance.exportStructure("smiles")
                                    .then(smiles => console.log("Current editor SMILES:", smiles))
                                    .catch(e => console.error("Could not export current structure:", e));
                            }
                        });
                } else {
                    console.log("No initial SMILES found in URL");
                }

                // Add event listener for structure changes
                marvin.sketcherInstance.on('molchange', function() {
                    if (!PARENT_FRAME_ORIGIN) {
                        console.warn("iframe (molchange): 父窗口源未知，无法发送 SMILES。");
                        return;
                    }
                    if (marvin.sketcherInstance) {
                        marvin.sketcherInstance.exportStructure("smiles").then(function(smiles) {
                            // 将新的 SMILES 字符串发送回父窗口
                            console.log("iframe (molchange): 发送 SMILES 到父窗口:", smiles);
                            window.parent.postMessage({ type: 'smilesChangedInSketcher', value: smiles }, PARENT_FRAME_ORIGIN);
                        }).catch(function(error) {
                            console.error('iframe (molchange): 导出 SMILES 错误:', error);
                        });
                    }
                });

            } else {
                alert("Cannot initiate sketcher. Current browser may not support HTML canvas or may run in Compatibility Mode.");
            }
        }

        /*
        // 这个函数尝试访问父窗口的 DOM (document.getElementById('smilesInput'))，这是不正确的。
        // SMILES 的输入和更新逻辑主要由父窗口处理，并通过 postMessage 发送给 iframe。
        // 因此，暂时注释掉此函数。
        function autoImportSmiles() {
            var smiles = document.getElementById('smilesInput').value;
            if (marvin.sketcherInstance) {
                if (smiles) {
                    marvin.sketcherInstance.importStructure("smiles", smiles).catch(function(error) {
                        // It's good to provide some feedback, but alert might be too intrusive for auto-import
                        console.error("Error importing SMILES: " + error);
                    });
                } else {
                    // If SMILES input is empty, clear the sketcher
                    marvin.sketcherInstance.clear();
                }
            }
        }
        */