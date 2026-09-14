"""
Flask API for Phishing URL Classification
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import time
from datetime import datetime
from urllib.parse import urlparse
import string
import random

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Load trained model
try:
    model_data = joblib.load('phishing_model.pkl')
    model = model_data['model']
    feature_columns = model_data['feature_columns']
    print(f"✅ Model loaded successfully (v{model_data['version']})")
    print(f"   Trained: {model_data['trained_at']}")
    print(f"   Accuracy: {model_data['accuracy']:.2%}")
except Exception as e:
    print(f"⚠️  Warning: Could not load model - {e}")
    print("   Run 'python train_model.py' first to train the model")
    model = None
    feature_columns = []

def extract_features(url):
    """Extract features from URL (matches training function)"""
    try:
        parsed = urlparse(url)
    except:
        return None
    
    hostname = parsed.hostname or parsed.netloc or ''
    path = parsed.path + (parsed.query or '')
    
    # Suspicious keywords
    suspicious_keywords = [
        'login', 'verify', 'secure', 'account', 'update', 'confirm',
        'signin', 'wallet', 'bank', 'authenticate', 'unlock', 'recover',
        'password', 'webscr', 'billing', 'invoice', 'gift', 'bonus'
    ]
    
    # URL shorteners
    shorteners = {
        'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd',
        'buff.ly', 'cutt.ly', 'rebrand.ly', 'shorturl.at'
    }
    
    url_lower = url.lower()
    hostname_lower = hostname.lower()
    
    # Extract keywords found
    keywords_found = [kw for kw in suspicious_keywords if kw in url_lower]
    
    features = {
        'url_length': len(url),
        'domain_length': len(hostname),
        'path_length': len(path),
        'subdomain_count': max(0, len(hostname.split('.')) - 2),
        'dot_count': url.count('.'),
        'hyphen_count': hostname.count('-'),
        'digit_count': sum(c.isdigit() for c in hostname),
        'special_char_count': sum(c in '@!$&\'()*+,;=%?' for c in url),
        'uses_https': 1 if parsed.scheme == 'https' else 0,
        'uses_ip': 1 if hostname.replace('.', '').replace(':', '').isdigit() else 0,
        'is_shortener': 1 if hostname_lower in shorteners else 0,
        'suspicious_keyword_count': len(keywords_found),
        'query_param_count': len(parsed.query.split('&')) if parsed.query else 0,
        'has_at_symbol': 1 if '@' in url else 0,
        'has_punycode': 1 if 'xn--' in hostname_lower else 0,
    }
    
    return features, keywords_found

def get_contributing_features(features, probabilities):
    """Identify which features contributed most to the classification"""
    contributing = []
    
    # High risk indicators
    if features.get('uses_ip'):
        contributing.append("IP address used instead of a conventional domain")
    if not features.get('uses_https'):
        contributing.append("HTTPS not detected")
    if features.get('is_shortener'):
        contributing.append("URL shortener domain")
    if features.get('has_at_symbol'):
        contributing.append("\"@\" symbol embedded in URL")
    if features.get('has_punycode'):
        contributing.append("Internationalized (punycode) domain")
    if features.get('subdomain_count', 0) >= 3:
        contributing.append("Multiple subdomains detected")
    elif features.get('subdomain_count', 0) == 2:
        contributing.append("Two subdomain levels")
    if features.get('hyphen_count', 0) >= 3:
        contributing.append("Frequent hyphen usage in domain")
    if features.get('url_length', 0) > 75:
        contributing.append("Unusually long URL")
    if features.get('suspicious_keyword_count', 0) >= 2:
        contributing.append(f"Suspicious keyword pattern detected")
    elif features.get('suspicious_keyword_count', 0) == 1:
        contributing.append("Suspicious keyword present")
    if features.get('special_char_count', 0) >= 10:
        contributing.append("High number of special characters")
    if features.get('digit_count', 0) >= 5 and not features.get('uses_ip'):
        contributing.append("Numeric-heavy domain")
    if features.get('query_param_count', 0) >= 5:
        contributing.append("Many query parameters")
    
    if not contributing:
        contributing.append("No suspicious URL patterns detected")
    
    return contributing[:6]  # Return top 6

def generate_request_id():
    """Generate unique request ID"""
    chars = string.ascii_lowercase + string.digits
    return 'req_' + ''.join(random.choices(chars, k=12))

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Main endpoint for URL analysis"""
    start_time = time.time()
    
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Validate URL
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return jsonify({'error': 'Invalid URL format'}), 400
        except:
            return jsonify({'error': 'Invalid URL format'}), 400
        
        # Extract features
        t_extract_start = time.time()
        features_dict, keywords_found = extract_features(url)
        if features_dict is None:
            return jsonify({'error': 'Could not parse URL'}), 400
        
        feature_extraction_ms = int((time.time() - t_extract_start) * 1000)
        
        # Predict using model
        t_infer_start = time.time()
        
        if model is None:
            return jsonify({'error': 'Model not loaded. Run train_model.py first.'}), 503
        
        # Prepare feature vector
        feature_vector = [[features_dict[col] for col in feature_columns]]
        
        # Get prediction and probability
        prediction = model.predict(feature_vector)[0]
        probabilities = model.predict_proba(feature_vector)[0]
        
        # Convert probability to risk score (0-100)
        phishing_probability = probabilities[1]  # Probability of phishing class
        risk_score = int(phishing_probability * 100)
        
        inference_ms = int((time.time() - t_infer_start) * 1000)
        
        # Determine risk level
        if risk_score >= 80:
            risk_level = 'phishing'
            classification = 'phishing'
        elif risk_score >= 60:
            risk_level = 'high'
            classification = 'likely-phishing'
        elif risk_score >= 40:
            risk_level = 'suspicious'
            classification = 'suspicious'
        elif risk_score >= 20:
            risk_level = 'low'
            classification = 'likely-legitimate'
        else:
            risk_level = 'safe'
            classification = 'legitimate'
        
        # Get explanation
        contributing = get_contributing_features(features_dict, probabilities)
        
        # Prepare response
        total_ms = int((time.time() - start_time) * 1000)
        
        response = {
            'url': url,
            'riskScore': risk_score,
            'riskLevel': risk_level,
            'classification': classification,
            'explanation': contributing,
            'contributingFeatures': [],  # Will be populated by frontend
            'features': {
                'urlLength': features_dict['url_length'],
                'domainLength': features_dict['domain_length'],
                'pathLength': features_dict['path_length'],
                'subdomainCount': features_dict['subdomain_count'],
                'dotCount': features_dict['dot_count'],
                'hyphenCount': features_dict['hyphen_count'],
                'digitCount': features_dict['digit_count'],
                'specialCharacterCount': features_dict['special_char_count'],
                'usesHttps': bool(features_dict['uses_https']),
                'usesIpAddress': bool(features_dict['uses_ip']),
                'isShortener': bool(features_dict['is_shortener']),
                'suspiciousKeywordCount': features_dict['suspicious_keyword_count'],
                'suspiciousKeywords': keywords_found,
                'queryParamCount': features_dict['query_param_count'],
                'hasAtSymbol': bool(features_dict['has_at_symbol']),
                'hasPunycode': bool(features_dict['has_punycode']),
            },
            'model': {
                'name': 'random-forest',
                'version': model_data.get('version', '1.4.2')
            },
            'timing': {
                'featureExtractionMs': feature_extraction_ms,
                'inferenceMs': inference_ms,
                'totalMs': total_ms
            },
            'requestId': generate_request_id(),
            'analyzedAt': datetime.utcnow().isoformat() + 'Z'
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'operational',
        'model_loaded': model is not None,
        'version': model_data.get('version', 'unknown') if model else 'unknown',
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }), 200

@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        'service': 'Phishing URL Classification API',
        'version': '1.0.0',
        'endpoints': {
            'analyze': 'POST /api/analyze',
            'health': 'GET /api/health'
        }
    }), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
