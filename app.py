from flask import Flask, request, render_template, send_file, jsonify
from PyPDF2 import PdfReader, PdfWriter
import io

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/delete-page', methods=['POST'])
def delete_page():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Файл не найден'}), 400

        pdf_file = request.files['file']
        page_number = int(request.form.get('page_number', 1))

        if pdf_file.filename == '':
            return jsonify({'error': 'Файл не выбран'}), 400

        if not pdf_file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Файл должен быть в формате PDF'}), 400

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
        return jsonify({'error': f'Ошибка обработки: {str(e)}'}), 500

@app.route('/compress', methods=['POST'])
def compress_pdf():
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

        reader = PdfReader(pdf_file)
        writer = PdfWriter()

        for page in reader.pages:
            page.compress_content_streams()
            writer.add_page(page)

        if quality_percent < 50:
            for page in writer.pages:
                if '/Annots' in page:
                    del page['/Annots']

        if reader.metadata:
            writer.add_metadata(reader.metadata)

        output = io.BytesIO()
        writer.write(output)
        output.seek(0)

        file_size = output.getbuffer().nbytes

        response = send_file(
            output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='output_compressed.pdf'
        )
        response.headers['X-File-Size'] = str(file_size)
        response.headers['X-Quality-Percent'] = str(quality_percent)

        return response

    except ValueError:
        return jsonify({'error': 'Некорректное значение качества'}), 400
    except Exception as e:
        return jsonify({'error': f'Ошибка сжатия: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
