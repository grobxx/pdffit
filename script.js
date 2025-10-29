// Обработка ползунка качества
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');

qualitySlider.addEventListener('input', (e) => {
  const value = e.target.value;
  qualityValue.textContent = value + '% от оригинала';
  if (value <= 40) qualityValue.style.color = '#11998e';
  else if (value <= 70) qualityValue.style.color = '#f39c12';
  else qualityValue.style.color = '#3498db';
});

// Информация о файле
document.getElementById('compressFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    document.getElementById('compressFileInfo').textContent = `Выбран: ${file.name} (${sizeMB} MB)`;
    document.getElementById('compressFileInfo').style.display = 'block';
  }
});

document.getElementById('deleteFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    document.getElementById('deleteFileInfo').textContent = `Выбран: ${file.name} (${sizeMB} MB)`;
    document.getElementById('deleteFileInfo').style.display = 'block';
  }
});

// Функция обновления прогресса
function updateProgress(bar, text, percent) {
  bar.style.width = percent + '%';
  text.textContent = percent + '%';
}

// Функция анимации прогресса
async function animateProgress(bar, text, stages) {
  for (const stage of stages) {
    for (let i = 0; i <= stage.to - stage.from; i++) {
      updateProgress(bar, text, stage.from + i);
      await new Promise(r => setTimeout(r, stage.duration / (stage.to - stage.from)));
    }
  }
}

// Загрузка с прогрессом (XMLHttpRequest)
function uploadWithProgress(url, formData, onUploadProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr);
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error || xhr.statusText));
        } catch (e) {
          reject(new Error(xhr.statusText));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Ошибка сети')));
    xhr.addEventListener('timeout', () => reject(new Error('Timeout')));

    xhr.timeout = 300000; // 5 минут
    xhr.open('POST', url);
    xhr.responseType = 'blob';
    xhr.send(formData);
  });
}

// Обработка формы сжатия
document.getElementById('compressForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const file = document.getElementById('compressFile').files[0];
  const quality = qualitySlider.value;

  if (!file) {
    alert('Выберите файл');
    return;
  }

  const fileSizeMB = file.size / 1024 / 1024;
  if (fileSizeMB > 30) {
    if (!confirm(`Файл большой (${fileSizeMB.toFixed(1)} MB). Обработка займёт 2-3 минуты. Продолжить?`)) return;
  }

  formData.append('quality', quality);

  const statusDiv = document.getElementById('compressStatus');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const uploadProgress = document.getElementById('compressUploadProgress');
  const uploadBar = uploadProgress.querySelector('.upload-progress-bar');
  const uploadText = document.getElementById('compressUploadProgressText');
  const processProgress = document.getElementById('compressProgress');
  const processBar = processProgress.querySelector('.progress-bar');
  const processText = document.getElementById('compressProgressText');
  const downloadBtn = document.getElementById('compressDownload');
  const supportBtn = document.getElementById('compressSupport');

  downloadBtn.style.display = 'none';
  supportBtn.style.display = 'none';
  statusDiv.style.display = 'none';
  processProgress.style.display = 'none';

  statusDiv.className = 'status loading';
  statusDiv.textContent = 'Загрузка файла...';
  submitBtn.disabled = true;

  uploadProgress.style.display = 'block';
  uploadBar.style.width = '0%';

  try {
    const xhr = await uploadWithProgress('/compress', formData, (percent) => {
      uploadBar.style.width = percent + '%';
      uploadText.textContent = `Загрузка: ${percent}%`;
      console.log('Upload:', percent + '%');
    });

    uploadProgress.style.display = 'none';
    statusDiv.textContent = 'Обработка...';
    processProgress.style.display = 'block';
    processBar.style.width = '0%';

    const time = fileSizeMB > 40 ? 3000 : fileSizeMB > 20 ? 2000 : 1500;
    await animateProgress(processBar, processText, [{from: 0, to: 100, duration: time}]);

    const blob = xhr.response;
    const fileSize = xhr.getResponseHeader('X-File-Size');
    const originalSizeHeader = xhr.getResponseHeader('X-Original-Size');
    const originalSize = originalSizeHeader ? parseInt(originalSizeHeader) : file.size;
    const newSize = fileSize ? parseInt(fileSize) : blob.size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);

    console.log('Result:', {original: originalSize, compressed: newSize, savings: savings + '%'});

    const url = window.URL.createObjectURL(blob);

    downloadBtn.innerHTML = `⬇ Скачать (${(originalSize/1024/1024).toFixed(2)} → ${(newSize/1024/1024).toFixed(2)} MB, ${savings}%)`;
    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compressed_' + file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    downloadBtn.style.display = 'block';

    setTimeout(() => supportBtn.style.display = 'block', 300);

    processProgress.style.display = 'none';
    statusDiv.className = 'status success';
    statusDiv.textContent = parseFloat(savings) > 5 
      ? `Файл сжат! Экономия: ${savings}%`
      : `Обработан. Сжатие: ${savings}%. PDF уже был оптимизирован.`;

  } catch (error) {
    console.error('Ошибка:', error);
    uploadProgress.style.display = 'none';
    processProgress.style.display = 'none';
    statusDiv.className = 'status error';
    statusDiv.textContent = `Ошибка: ${error.message}`;
  } finally {
    submitBtn.disabled = false;
  }
});

// Обработка удаления (упрощённая версия)
document.getElementById('deleteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  alert('Функция удаления страницы работает аналогично');
});
