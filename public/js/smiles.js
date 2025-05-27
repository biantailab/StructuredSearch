const marvinIframe = document.getElementById('marvinFrame');
let iframeOrigin = null; // 将在iframe加载后确定
let pendingSmilesValue = null; // 用于暂存 iframe 加载完成前输入的 SMILES 值

marvinIframe.onload = function() {
    console.log("父窗口: marvinIframe.onload 事件触发。");
    try {
        if (marvinIframe.src.startsWith('http')) {
            iframeOrigin = new URL(marvinIframe.src).origin;
        } else {
            // 对于相对路径，假设与父窗口同源
            iframeOrigin = window.location.origin;
        }
        console.log("父窗口: iframe 加载完成，iframe.src:", marvinIframe.src, "解析得到的 iframeOrigin:", iframeOrigin);

        // iframe 加载完成后，检查是否有待处理的 SMILES 值，若有则发送
        console.log("父窗口 (onload): 检查 pendingSmilesValue. 当前值:", pendingSmilesValue, "; marvinIframe.contentWindow 是否存在:", !!(marvinIframe && marvinIframe.contentWindow), "; iframeOrigin:", iframeOrigin);
        if (pendingSmilesValue !== null && marvinIframe.contentWindow && iframeOrigin) {
            console.log("父窗口 (onload): 条件满足，准备发送待处理的 SMILES 值:", pendingSmilesValue, "目标源:", iframeOrigin);
            try {
                marvinIframe.contentWindow.postMessage({ type: 'smilesUpdate', value: pendingSmilesValue }, iframeOrigin);
                console.log("父窗口 (onload): 成功发送待处理的 SMILES 值.");
            } catch (e) {
                console.error("父窗口 (onload): 发送待处理的 SMILES 值时发生错误:", e);
            }
        }
        pendingSmilesValue = null; // 清除待处理的值，无论是否发送成功
        console.log("父窗口 (onload): pendingSmilesValue 已被清除。");

        // 添加iframe内的事件监听
        try {
            marvinIframe.contentWindow.document.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    const smilesInput = document.getElementById('smilesInput');
                    if (smilesInput?.value) {
                        event.preventDefault();
                        searchsmiles();
                    }
                }
            });
        } catch (e) {
            console.error('无法在iframe中添加事件监听:', e);
        }

    } catch (e) {
        console.error("父窗口 (onload): 解析 iframe src 或设置 iframeOrigin 时发生错误:", e);
        iframeOrigin = "*"; // 作为备选，但不推荐用于生产
        console.warn("父窗口 (onload): iframeOrigin 因错误被设置为 '*'。");
        // 即使 origin 设置失败，也尝试处理 pendingSmilesValue （如果 origin 变成 "*"）
        console.log("父窗口 (onload-catch): 检查 pendingSmilesValue. 当前值:", pendingSmilesValue, "; marvinIframe.contentWindow 是否存在:", !!(marvinIframe && marvinIframe.contentWindow), "; iframeOrigin:", iframeOrigin);
        if (pendingSmilesValue !== null && marvinIframe.contentWindow && iframeOrigin === "*") {
             console.warn("父窗口 (onload-catch): 条件满足，尝试用 '*' 发送待处理的 SMILES 值:", pendingSmilesValue);
             try {
                marvinIframe.contentWindow.postMessage({ type: 'smilesUpdate', value: pendingSmilesValue }, iframeOrigin);
                console.log("父窗口 (onload-catch): 成功用 '*' 发送待处理的 SMILES 值.");
             } catch (e_catch) {
                console.error("父窗口 (onload-catch): 用 '*' 发送待处理的 SMILES 值时发生错误:", e_catch);
             }
        }
        pendingSmilesValue = null; // 清除待处理的值
        console.log("父窗口 (onload-catch): pendingSmilesValue 已被清除。");
    }
};

async function callSmilesProcessService(smilesString) {
    const serviceUrl = "https://smiles.benzyl-titanium.top/smiles/process"; // Service URL
    console.log(`父窗口: 准备调用 SMILES 处理服务: ${serviceUrl}，SMILES: ${smilesString}`);
    document.getElementById('serviceStatus').textContent = '正在调用服务...';


    try {
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ smiles: smilesString }),
        });

        if (!response.ok) {
            // Try to get error message from response body if available
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage += `, message: ${errorData.message || JSON.stringify(errorData)}`;
            } catch (e) {
                // Ignore if response is not JSON or body is empty
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log("父窗口: 服务调用成功，响应数据:", data);
        document.getElementById('serviceStatus').textContent = `服务响应: Canonical: ${data.canonical_smiles}, MW: ${data.molecular_weight}`;
        // alert(`服务响应:\nCanonical SMILES: ${data.canonical_smiles}\nMolecular Weight: ${data.molecular_weight}`);

    } catch (error) {
        console.error("父窗口: 调用 SMILES 处理服务时发生错误:", error);
        document.getElementById('serviceStatus').textContent = `服务调用失败: ${error.message}. 详情请查看控制台.`;
        // alert(`调用服务失败: ${error.message}\n请检查浏览器控制台 (F12) 获取更多信息，特别是关于 CORS 的错误。`);
    }
}

function autoImportSmiles() {
    const smilesValue = document.getElementById('smilesInput').value;
    if (marvinIframe?.contentWindow && iframeOrigin) {
        marvinIframe.contentWindow.postMessage({ type: 'smilesUpdate', value: smilesValue }, iframeOrigin);
    } else {
        pendingSmilesValue = smilesValue;
    }
}

// 监听来自 iframe 的消息
window.addEventListener('message', function(event) {
    // 安全性检查：确保消息来自预期的 iframe 源
    if (iframeOrigin && iframeOrigin !== "*" && event.origin !== iframeOrigin) {
        console.warn("父窗口: 收到来自非预期源的消息:", event.origin, "期望:", iframeOrigin);
        return;
    }
    // 确保消息来自 marvinFrame
    if (event.source !== marvinIframe.contentWindow) {
        console.warn("父窗口: 消息并非来自 marvinFrame");
        return;
    }

    console.log("父窗口: 收到来自 iframe 的消息:", event.data);

    // 在这里处理来自 iframe 的特定消息
    // 例如，如果 iframe 通知 SMILES 已被加载或发生其他事件
    if (event.data && event.data.type === 'smilesImported') {
        if (event.data.status === 'success') {
            console.log("父窗口: iframe 确认 SMILES 已导入。准备调用外部服务...");
            const currentSmiles = document.getElementById('smilesInput').value;
            if (currentSmiles) {
                callSmilesProcessService(currentSmiles); // Call the new function
            } else {
                console.warn("父窗口: SMILES 输入框为空，不调用外部服务。");
                document.getElementById('serviceStatus').textContent = 'SMILES 输入框为空。';
            }
        } else {
            console.error("父窗口: iframe 报告 SMILES 导入失败。不调用外部服务。");
            document.getElementById('serviceStatus').textContent = 'iframe SMILES 导入失败。';
        }
    } else if (event.data && event.data.type === 'sketchCleared') {
         if (event.data.status === 'success') {
            console.log("父窗口: iframe 确认编辑器已清空。");
        } else {
            console.error("父窗口: iframe 报告编辑器清空失败。", event.data.error);
        }
    } else if (event.data && event.data.type === 'smilesChangedInSketcher') {
        console.log("父窗口: iframe 中的 SMILES 已更改，值为:", event.data.value);
        const smilesInputField = document.getElementById('smilesInput');
        if (smilesInputField) {
            smilesInputField.value = event.data.value;
        } else {
            console.error("父窗口: 无法找到 ID 为 'smilesInput' 的元素来更新SMILES值。");
        }
    }
    // 你可以根据需要添加更多 else if 来处理不同类型的消息
});
window.addEventListener('load', function() {
    const clearButton = document.querySelector('button[onclick="clearAll()"]');
    if (clearButton) {
        clearButton.click();
    }
});

function clearAll() {
    document.getElementById('smilesInput').value = ''; // 清空输入框
    if (marvinIframe && marvinIframe.contentWindow && iframeOrigin) {
        // 向 iframe 发送清除命令
        marvinIframe.contentWindow.postMessage({ type: 'clearSketch' }, iframeOrigin);
        console.log("父窗口: 发送清空指令到 iframe");
    } else {
        console.warn("父窗口: iframe 未准备好或源未确定，无法发送清空指令");
    }
}

function copySmiles() {
    const smilesInput = document.getElementById('smilesInput');
    if (smilesInput && smilesInput.value) {
        navigator.clipboard.writeText(smilesInput.value);
    }
}

function searchsmiles() {
    const smilesInput = document.getElementById('smilesInput');
    if (smilesInput?.value) {
        const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(smilesInput.value)}`;
        window.open(searchUrl, '_blank');
    }
}

// 添加全局回车键监听
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const smilesInput = document.getElementById('smilesInput');
        if (smilesInput?.value) {
            event.preventDefault();
            searchsmiles();
        }
    }
});

function searchHNMR() {
    const smiles = document.getElementById('smilesInput');
    if (smilesInput?.value) {
        const searchUrl = `https://www.nmrdb.org/new_predictor/index.shtml?v=v2.157.0&smiles=${encodeURIComponent(smilesInput.value)}`;
        window.open(searchUrl, '_blank');
    }
}
