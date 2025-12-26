import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/molscribe', 
  timeout: 60000, 
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

export async function imageToSmiles(file) {
  try {
    const base64Image = await fileToBase64(file);

    const payload = {
      data: [base64Image]
    };

    const response = await apiClient.post('/api/predict', payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const { data } = response.data;
    
    console.log("API 原始返回数据:", data);

    if (data && Array.isArray(data)) {
      const smiles = data.find(item => 
        typeof item === 'string' && 
        !item.startsWith('data:image') && 
        item.length > 0
      );

      if (smiles) {
        return smiles.trim();
      } else {
        throw new Error('API 返回了数据，但未找到 SMILES 文本字符串');
      }
    } else {
      throw new Error('API 返回格式错误，未包含 data 数组');
    }

  } catch (error) {
    console.error("OCR 识别错误:", error);
    throw error;
  }
}