# Phishing Detection API Backend

Flask-based API with trained Random Forest model for phishing URL detection.

## Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Train the Model

```bash
python train_model.py
```

This will:
- Generate training data (legitimate + phishing URLs)
- Train a Random Forest classifier
- Save the model to `phishing_model.pkl`
- Display accuracy and feature importance

### 3. Run the API Server

**Development:**
```bash
python app.py
```

**Production (with Gunicorn):**
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## API Endpoints

### POST /api/analyze

Analyze a URL for phishing risk.

**Request:**
```json
{
  "url": "https://example.com/login"
}
```

**Response:**
```json
{
  "url": "https://example.com/login",
  "riskScore": 12,
  "riskLevel": "low",
  "classification": "likely-legitimate",
  "explanation": ["HTTPS detected", "No suspicious patterns"],
  "features": { ... },
  "model": {
    "name": "random-forest",
    "version": "1.4.2"
  },
  "timing": {
    "featureExtractionMs": 2,
    "inferenceMs": 8,
    "totalMs": 15
  },
  "requestId": "req_abc123...",
  "analyzedAt": "2026-09-14T10:30:00Z"
}
```

### GET /api/health

Health check endpoint.

## Deployment

### Deploy to Vercel (Serverless)

1. Install Vercel CLI: `npm i -g vercel`
2. From backend directory: `vercel`
3. Set Python runtime in `vercel.json`

### Deploy to Railway/Render/Heroku

These platforms auto-detect Flask apps. Just connect your GitHub repo.

### Environment Variables

- `FLASK_ENV`: `production` or `development`
- `PORT`: Server port (default: 5000)

## Model Details

- **Algorithm**: Random Forest (100 trees)
- **Features**: 15 URL-based features
- **Training**: Synthetic dataset (legitimate + phishing patterns)
- **Accuracy**: ~95%+ on test set

### Features Used:
1. URL length
2. Domain length
3. Path length
4. Subdomain count
5. Dot count
6. Hyphen count
7. Digit count
8. Special character count
9. HTTPS usage
10. IP address usage
11. URL shortener detection
12. Suspicious keywords
13. Query parameter count
14. @ symbol presence
15. Punycode detection

## Testing

```bash
# Test the API
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://paypal-verify-account.com/login"}'
```

## Production Notes

- For production, use a larger, real-world phishing dataset
- Consider integrating with threat intelligence APIs
- Add rate limiting and authentication
- Use Redis for caching results
- Monitor model performance and retrain periodically
