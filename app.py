from flask import Flask, request, render_template, send_file, jsonify
import subprocess
import io
import os
import logging
from datetime import datetime

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def check_ghostscript():
    """Проверяет наличие Ghostscript"""
    try:
        result = subprocess.run(['gs', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            logger.info(f"✓ Ghostscript найден: {result.stdout.strip()}")
            return True
    except:
        pass

    logger.warning("✗ Ghostscript не найден. Установите: apt-get install ghostscript")
    return False


def compress_pdf_with_ghostscript(pdf_bytes, quality_percent):
    """Сжимает PDF используя Ghostscript"""

    # Параметры качества
    if quality_percent <= 30:
        dpi = 72
        image_quality = 70
        description = "Максимальное сжатие (72 DPI)"
    elif quality_percent <= 50:
        dpi = 150
        image_quality = 75
        description = "Стандартное сжатие (150 DPI)"
    elif quality_percent <= 70:
        dpi = 200
        image_quality = 85
        description = "Легкое сжатие (200 DPI)"
    else:
        dpi = 300
        image_quality = 95
        description = "Минимальное сжатие (300 DPI)"

    logger.info(f"Режим: {description}")

    # Создаем временные файлы
    input_file = '/tmp/input.pdf'
    output_file = '/tmp/output.pdf'

    try:
        # Записываем входной PDF
        with open(input_file, 'wb') as f:
            f.write(pdf_bytes)

        # Команда Ghostscript для понижения разрешения
        cmd = [
            'gs',
            '-q',                           # Тихий режим
            '-dNOPAUSE',                    # Без паузы
            '-dBATCH',                      # Batch режим
            '-sDEVICE=pdfwrite',            # Выходной формат
            f'-dDEVICEWIDTHPOINTS=612',    # Ширина (8.5")
            f'-dDEVICEHEIGHTPOINTS=792',   # Высота (11")
            f'-r{dpi}',                     # Разрешение
            f'-dImageResolution={dpi}',     # Разрешение изображений
            '-dDownsampleColorImages=true', # Понижение цветных
            '-dDownsampleGrayImages=true',  # Понижение серых
            '-dDownsampleMonoImages=true',  # Понижение черно-белых
            f'-dColorImageDownsampleType=/Bicubic',  # Интерполяция
            f'-dGrayImageDownsampleType=/Bicubic',
            f'-dMonoImageDownsampleType=/Subsample',
            f'-dColorImageResolution={dpi}',
            f'-dGrayImageResolution={dpi}',
            f'-dMonoImageResolution={dpi}',
            '-dPreserveEmbeddedFonts=true', # Сохраняем шрифты
            f'-dJPEGQ={image_quality}',     # JPEG качество
            '-dCompressFonts=true',         # Сжимаем шрифты
            '-r150x150',                    # Выходное разрешение
            f'-sOutputFile={output_file}',  # Выходной файл
            input_file                      # Входной файл
        ]

        logger.info(f"Запуск Ghostscript с {dpi} DPI...")

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

        if result.returncode != 0:
            logger.error(f"Ошибка Ghostscript: {result.stderr}")
            raise Exception(f"Ghostscript ошибка: {result.stderr}")

        # Читаем результат
        with open(output_file, 'rb') as f:
            compressed_bytes = f.read()

        logger.info(f"Ghostscript завершен успешно")

        return compressed_bytes

    except subprocess.TimeoutExpired:
        raise Exception("Ghostscript timeout (>5 минут)")
    except Exception as e:
        logger.error(f"Ошибка: {e}")
        raise
    finally:
        # Удаляем временные файлы
        for f in [input_file, output_file]:
            try:
                os.remove(f)
            except:
                pass


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/delete-page', methods=['POST'])
def delete_page():
    try:
        from PyPDF2 import PdfReader, PdfWriter

        if 'file' not in request.files:
            return jsonify({'error': 'Файл не найден'}), 400

        pdf_file = request.files['file']
        page_number = int(request.form.get('page_number', 1))

        if not pdf_file.filename or not pdf_file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Выберите PDF файл'}), 400

        logger.info(f"Удаление страницы {page_number}")

        reader = PdfReader(pdf_file)
        writer = PdfWriter()

        total_pages = len(reader.pages)

        if page_number < 1 or page_number > total_pages:
            return jsonify({'error': f'Страница 1-{total_pages}'}), 400

        for i in range(total_pages):
            if i != (page_number - 1):
                writer.add_page(reader.pages[i])

        output = io.BytesIO()
        writer.write(output)
        output.seek(0)

        file_size = output.getbuffer().nbytes
        logger.info(f"Удаление завершено: {file_size/1024/1024:.2f} MB")

        response = send_file(
            output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='deleted_' + pdf_file.filename
        )
        response.headers['X-File-Size'] = str(file_size)

        return response

    except Exception as e:
        logger.error(f"Ошибка: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/compress', methods=['POST'])
def compress_pdf():
    start_time = datetime.now()

    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Файл не найден'}), 400

        pdf_file = request.files['file']
        quality_percent = int(request.form.get('quality', 50))

        if not pdf_file.filename or not pdf_file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Выберите PDF файл'}), 400

        if not (10 <= quality_percent <= 100):
            return jsonify({'error': 'Качество: 10-100%'}), 400

        pdf_bytes = pdf_file.read()
        original_size = len(pdf_bytes)

        logger.info(f"\n{'='*70}")
        logger.info(f"Начало сжатия: {pdf_file.filename}")
        logger.info(f"Размер: {original_size/1024/1024:.2f} MB")
        logger.info(f"Качество: {quality_percent}%")
        logger.info(f"{'='*70}")

        # Проверяем Ghostscript
        if not check_ghostscript():
            logger.warning("Ghostscript не найден, используем базовое сжатие")
            from PyPDF2 import PdfReader, PdfWriter
            reader = PdfReader(io.BytesIO(pdf_bytes))
            writer = PdfWriter()
            for page in reader.pages:
                try:
                    page.compress_content_streams()
                except:
                    pass
                writer.add_page(page)
            if reader.metadata:
                writer.add_metadata(reader.metadata)

            output = io.BytesIO()
            writer.write(output)
            output.seek(0)
            compressed_bytes = output.getvalue()
        else:
            # Используем Ghostscript
            compressed_bytes = compress_pdf_with_ghostscript(pdf_bytes, quality_percent)

        file_size = len(compressed_bytes)
        compression_ratio = ((original_size - file_size) / original_size * 100) if original_size > 0 else 0
        elapsed = (datetime.now() - start_time).total_seconds()

        logger.info(f"\nРЕЗУЛЬТАТ:")
        logger.info(f"  Размер: {original_size/1024/1024:.2f} -> {file_size/1024/1024:.2f} MB")
        logger.info(f"  Сжатие: {compression_ratio:.1f}%")
        logger.info(f"  Время: {elapsed:.2f}с")
        logger.info(f"{'='*70}\n")

        output_stream = io.BytesIO(compressed_bytes)

        response = send_file(
            output_stream,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='compressed_' + pdf_file.filename
        )
        response.headers['X-File-Size'] = str(file_size)
        response.headers['X-Original-Size'] = str(original_size)

        return response

    except Exception as e:
        logger.error(f"ОШИБКА: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
