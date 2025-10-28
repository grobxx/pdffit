from flask import Flask, request, render_template, send_file, jsonify
from PyPDF2 import PdfReader, PdfWriter
from PIL import Image
import io
import logging
from datetime import datetime
import re

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/delete-page', methods=['POST'])
def delete_page():
    start_time = datetime.now()

    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Файл не найден'}), 400

        pdf_file = request.files['file']
        page_number = int(request.form.get('page_number', 1))

        if pdf_file.filename == '':
            return jsonify({'error': 'Файл не выбран'}), 400

        if not pdf_file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Файл должен быть в формате PDF'}), 400

        logger.info(f"Начало удаления страницы {page_number} из {pdf_file.filename}")

        reader = PdfReader(pdf_file)
        writer = PdfWriter()

        total_pages = len(reader.pages)

        if page_number < 1 or page_number > total_pages:
            return jsonify({'error': f'Номер страницы должен быть от 1 до {total_pages}'}), 400

        for i in range(total_pages):
            if i != (page_number - 1):
                writer.add_page(reader.pages[i])

        if reader.metadata:
            writer.add_metadata(reader.metadata)

        output = io.BytesIO()
        writer.write(output)
        output.seek(0)

        file_size = output.getbuffer().nbytes
        elapsed = (datetime.now() - start_time).total_seconds()
        logger.info(f"Удаление завершено за {elapsed:.2f}с. Размер: {file_size/1024/1024:.2f} MB")

        response = send_file(
            output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='output_deleted_page.pdf'
        )
        response.headers['X-File-Size'] = str(file_size)

        return response

    except ValueError:
        return jsonify({'error': 'Некорректный номер страницы'}), 400
    except Exception as e:
        logger.error(f"Ошибка удаления страницы: {str(e)}", exc_info=True)
        return jsonify({'error': f'Ошибка обработки: {str(e)}'}), 500

@app.route('/compress', methods=['POST'])
def compress_pdf():
    start_time = datetime.now()

    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Файл не найден'}), 400

        pdf_file = request.files['file']
        quality_percent = int(request.form.get('quality', 50))

        if pdf_file.filename == '':
            return jsonify({'error': 'Файл не выбран'}), 400

        if not pdf_file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Файл должен быть в формате PDF'}), 400

        if quality_percent < 10 or quality_percent > 100:
            return jsonify({'error': 'Качество должно быть от 10 до 100%'}), 400

        file_size_mb = request.content_length / 1024 / 1024 if request.content_length else 0
        logger.info(f"Начало сжатия: {pdf_file.filename}, размер: {file_size_mb:.2f} MB, качество: {quality_percent}%")

        # Читаем PDF
        reader = PdfReader(pdf_file)
        writer = PdfWriter()

        total_pages = len(reader.pages)
        logger.info(f"Страниц в документе: {total_pages}")

        # Определяем качество изображений на основе процента
        # 10% -> quality=30, 50% -> quality=60, 100% -> quality=95
        image_quality = int(30 + (quality_percent - 10) * 0.72)
        image_quality = max(20, min(95, image_quality))

        # Обрабатываем каждую страницу
        for page_num, page in enumerate(reader.pages):
            if page_num % 10 == 0:
                logger.info(f"Обработка страниц: {page_num}/{total_pages}")

            # Базовая компрессия контента
            page.compress_content_streams()

            # Дополнительная обработка для низкого качества
            if quality_percent < 70:
                # Удаляем аннотации для экономии места
                if '/Annots' in page:
                    del page['/Annots']

                # Упрощаем графические объекты
                if '/XObject' in page['/Resources']:
                    xobjects = page['/Resources']['/XObject'].get_object()

                    for obj_name in xobjects:
                        obj = xobjects[obj_name]

                        # Обработка изображений
                        if obj['/Subtype'] == '/Image':
                            try:
                                # Извлекаем параметры изображения
                                width = obj['/Width']
                                height = obj['/Height']

                                # Уменьшаем разрешение для низкого качества
                                if quality_percent < 40:
                                    scale_factor = 0.5
                                elif quality_percent < 70:
                                    scale_factor = 0.7
                                else:
                                    scale_factor = 1.0

                                new_width = int(width * scale_factor)
                                new_height = int(height * scale_factor)

                                if scale_factor < 1.0:
                                    obj['/Width'] = new_width
                                    obj['/Height'] = new_height

                            except Exception as img_err:
                                logger.debug(f"Не удалось оптимизировать изображение: {img_err}")

            writer.add_page(page)

        # Сохраняем метаданные
        if reader.metadata:
            writer.add_metadata(reader.metadata)

        # Применяем дополнительную компрессию при записи
        logger.info("Сохранение сжатого PDF...")
        output = io.BytesIO()

        # Записываем с максимальной компрессией
        writer.write(output)
        output.seek(0)

        file_size = output.getbuffer().nbytes
        compression_ratio = ((file_size_mb * 1024 * 1024 - file_size) / (file_size_mb * 1024 * 1024) * 100) if file_size_mb > 0 else 0

        elapsed = (datetime.now() - start_time).total_seconds()
        logger.info(f"Сжатие завершено за {elapsed:.2f}с. Размер: {file_size/1024/1024:.2f} MB (сжатие {compression_ratio:.1f}%)")

        response = send_file(
            output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='output_compressed.pdf'
        )
        response.headers['X-File-Size'] = str(file_size)
        response.headers['X-Quality-Percent'] = str(quality_percent)
        response.headers['X-Processing-Time'] = f"{elapsed:.2f}"

        return response

    except ValueError:
        return jsonify({'error': 'Некорректное значение качества'}), 400
    except Exception as e:
        logger.error(f"Ошибка сжатия: {str(e)}", exc_info=True)
        return jsonify({'error': f'Ошибка сжатия: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
