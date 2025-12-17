FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend ./backend

# Expose port
EXPOSE 7860

# Run the app
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]