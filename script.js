// Обработка ползунка качества
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');

qualitySlider.addEventListener('input', (e) => {
    const value = e.target.value;
    qualityValue.textContent = value + '% от оригинала';

    if (value <= 40) {
        qualityValue.style.color = '#11998e';
    } else if (value <= 70) {
        qualityValue.style.color = '#f39c12';
    } else {
        qualityValue.style.color = '#3498db';
    }
});

// Показ информации о выбранном файле
document.getElementById('compressFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        document.getElementById('compressFileInfo').textContent = 
            `Выбран: ${file.name} (${sizeMB} MB)`;
        document.getElementById('compressFileInfo').style.display = 'block';
    }
});

document.getElementById('deleteFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        document.getElementById('deleteFileInfo').textContent = 
            `Выбран: ${file.name} (${sizeMB} MB)`;
        document.getElementById('deleteFileInfo').style.display = 'block';
    }
});

// Функция обновления прогресса
function updateProgress(progressBar, progressText, percent) {
    progressBar.style.width = percent + '%';
    progressText.textContent = percent + '%';
}

// Функция анимации прогресса
async function animateProgress(progressBar, progressText, stages) {
    for (const stage of stages) {
        const start = stage.from;
        const end = stage.to;
        const duration = stage.duration;
        const steps = end - start;

        for (let i = 0; i <= steps; i++) {
            const currentPercent = start + i;
            updateProgress(progressBar, progressText, currentPercent);
            await new Promise(resolve => setTimeout(resolve, duration / steps));
        }
    }
}

// Функция отправки с прогресс-баром загрузки (XMLHttpRequest)
function uploadWithProgress(url, formData, onUploadProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Отслеживание прогресса загрузки
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                onUploadProgress(percentComplete);
            }
        });

        // Обработка завершения
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr);
            } else {
                reject(new Error(xhr.statusText || 'Ошибка сервера'));
            }
        });

        // Обработка ошибок
        xhr.addEventListener('error', () => reject(new Error('Ошибка сети')));
        xhr.addEventListener('abort', () => reject(new Error('Загрузка отменена')));

        // Отправка запроса
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
        alert('Пожалуйста, выберите файл');
        return;
    }

    // Предупреждение для больших файлов
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > 30) {
        const proceed = confirm(`Файл большой (${fileSizeMB.toFixed(1)} MB). Обработка может занять до 2-3 минут. Продолжить?`);
        if (!proceed) return;
    }

    formData.append('quality', quality);

    const statusDiv = document.getElementById('compressStatus');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const uploadProgressContainer = document.getElementById('compressUploadProgress');
    const uploadProgressBar = uploadProgressContainer.querySelector('.upload-progress-bar');
    const uploadProgressText = document.getElementById('compressUploadProgressText');
    const progressContainer = document.getElementById('compressProgress');
    const progressBar = progressContainer.querySelector('.progress-bar');
    const progressText = document.getElementById('compressProgressText');
    const downloadBtn = document.getElementById('compressDownload');
    const supportBtn = document.getElementById('compressSupport');

    // Скрываем предыдущие результаты
    downloadBtn.style.display = 'none';
    supportBtn.style.display = 'none';
    statusDiv.style.display = 'none';
    progressContainer.style.display = 'none';

    // Показываем статус
    statusDiv.className = 'status loading';
    statusDiv.textContent = 'Загрузка файла на сервер...';
    submitBtn.disabled = true;

    // Показываем прогресс загрузки
    uploadProgressContainer.style.display = 'block';
    uploadProgressBar.style.width = '0%';

    try {
        // Загружаем файл с отслеживанием прогресса
        const xhr = await uploadWithProgress('/compress', formData, (percent) => {
            uploadProgressBar.style.width = percent + '%';
            uploadProgressText.textContent = `Загрузка: ${percent}%`;
        });

        // Скрываем прогресс загрузки
        uploadProgressContainer.style.display = 'none';

        // Показываем прогресс обработки
        statusDiv.textContent = 'Обработка файла на сервере... Это может занять несколько минут.';
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';

        // Анимируем прогресс обработки
        const processingTime = fileSizeMB > 40 ? 3000 : fileSizeMB > 20 ? 2000 : 1500;
        await animateProgress(progressBar, progressText, [
            { from: 0, to: 100, duration: processingTime }
        ]);

        // Получаем blob
        const blob = xhr.response;
        const fileSize = xhr.getResponseHeader('X-File-Size');
        const originalSize = file.size;
        const newSize = fileSize ? parseInt(fileSize) : blob.size;
        const savings = ((originalSize - newSize) / originalSize * 100).toFixed(0);

        // Создаем URL для скачивания
        const url = window.URL.createObjectURL(blob);

        // Настраиваем кнопку скачивания
        downloadBtn.innerHTML = `⬇ Скачать (${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(newSize / 1024 / 1024).toFixed(2)} MB, экономия ${savings}%)`;
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'compressed_' + file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        downloadBtn.style.display = 'block';

        // Показываем кнопку поддержки
        setTimeout(() => {
            supportBtn.style.display = 'block';
        }, 300);

        // Скрываем прогресс
        progressContainer.style.display = 'none';

        // Показываем успех
        statusDiv.className = 'status success';
        statusDiv.textContent = `Файл успешно сжат! Экономия места: ${savings}%`;

    } catch (error) {
        console.error('Ошибка сжатия:', error);
        uploadProgressContainer.style.display = 'none';
        progressContainer.style.display = 'none';
        statusDiv.className = 'status error';
        statusDiv.textContent = `Ошибка: ${error.message}. Попробуйте файл меньшего размера.`;
    } finally {
        submitBtn.disabled = false;
    }
});

// Обработка формы удаления
document.getElementById('deleteForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const file = document.getElementById('deleteFile').files[0];
    const pageNumber = document.getElementById('pageNumber').value;

    if (!file) {
        alert('Пожалуйста, выберите файл');
        return;
    }

    if (!pageNumber || pageNumber < 1) {
        alert('Пожалуйста, укажите корректный номер страницы');
        return;
    }

    const statusDiv = document.getElementById('deleteStatus');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const uploadProgressContainer = document.getElementById('deleteUploadProgress');
    const uploadProgressBar = uploadProgressContainer.querySelector('.upload-progress-bar');
    const uploadProgressText = document.getElementById('deleteUploadProgressText');
    const progressContainer = document.getElementById('deleteProgress');
    const progressBar = progressContainer.querySelector('.progress-bar');
    const progressText = document.getElementById('deleteProgressText');
    const downloadBtn = document.getElementById('deleteDownload');
    const supportBtn = document.getElementById('deleteSupport');

    // Скрываем предыдущие результаты
    downloadBtn.style.display = 'none';
    supportBtn.style.display = 'none';
    statusDiv.style.display = 'none';
    progressContainer.style.display = 'none';

    // Показываем статус
    statusDiv.className = 'status loading';
    statusDiv.textContent = 'Загрузка файла на сервер...';
    submitBtn.disabled = true;

    // Показываем прогресс загрузки
    uploadProgressContainer.style.display = 'block';
    uploadProgressBar.style.width = '0%';

    try {
        // Загружаем файл с отслеживанием прогресса
        const xhr = await uploadWithProgress('/delete-page', formData, (percent) => {
            uploadProgressBar.style.width = percent + '%';
            uploadProgressText.textContent = `Загрузка: ${percent}%`;
        });

        // Скрываем прогресс загрузки
        uploadProgressContainer.style.display = 'none';

        // Показываем прогресс обработки
        statusDiv.textContent = 'Удаление страницы...';
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';

        // Анимируем прогресс обработки
        await animateProgress(progressBar, progressText, [
            { from: 0, to: 100, duration: 1000 }
        ]);

        // Получаем blob
        const blob = xhr.response;
        const fileSize = xhr.getResponseHeader('X-File-Size');
        const newSize = fileSize ? parseInt(fileSize) : blob.size;

        // Создаем URL для скачивания
        const url = window.URL.createObjectURL(blob);

        // Настраиваем кнопку скачивания
        downloadBtn.innerHTML = `⬇ Скачать результат (${(newSize / 1024 / 1024).toFixed(2)} MB)`;
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'deleted_page_' + file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        downloadBtn.style.display = 'block';

        // Показываем кнопку поддержки
        setTimeout(() => {
            supportBtn.style.display = 'block';
        }, 300);

        // Скрываем прогресс
        progressContainer.style.display = 'none';

        // Показываем успех
        statusDiv.className = 'status success';
        statusDiv.textContent = `Страница ${pageNumber} успешно удалена!`;

    } catch (error) {
        console.error('Ошибка удаления:', error);
        uploadProgressContainer.style.display = 'none';
        progressContainer.style.display = 'none';
        statusDiv.className = 'status error';
        statusDiv.textContent = `Ошибка: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
    }
});
