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

// Функция для обновления прогресса
function updateProgress(progressBar, progressText, percent) {
    progressBar.style.width = percent + '%';
    progressText.textContent = percent + '%';
}

// Функция симуляции прогресса
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

    formData.append('quality', quality);

    const statusDiv = document.getElementById('compressStatus');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const progressContainer = document.getElementById('compressProgress');
    const progressBar = progressContainer.querySelector('.progress-bar');
    const progressText = document.getElementById('compressProgressText');
    const downloadBtn = document.getElementById('compressDownload');
    const supportBtn = document.getElementById('compressSupport');

    downloadBtn.style.display = 'none';
    supportBtn.style.display = 'none';
    statusDiv.style.display = 'none';

    statusDiv.className = 'status loading';
    statusDiv.textContent = 'Загрузка и обработка файла...';
    submitBtn.disabled = true;

    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    const stages = [
        { from: 0, to: 20, duration: 1000 },  // Медленнее для больших файлов
        { from: 20, to: 60, duration: 2000 }  // Даем больше времени на обработку
    ];

    try {
        const progressAnimation = animateProgress(progressBar, progressText, stages);
        const responsePromise = fetch('/compress', {
            method: 'POST',
            body: formData
        });

        await progressAnimation;
        const response = await responsePromise;
        await animateProgress(progressBar, progressText, [{ from: 60, to: 100, duration: 1000 }]);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при сжатии файла');
        }

        const blob = await response.blob();
        const fileSize = response.headers.get('X-File-Size');
        const originalSize = file.size;
        const newSize = fileSize ? parseInt(fileSize) : blob.size;
        const savings = ((originalSize - newSize) / originalSize * 100).toFixed(0);

        const url = window.URL.createObjectURL(blob);

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

        setTimeout(() => {
            supportBtn.style.display = 'block';
        }, 300);

        progressContainer.style.display = 'none';
        statusDiv.className = 'status success';
        statusDiv.textContent = `Файл успешно сжат до ${quality}% от оригинала!`;

    } catch (error) {
        console.error('Ошибка сжатия:', error);
        progressContainer.style.display = 'none';
        statusDiv.className = 'status error';
        statusDiv.textContent = `Ошибка: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
    }
});

// Обработка формы удаления
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
    const progressContainer = document.getElementById('compressProgress');
    const progressBar = progressContainer.querySelector('.progress-bar');
    const progressText = document.getElementById('compressProgressText');
    const downloadBtn = document.getElementById('compressDownload');
    const supportBtn = document.getElementById('compressSupport');

    downloadBtn.style.display = 'none';
    supportBtn.style.display = 'none';
    statusDiv.style.display = 'none';

    statusDiv.className = 'status loading';
    statusDiv.textContent = 'Загрузка и обработка файла... Это может занять несколько минут.';
    submitBtn.disabled = true;

    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    // УВЕЛИЧЕННАЯ ДЛИТЕЛЬНОСТЬ для больших файлов
    const stages = [
        { from: 0, to: 20, duration: 1000 },
        { from: 20, to: 60, duration: 2000 }
    ];

    try {
        const progressAnimation = animateProgress(progressBar, progressText, stages);

        // Отправляем запрос (без timeout в fetch)
        const responsePromise = fetch('/compress', {
            method: 'POST',
            body: formData
        });

        await progressAnimation;

        // Обновляем статус во время ожидания
        statusDiv.textContent = 'Обработка файла на сервере... Пожалуйста, подождите.';

        const response = await responsePromise;
        await animateProgress(progressBar, progressText, [{ from: 60, to: 100, duration: 1000 }]);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при сжатии файла');
        }

        const blob = await response.blob();
        const fileSize = response.headers.get('X-File-Size');
        const originalSize = file.size;
        const newSize = fileSize ? parseInt(fileSize) : blob.size;
        const savings = ((originalSize - newSize) / originalSize * 100).toFixed(0);

        const url = window.URL.createObjectURL(blob);

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

        setTimeout(() => {
            supportBtn.style.display = 'block';
        }, 300);

        progressContainer.style.display = 'none';
        statusDiv.className = 'status success';
        statusDiv.textContent = `Файл успешно сжат до ${quality}% от оригинала!`;

    } catch (error) {
        console.error('Ошибка сжатия:', error);
        progressContainer.style.display = 'none';
        statusDiv.className = 'status error';
        statusDiv.textContent = `Ошибка: ${error.message}. Попробуйте файл меньшего размера или увеличьте % качества.`;
    } finally {
        submitBtn.disabled = false;
    }
});
