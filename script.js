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
        { from: 0, to: 30, duration: 500 },
        { from: 30, to: 70, duration: 800 }
    ];

    try {
        const progressAnimation = animateProgress(progressBar, progressText, stages);
        const responsePromise = fetch('/compress', {
            method: 'POST',
            body: formData
        });

        await progressAnimation;
        const response = await responsePromise;
        await animateProgress(progressBar, progressText, [{ from: 70, to: 100, duration: 400 }]);

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
    const progressContainer = document.getElementById('deleteProgress');
    const progressBar = progressContainer.querySelector('.progress-bar');
    const progressText = document.getElementById('deleteProgressText');
    const downloadBtn = document.getElementById('deleteDownload');
    const supportBtn = document.getElementById('deleteSupport');

    downloadBtn.style.display = 'none';
    supportBtn.style.display = 'none';
    statusDiv.style.display = 'none';

    statusDiv.className = 'status loading';
    statusDiv.textContent = 'Загрузка и обработка файла...';
    submitBtn.disabled = true;

    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    const stages = [
        { from: 0, to: 25, duration: 400 },
        { from: 25, to: 65, duration: 700 }
    ];

    try {
        const progressAnimation = animateProgress(progressBar, progressText, stages);
        const responsePromise = fetch('/delete-page', {
            method: 'POST',
            body: formData
        });

        await progressAnimation;
        const response = await responsePromise;
        await animateProgress(progressBar, progressText, [{ from: 65, to: 100, duration: 350 }]);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при удалении страницы');
        }

        const blob = await response.blob();
        const fileSize = response.headers.get('X-File-Size');
        const newSize = fileSize ? parseInt(fileSize) : blob.size;

        const url = window.URL.createObjectURL(blob);

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

        setTimeout(() => {
            supportBtn.style.display = 'block';
        }, 300);

        progressContainer.style.display = 'none';
        statusDiv.className = 'status success';
        statusDiv.textContent = `Страница ${pageNumber} успешно удалена!`;

    } catch (error) {
        console.error('Ошибка удаления:', error);
        progressContainer.style.display = 'none';
        statusDiv.className = 'status error';
        statusDiv.textContent = `Ошибка: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
    }
});
